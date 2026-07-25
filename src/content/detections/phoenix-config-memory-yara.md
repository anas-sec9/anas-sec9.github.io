---
title: Phoenix decrypted config in memory
date: 2026-07-09
summary: >-
  Memory-only rule for the runtime-assembled Phoenix C2 config. Requires the C2 host, the
  hardcoded WinHTTP user-agent and the /register endpoint together.
format: yara
surface: memory
maturity: sample-validated
severity: critical
actor: muddywater
research: [phoenix-unmasked]
# Hidden while the Phoenix write-ups are unpublished.
draft: true
tags: [muddywater, phoenix, yara, memory-forensics]
telemetry:
  - Process memory dumps (procdump, HollowsHunter) or a full memory image
  - Do not run this against disk — it will never fire there, by design
attack:
  - { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols' }
  - { id: 'T1132.001', name: 'Data Encoding: Standard Encoding' }
falsePositives:
  - None observed. All three strings appearing together outside a Phoenix process would be extraordinary.
---

Phoenix never writes its config to disk. The core assembles the C2 host, endpoints and user-agent as
stack strings at runtime, which is why scanning the decrypted core for `netivtech` returns nothing
and why the packed sample looked like it was hiding something stronger than it was.

The config only exists in the address space of a running Phoenix process. That makes this rule
useless on disk and valuable on a memory dump — which is exactly the split it's written for.

## The rule

```yara
rule Phoenix_MuddyWater_config_memory
{
    meta:
        description = "MuddyWater Phoenix decrypted config in memory / process dump - run on memory, NOT disk"
        author      = "Anas"
        date        = "2026-07-09"
        reference   = "config recovered from a full process dump of the running loader"
        actor       = "MuddyWater / Earth Vetala"
        tlp         = "CLEAR"
        note        = "Requires C2 host, WinHTTP UA and /register together - matches only the fully-decrypted config."
    strings:
        $c2   = "netivtech.org"                                                   ascii nocase
        $reg  = "/register"                                                       ascii
        $ua   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WinHttpClient/1.0"     ascii
    condition:
        all of them
}
```

## Collecting the dump

```
procdump64.exe -ma <pid> phoenix.dmp
```

Or, if you're sweeping for injected/unpacked regions rather than a known PID, `HollowsHunter` will
dump the suspicious regions and you can scan the output directory.

## Caveat worth stating

The `$c2` string is campaign-specific. A build pointed at a different C2 — Group-IB reported
`screenai.online` for other samples — won't match. The user-agent and `/register` are the more
durable pair, but I've deliberately required all three rather than loosening it, because a two-string
version starts matching generic WinHTTP traffic captures. If you're hunting broadly rather than
confirming a known infection, use the [core rule](/detections/phoenix-core-yara) against the same
dump instead.
