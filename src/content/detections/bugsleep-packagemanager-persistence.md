---
title: BugSleep persistence — PackageManager in ProgramData
date: 2026-07-07
updated: 2026-07-08
summary: >-
  The rule that taught me the difference between a detection failure and a telemetry gap.
  Originally keyed on execution, which never happened. The durable signal is the drop.
format: sigma
surface: endpoint
maturity: lab-validated
severity: high
actor: muddywater
research: [catching-muddywater-live, bugsleep-unmasked]
tags: [muddywater, bugsleep, sigma, persistence, masquerading, sysmon]
telemetry:
  - Sysmon Event ID 11 (FileCreate) covering C:\ProgramData — check your config includes it
  - Sysmon Event ID 1 (process creation) for the execution variant
attack:
  - { id: 'T1036.005', name: 'Masquerading: Match Legitimate Name or Location' }
  - { id: 'T1543', name: 'Create or Modify System Process' }
falsePositives:
  - "None expected. No legitimate package manager runs from C:\\ProgramData\\PackageManager\\."
---

BugSleep copies itself to `C:\ProgramData\PackageManager\PackageManager.exe` and reuses that same
bland name for its mutex and its folder. One legit-sounding word doing three jobs — hard to spot in
a process list, trivial to alert on once you know it.

This rule is on the site mostly because of how it failed.

## What I shipped first

```yaml
title: BugSleep Persistence - Execution from ProgramData PackageManager
id: 97503792-70b9-42b5-9909-31832eef2b87
status: experimental
author: Anas
date: 2026-07-07
tags:
    - attack.persistence
    - attack.defense-evasion
    - attack.t1036.005
    - attack.t1543
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\ProgramData\PackageManager\PackageManager.exe'
    condition: selection
falsepositives:
    - None expected. This path is not used by legitimate package managers.
level: high
```

## Why it stayed silent

I detonated the live sample with this rule armed in Splunk. It never fired. My first instinct was
that the persistence didn't run — wrong:

```powershell
Test-Path "C:\ProgramData\PackageManager\PackageManager.exe"   # True
```

The file was right there. Two separate problems, both mine:

1. **`PackageManager.exe` was dropped, not executed** in that run — it executes later, via
   persistence. A rule keyed on process creation waits for something that hadn't happened yet.
2. **Sysmon wasn't logging file creation in `ProgramData` at all.** The SwiftOnSecurity config I was
   running didn't cover that path, so even the drop produced no telemetry until I added it.

## The corrected rule

The durable signal is the **drop**, not the execution — it happens first, and it happens on every
infection regardless of when persistence fires.

```yaml
title: BugSleep Persistence Binary Dropped to ProgramData PackageManager
id: 97503792-70b9-42b5-9909-31832eef2b87
status: experimental
description: >
    Detects creation of BugSleep's persistence copy, which masquerades as a
    "PackageManager" binary under C:\ProgramData\PackageManager\. The drop is the
    durable signal; the execution happens later and may be missed on the initial run.
author: Anas
date: 2026-07-08
tags:
    - attack.persistence
    - attack.defense-evasion
    - attack.t1036.005
    - attack.t1543
logsource:
    category: file_event
    product: windows
detection:
    selection:
        TargetFilename|startswith: 'C:\ProgramData\PackageManager\'
    condition: selection
falsepositives:
    - None expected. This path is not used by legitimate package managers.
level: high
```

Keep the execution rule too — they cover different moments, and the execution event is the one that
tells you persistence actually fired. Just don't rely on it to catch the initial infection.

<!-- -->

## The transferable lesson

A rule that doesn't fire has two very different explanations, and they need different fixes. Mine
looked like a detection failure and was actually a **telemetry gap** — the behaviour happened, the
logging didn't cover it.

You only find that by detonating something and checking the disk against the dashboard. A green
dashboard that isn't logging the right thing is worse than no dashboard, because you'll trust it.

Before deploying this, confirm your Sysmon config includes `C:\ProgramData` in its `FileCreate`
rules. Many popular configs exclude it for volume reasons, which is a defensible trade — but it's
one you should make knowingly.
