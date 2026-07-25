---
title: BugSleep on disk — subtract-6 decrypt loop plus process hit-list
date: 2026-07-08
summary: >-
  Anchors on the exact PSUBB decrypt-loop bytes required together with the injection target
  list. Neither signal is safe alone; the pair inside one small PE is BugSleep.
format: yara
surface: file
maturity: sample-validated
severity: critical
actor: muddywater
research: [bugsleep-unmasked]
tags: [muddywater, bugsleep, yara, malware]
telemetry:
  - Files on disk scanned with YARA
  - Requires the pe module
attack:
  - { id: 'T1027', name: 'Obfuscated Files or Information' }
  - { id: 'T1140', name: 'Deobfuscate/Decode Files or Information' }
falsePositives:
  - The SSE decrypt loop shape can appear in legitimate crypto code and packers. It never fires alone.
  - The process names appear in countless benign binaries. Five-of-seven is required, and still only alongside the loop.
---

BugSleep's whole obfuscation scheme is subtracting 6 from every byte, done sixteen bytes at a time
with `PSUBB`. That loop is a specific, stable byte sequence — and it's a much better anchor than any
string in the sample, because strings are what an operator changes between campaigns and instruction
sequences are what they don't.

## Why two conditions, not one

The decrypt loop on its own is an SSE subtract — legitimate crypto and plenty of packers produce
similar shapes. The process hit-list on its own (`msedge.exe`, `chrome.exe`, `anydesk.exe`…) appears
in enormous numbers of benign programs, including security tooling.

Together, inside a sub-400KB PE, they're BugSleep. That's the discipline every rule in this
library follows: never OR weak signals, and never anchor on something that isn't specific to the
thing you're hunting.

Only the `JL` displacement is wildcarded, so a recompile that shifts the loop's position still
matches.

## The rule

```yara
import "pe"

rule BugSleep_MuddyWater_file
{
    meta:
        description = "MuddyWater BugSleep on-disk PE - subtract-6 decrypt loop AND process hit-list together"
        author      = "Anas"
        date        = "2026-07-08"
        reference   = "73c677dd3b264e7eb80e26e78ac9df1dba30915b5ce3b1bc1c83db52b9c6b30e"
        imphash     = "5d30c32f609687ca146ba5bde4bc6d09"   // pivot only
        actor       = "MuddyWater"
        tlp         = "CLEAR"
    strings:
        // injection / masquerade target list, stored ASCII in .data
        $s1 = "msedge.exe"     ascii nocase
        $s2 = "opera.exe"      ascii nocase
        $s3 = "chrome.exe"     ascii nocase
        $s4 = "anydesk.exe"    ascii nocase
        $s5 = "Onedrive.exe"   ascii nocase
        $s6 = "svchost.exe"    ascii nocase
        $s7 = "powershell.exe" ascii nocase

        // subtract-6 config/payload decrypt loop (RVA ~0x24af0):
        //   MOVDQU XMM0,[RAX+RSI] / PSUBB XMM0,XMM6 / MOVDQU [RAX+RSI],XMM0
        //   ADD RAX,0x10 / CMP RAX,0x30 / JL
        // only the JL displacement is wildcarded, so a recompile still matches.
        $decrypt = { F3 0F 6F 04 30 66 0F F8 C6 F3 0F 7F 04 30 48 83 C0 10 48 83 F8 30 7C ?? }
    condition:
        uint16(0) == 0x5A4D
        and filesize < 400KB
        and $decrypt
        and 5 of ($s*)
}
```

## Where it stops

This was built from one sample. The `$decrypt` bytes are the durable part — they encode the
algorithm, not the campaign — but I haven't retrohunted a corpus to confirm the loop is identical
across every BugSleep build.

One known variation is already documented: this sample uses **two** subtraction keys, 6 and 8, for
different strings, which matches Check Point's note that BugSleep varies its key. A build using only
a different key would still produce the same instruction sequence (the key lives in `XMM6`, loaded
separately), so the rule should hold — but "should" is doing work in that sentence, and until I've
tested it against more samples this stays sample-validated rather than production.
