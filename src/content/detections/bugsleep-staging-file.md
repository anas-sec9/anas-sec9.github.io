---
title: BugSleep staging file — a.txt in the Public profile
date: 2026-07-07
updated: 2026-07-08
summary: >-
  BugSleep passes C2 commands and output through C:\Users\Public\a.txt. Low severity alone,
  high when it lands in the same window as the injection or the beacon.
format: sigma
surface: endpoint
maturity: lab-validated
severity: medium
actor: muddywater
research: [catching-muddywater-live, bugsleep-unmasked]
tags: [muddywater, bugsleep, sigma, data-staging, sysmon]
telemetry:
  - Sysmon Event ID 11 (FileCreate) covering C:\Users\Public — many default configs exclude it
attack:
  - { id: 'T1074.001', name: 'Local Data Staging' }
falsePositives:
  - Some tools drop scratch files directly in the Public profile root. Validate the writing process rather than the filename.
  - A single-letter filename is unusual but not unique to malware.
---

BugSleep reads and writes its C2 command data through `C:\Users\Public\a.txt`. The Public profile is
a well-worn staging directory precisely because it's world-writable and rarely monitored.

I've rated this medium on purpose. On its own, a file appearing in `C:\Users\Public` is weak — it
happens legitimately. Correlated with
[the msedge injection](/detections/bugsleep-msedge-remote-thread) or
[the C2 beacon](/detections/bugsleep-c2-suricata) inside the same few minutes on the same host, it's
confirmation rather than a lead.

## The rule

```yaml
title: BugSleep C2 Staging File in Public Folder (a.txt)
id: 34c1d84f-123a-4171-9e2a-a6adb0c4a259
status: experimental
description: >
    BugSleep reads/writes C2 command data through C:\Users\Public\a.txt. Creation of
    a.txt directly under the Public profile root is unusual and, combined with the
    other signals, indicates BugSleep activity. Medium on its own; high when correlated
    with the injection or C2 rules.
references:
    - https://github.com/anas-sec9/threat-intel-reports/tree/main/reports/muddywater_bugsleep
author: Anas
date: 2026-07-07
tags:
    - attack.command-and-control
    - attack.collection
    - attack.t1074.001
logsource:
    category: file_event
    product: windows
detection:
    selection:
        TargetFilename|endswith: '\Users\Public\a.txt'
    condition: selection
falsepositives:
    - Rare. Some tools drop scratch files in Public; validate the writing process.
level: medium
```

## Check your Sysmon config first

This rule stayed silent during my live detonation even though `a.txt` was sitting on disk — the
SwiftOnSecurity Sysmon config I was running wasn't logging file creation under `C:\Users\Public` at
all. Adding the path and reloading fixed it, and the alert validated on the next run.

Same failure mode as
[the persistence rule](/detections/bugsleep-packagemanager-persistence), and worth repeating: an
endpoint file rule is only as good as the `FileCreate` coverage underneath it. Confirm the path is
in scope before you trust the rule.

## The broader version

Rather than one filename, watch for **any file created directly in the `C:\Users\Public` root** —
not in its subdirectories, which see normal use — and correlate with whether that file is
subsequently read by a process that didn't create it. That's the shape of file-based C2 tasking in
general, and it catches the next implant rather than this one.

Volume depends heavily on the estate, so measure before alerting.
