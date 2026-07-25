---
title: Regsvr32 COM scriptlet execution (Squiblydoo)
date: 2026-07-06
summary: >-
  Catches regsvr32 proxying script execution through scrobj.dll. Keying on the Script
  Component runtime rather than on regsvr32 itself is what takes this from 6 alerts to 1.
format: sigma
surface: endpoint
maturity: lab-validated
severity: high
tags: [lolbin, defense-evasion, sigma, splunk, atomic-red-team]
telemetry:
  - Sysmon Event ID 1 (process creation) with CommandLine and OriginalFileName populated
  - Optionally Sysmon Event ID 7 (image load) for the evasion-resistant variant
attack:
  - { id: 'T1218.010', name: 'System Binary Proxy Execution: Regsvr32' }
falsePositives:
  - Enterprise software installers that register a genuine Script Component. Rare, and measurable — I saw zero across a benign baseline, but that baseline was light.
---

`regsvr32.exe` is signed by Microsoft and waved through most allow-lists. Point it at a COM
scriptlet via `scrobj.dll` and it becomes a script host running under a trusted binary. That's
Squiblydoo, and it's used by APT19, Cobalt Group and Deep Panda, plus commodity loaders like
Astaroth's.

The interesting part of this rule isn't the technique — it's the discriminator.

## The hypothesis

regsvr32 runs constantly for legitimate DLL registration, so "regsvr32 executed" is not a detection.
The tell is regsvr32 pulling in the Script Component runtime, which normal registration never needs.

## The rule

```yaml
title: Regsvr32 COM Scriptlet Execution (Squiblydoo)
id: 7f3b9c14-2e6a-4d51-b8a2-9c0f1a2b3c4d
status: experimental
description: >
  Detects regsvr32.exe proxying execution of a COM scriptlet through scrobj.dll
  ("Squiblydoo"). regsvr32 is a signed Microsoft binary, so this runs script code
  under a trusted, allow-listed process.
references:
  - https://attack.mitre.org/techniques/T1218/010/
  - https://lolbas-project.github.io/lolbas/Binaries/Regsvr32/
author: Anas
date: 2026-07-06
tags:
  - attack.defense-evasion
  - attack.t1218.010
logsource:
  category: process_creation
  product: windows
detection:
  selection_img:
    - Image|endswith: '\regsvr32.exe'
    - OriginalFileName: 'REGSVR32.EXE'   # catches a renamed regsvr32 binary
  selection_scriptlet:
    CommandLine|contains: 'scrobj.dll'
  condition: selection_img and selection_scriptlet
falsepositives:
  - Enterprise software installers that register a Script Component (rare)
level: high
```

## Evidence it fired

Emulated with Atomic Red Team tests 1 and 2, on the lab victim host:

```
Invoke-AtomicTest T1218.010 -TestNumbers 1,2 -GetPrereqs
Invoke-AtomicTest T1218.010 -TestNumbers 1,2
```

The resulting Sysmon event:

| field | value |
| --- | --- |
| process_name | `regsvr32.exe` |
| command line | `C:\Windows\system32\regsvr32.exe /s /u /i:"C:\AtomicRedTeam\atomics\T1218.010\src\RegSvr32.sct" scrobj.dll` |
| parent | `cmd.exe` |
| user | `Victim` |

Defender blocked the scriptlet payload, but the process-creation event fired anyway — which is the
point. The detection works on the invocation, not on whether the payload detonates.

## False positives, measured

I ran a benign baseline on the same host: legitimate regsvr32 activity registering and unregistering
real system DLLs (`mshtml.dll`, `dxtrans.dll`) the normal way, which is exactly what installers do.
Five benign executions landed in the window.

| what fired | count |
| --- | --- |
| benign regsvr32 (real DLL registration) | 5 |
| this rule (`scrobj.dll` present) | 1 — the attack, nothing else |

A lazy "alert on regsvr32.exe" rule would have fired six times and buried the one real hit under
five false positives. Keying on `scrobj.dll` flagged the attack and only the attack.

Honest caveat: that's a light baseline — a handful of benign events on one host over a short window.
A real environment has far more regsvr32 traffic and I'd want days of data across many endpoints
before trusting that zero in production. The invariant is sound; the sample size isn't yet.

## What beats it

**A renamed binary.** Copy `regsvr32.exe` to `svc.exe` and the `Image|endswith` clause misses. That's
why the rule also keys on Sysmon's `OriginalFileName` field, which survives a rename — check your
Sysmon config actually populates it.

**Command-line obfuscation.** The arguments can be mangled, though `scrobj.dll` is hard to hide if
the scriptlet is going to run at all. The more evasion-resistant version watches for the
`scrobj.dll` **image load** (Sysmon EID 7) instead of parsing the command line; it fires regardless
of how the arguments are dressed up, and is worth deploying alongside this one.

**A different regsvr32 abuse entirely.** Atomic test 4 (Gozi behaviour) registers a DLL with a fake
extension and never touches `scrobj.dll`, so it slips straight past this rule. That's a sibling
technique needing its own detection — noting it so the gap is explicit rather than implied coverage.
