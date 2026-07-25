---
title: Remote thread created in msedge.exe by a non-Edge process
date: 2026-07-07
updated: 2026-07-08
summary: >-
  The behavioural rule that caught BugSleep 18 times in a live detonation. It keys on the
  injection technique, not the sample, so it survives the crew rotating C2s or recompiling.
format: sigma
surface: endpoint
maturity: lab-validated
severity: high
actor: muddywater
research: [catching-muddywater-live, bugsleep-unmasked]
tags: [muddywater, bugsleep, sigma, process-injection, splunk]
telemetry:
  - Sysmon Event ID 8 (CreateRemoteThread) with SourceImage and TargetImage
attack:
  - { id: 'T1055', name: 'Process Injection' }
  - { id: 'T1055.003', name: 'Thread Execution Hijacking' }
falsePositives:
  - Some security and EDR products inject into browsers legitimately. Baseline your estate and allow-list those SourceImages — do not weaken the rule.
  - Browser self-injection is excluded by the filter, so Edge's own multi-process behaviour does not fire it.
---

This is the most useful rule I've written, and it's also the simplest. BugSleep hides its C2 traffic
by injecting into `msedge.exe` so the beacon looks like browsing. The rule doesn't care about
BugSleep at all — it cares that *something which isn't Edge* created a thread inside Edge.

That framing is why it survives. Rotate the C2, recompile the payload, change the mutex name: the
technique stays, and so does the detection.

## The rule

```yaml
title: Remote Thread Created in msedge.exe by Non-Edge Process (BugSleep-style injection)
id: a6f43b27-f606-49e1-b628-b6663dad5481
status: experimental
description: >
    BugSleep injects its payload into msedge.exe to hide C2 in normal browser traffic.
    A CreateRemoteThread (Sysmon EID 8) targeting msedge.exe from any process that is
    NOT itself Edge is highly abnormal. This is behavioral - it catches the injection
    technique regardless of the specific sample or C2, so it survives variant drift.
references:
    - https://github.com/anas-sec9/threat-intel-reports/tree/main/reports/muddywater_bugsleep
author: Anas
date: 2026-07-07
tags:
    - attack.defense-evasion
    - attack.privilege-escalation
    - attack.t1055
    - attack.t1055.003
logsource:
    product: windows
    category: create_remote_thread
detection:
    selection:
        TargetImage|endswith: '\msedge.exe'
    filter_edge:
        SourceImage|endswith: '\msedge.exe'
    condition: selection and not filter_edge
falsepositives:
    - Some security/EDR products inject into browsers; baseline and allow-list those SourceImages.
level: high
```

## Live-fire result

Detonated the real sample on an instrumented Windows 10 host with Sysmon forwarding to Splunk. The
rule fired **18 times** in the first two minutes — BugSleep injects into several Edge child
processes, so one execution produces a burst rather than a single event. The full run is written up
in [Catching MuddyWater Live](/research/catching-muddywater-live).

Worth noting what else happened in that same run: the commercial EDR on the same host **collected**
this injection and tagged it `MITRE.T1055` in raw telemetry, but did not raise an alert on it in
behavioural-only mode. This rule did. That's the argument for writing your own, in one data point.

## Generalising it

`msedge.exe` is BugSleep's choice. The sample's own hit-list was broader:

```
msedge.exe  opera.exe  chrome.exe  anydesk.exe  Onedrive.exe  svchost.exe  powershell.exe
```

If you want coverage of the technique rather than this family, widen `TargetImage` to that list and
keep the same self-injection filter per target. Expect more tuning — `svchost.exe` in particular is
a busy target — but browsers and AnyDesk are usually quiet enough to alert on directly.
