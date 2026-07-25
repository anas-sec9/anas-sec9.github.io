---
title: hostmanager payload written to C:\Users\Public
date: 2026-07-09
summary: >-
  File-creation detection for the Phoenix staging drop, including the .txt → .png → .log
  rename dance the macro uses to dodge extension checks.
format: sigma
surface: endpoint
maturity: untested
severity: high
actor: muddywater
research: [phoenix-unmasked]
tags: [muddywater, phoenix, sigma, defense-evasion]
telemetry:
  - Sysmon Event ID 11 (FileCreate) covering C:\Users\Public
attack:
  - { id: 'T1036.008', name: 'Masquerade File Type' }
  - { id: 'T1204.002', name: 'User Execution: Malicious File' }
falsePositives:
  - "Extremely unlikely. hostmanager.* in C:\\Users\\Public is not a legitimate location for anything."
---

The command line is the part an operator can obfuscate. The file drop is harder to hide — the
payload has to land somewhere before it runs. This rule watches the landing spot.

The three extensions matter. The macro writes `hostmanager.txt`, renames it to `hostmanager.png`,
then to `hostmanager.log`, and only then executes it. The point is to get past anything looking for
a dropped `.exe`. Since Sysmon logs each of those as a file event, catching any one of them is
enough — and catching all three in sequence, within a second or two of each other, is about as clear
a signal as this job offers.

## The rule

```yaml
title: Phoenix Maldoc — hostmanager Payload Dropped to C:\Users\Public
id: 8f2a1c3e-4b6d-4e21-9a0f-phoenix000002
status: experimental
description: >
    Detects creation of the Phoenix stage-2 payload in C:\Users\Public under the
    hostmanager.* names the macro uses (.txt intermediate, .png rename, .log final).
    Sysmon EID 11. This is the durable on-disk signal even when the shell command line
    is obfuscated.
author: Anas
date: 2026/07/09
references:
    - https://www.group-ib.com/blog/muddywater-phoenix/
    - internal: muddywater_phoenix analysis
tags:
    - attack.defense-evasion
    - attack.t1036.008
    - attack.execution
    - attack.t1204.002
logsource:
    category: file_event
    product: windows
detection:
    selection:
        TargetFilename|startswith: 'C:\Users\Public\hostmanager'
        TargetFilename|endswith:
            - '.txt'
            - '.png'
            - '.log'
    condition: selection
falsepositives:
    - Extremely unlikely; hostmanager.* in Users\Public is not a legitimate location
level: high
```

## A broader version worth considering

If you want coverage beyond this exact filename, drop the `hostmanager` prefix and alert on *any*
file created in `C:\Users\Public` that is subsequently executed. That's a much noisier rule in most
environments, but `C:\Users\Public` is a well-worn staging directory precisely because it's
world-writable and rarely monitored. Worth measuring the volume in your own estate before dismissing
it.

## Status

Parses clean and is written from confirmed behaviour, but has not been fired end-to-end on the lab
stack with Sysmon into Splunk yet. Marked untested until it has.
