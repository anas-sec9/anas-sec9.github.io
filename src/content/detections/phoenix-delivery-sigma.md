---
title: Word spawns cmd running C:\Users\Public\hostmanager.*
date: 2026-07-09
summary: >-
  The Phoenix delivery chain on the endpoint — an Office application spawning a shell that
  references the hostmanager staging path in Users\Public.
format: sigma
surface: endpoint
maturity: untested
severity: high
actor: muddywater
research: [phoenix-unmasked, hunting-phoenix]
# Hidden while the Phoenix write-ups are unpublished.
draft: true
tags: [muddywater, phoenix, sigma, maldoc, phishing]
telemetry:
  - Sysmon Event ID 1 (process creation) with ParentImage and CommandLine
  - Or Windows Security 4688 with command-line auditing enabled
attack:
  - { id: 'T1566.001', name: 'Spearphishing Attachment' }
  - { id: 'T1204.002', name: 'User Execution: Malicious File' }
  - { id: 'T1059.003', name: 'Windows Command Shell' }
falsePositives:
  - "Office spawning a shell at all is broad in some environments — add-ins, macro-heavy finance workflows, and deployment tooling all do it. Tune the office_parent branch per environment."
  - "The hostmanager path branch has no expected false positives; nothing legitimate writes hostmanager.* to C:\\Users\\Public."
---

The Israel campaign's macro drops the stage-2 loader to `C:\Users\Public\hostmanager.txt`, renames
it `.txt` → `.png` → `.log` to dodge extension-based checks, then runs it with `cmd.exe /C`. This
rule catches the execution end of that.

The two selections are deliberately different in strength. `hostmanager_ref` is essentially
zero-false-positive — nothing legitimate puts a file called `hostmanager` in `C:\Users\Public` and
then references it from a command line. `office_parent` combined with `child_shell` is the broader
behavioural pattern that would still catch a variant using a different filename, at the cost of
needing tuning.

## The rule

```yaml
title: Phoenix Maldoc — Word Spawns cmd Running C:\Users\Public\hostmanager.*
id: 8f2a1c3e-4b6d-4e21-9a0f-phoenix000001
status: experimental
description: >
    Detects the Phoenix (MuddyWater) delivery chain: a Word VBA macro drops the stage-2
    loader to C:\Users\Public\hostmanager.txt, renames it .txt -> .png -> .log to evade
    extension checks, then executes it via cmd.exe /C.
author: Anas
date: 2026/07/09
references:
    - https://www.group-ib.com/blog/muddywater-phoenix/
    - internal: muddywater_phoenix analysis (sample e9a59bbb...)
tags:
    - attack.execution
    - attack.t1059.003
    - attack.t1204.002
    - attack.initial-access
    - attack.t1566.001
logsource:
    category: process_creation
    product: windows
detection:
    office_parent:
        ParentImage|endswith:
            - '\WINWORD.EXE'
            - '\EXCEL.EXE'
            - '\POWERPNT.EXE'
    child_shell:
        Image|endswith:
            - '\cmd.exe'
            - '\powershell.exe'
            - '\pwsh.exe'
    hostmanager_ref:
        CommandLine|contains|all:
            - '\Users\Public\'
            - 'hostmanager'
    condition: office_parent and (child_shell or hostmanager_ref)
falsepositives:
    - None expected for the hostmanager path; Office-spawns-shell alone is broader, tune per env
level: high
```

## Coverage gap you should know about

This rule sees the **Israel** delivery chain. The Hungary campaign embeds the Phoenix core directly
in the maldoc and drops it as `Updater_VB.exe` via `ShellExecuteA` — a different parent-child shape
that this rule will not catch. Pair it with the
[file-drop rule](/detections/phoenix-drop-sigma) and, more importantly, with the
[core YARA rule](/detections/phoenix-core-yara), which is the layer that doesn't care how the
backdoor arrived.

## Status

Written from behaviour I confirmed by reversing and detonating the sample, and it parses clean, but
I have not yet watched it fire end-to-end with Sysmon feeding Splunk on the lab stack. Until I do,
it stays marked untested. Read that as "start here", not "deploy this Friday".
