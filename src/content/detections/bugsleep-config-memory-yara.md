---
title: BugSleep decrypted config in memory
date: 2026-07-08
summary: >-
  Memory-only rule requiring the full decrypted config — C2, both persistence paths, staging
  file, injection target and the wide mutex string — so it only matches a live payload.
format: yara
surface: memory
maturity: sample-validated
severity: critical
actor: muddywater
research: [bugsleep-unmasked]
tags: [muddywater, bugsleep, yara, memory-forensics]
telemetry:
  - Process memory dumps (HollowsHunter, procdump) or a full memory image
  - Will not fire on disk — the config is subtract-6 encoded there
attack:
  - { id: 'T1055', name: 'Process Injection' }
  - { id: 'T1036.005', name: 'Masquerading: Match Legitimate Name or Location' }
falsePositives:
  - None observed. All six strings co-occurring outside a running BugSleep payload would be extraordinary.
---

On disk, BugSleep's config is every byte minus six, so scanning for `91.235.234.202` finds nothing.
Once the payload is running — injected into `msedge.exe` — the config is plaintext in that process's
address space. This rule is for that moment.

It's what turned "HollowsHunter flagged msedge" into "the Iranian C2 address is sitting inside
memory dumped from Edge, and legitimate Edge does not contain that."

## The rule

```yara
rule BugSleep_MuddyWater_memory
{
    meta:
        description = "MuddyWater BugSleep decrypted config in memory / process dump - run on memory, NOT disk"
        author      = "Anas"
        date        = "2026-07-08"
        reference   = "decrypted config recovered from an injected msedge.exe region"
        actor       = "MuddyWater"
        tlp         = "CLEAR"
        note        = "Requires ALL config strings, so it only matches the fully-decrypted payload."
    strings:
        // config strings sit ASCII in the decrypted region;
        // the mutex is wide, because it comes from the CreateMutexW argument
        $c2   = "91.235.234.202"                             ascii
        $per1 = "packagemanager.exe"                         ascii nocase
        $per2 = "\\ProgramData\\PackageManager\\"            ascii nocase
        $stg  = "\\Users\\Public\\a.txt"                     ascii nocase
        $inj  = "\\Microsoft\\Edge\\Application\\msedge.exe" ascii nocase
        $mtx  = "PackageManager"                             wide fullword
    condition:
        all of them
}
```

## Collecting the dump

```powershell
hollows_hunter /shellc 3 /dir C:\hh
Get-ChildItem C:\hh -Recurse -Filter *.shc |
    Select-String -Pattern "91.235.234.202" -List | Select-Object Path
```

HollowsHunter's aggressive mode is noisy — in my run it flagged 7 of 38 processes, including my own
PowerShell windows. A flag is not proof. Searching the dumps for a config string is.

## The rotation problem

`$c2` is campaign infrastructure and will age out. The durable strings here are the
`\ProgramData\PackageManager\` path, the wide `PackageManager` mutex, and the `a.txt` staging path,
because those are baked into the implant's logic rather than its deployment.

I've required all six deliberately. If you're hunting rather than confirming, drop `$c2` and require
the remaining five — still tight, and it survives a C2 change. If you want the family regardless of
config, use the [on-disk rule](/detections/bugsleep-decrypt-loop-yara) against the same dump; the
decrypt loop is present in memory too.
