---
title: Phoenix core backdoor — cross-sample code anchors
date: 2026-07-10
summary: >-
  Catches the unpacked Phoenix backdoor regardless of how it was delivered, by anchoring on
  code shared between two independently-sourced builds but absent from the C runtime.
format: yara
surface: file
maturity: sample-validated
severity: critical
actor: muddywater
research: [hunting-phoenix, phoenix-unmasked]
# Hidden while the Phoenix write-ups are unpublished.
draft: true
tags: [muddywater, phoenix, yara, malware]
telemetry:
  - Files on disk, or a memory dump, scanned with YARA
  - Requires the pe and math modules
attack:
  - { id: 'T1027.009', name: 'Embedded Payloads' }
  - { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols' }
falsePositives:
  - None observed across the two cores, the loader, and notepad.exe. Built from only two samples — retrohunt before promoting to production.
---

This is the durable rule of the Phoenix pack. MuddyWater ships Phoenix two different ways — a
XOR-packed loader in the Israel/`netivtech` campaign, and the core embedded directly in the maldoc
in the Hungary campaign — so a rule anchored on delivery only ever catches half the traffic. This
one anchors on the backdoor itself.

## Why the obvious approach fails

Diffing two cores for shared byte sequences and anchoring on the longest runs gives you the MSVC C
runtime, not Phoenix. Those blocks are thousands of bytes long and appear in every binary compiled
with Visual Studio.

The fix was to subtract a control. The Phoenix *loader* is also a VS binary, so it shares the CRT
with the cores but contains none of the backdoor's own logic:

```
keep code that is:  in core A  AND  in core B  AND NOT in the loader/CRT
```

What survives is Phoenix's own code — the parts that persisted through a recompile between two
campaigns. Three of those runs became the anchors, with call and table offsets wildcarded so a
rebuild still matches, and the condition requires **two of them together**. No weak signal fires
alone.

## The rule

```yara
import "pe"
import "math"

rule Phoenix_MuddyWater_core
{
    meta:
        description = "MuddyWater Phoenix unpacked core backdoor - cross-sample code anchors"
        author      = "Anas"
        date        = "2026-07-10"
        reference   = "e9d376e8 (decrypted core) + b99edfb9 (MalwareBazaar Hungary build)"
        actor       = "MuddyWater / Earth Vetala"
        tlp         = "CLEAR"
        note        = "Anchors are Phoenix core code shared by two builds but absent from the loader/CRT. Validated: matches both cores, clean on the loader and notepad.exe. Built from 2 samples - retrohunt before production."
    strings:
        // MS-sample-derived user-agent string present in the core (weak alone)
        $ua = "WinHTTP Example/1.0" ascii

        // arith + distinctive immediates 0x1D/0x19 (and eax,1Dh / add eax,19h)
        $c1 = { f6 d8 4c 8b c9 48 89 54 24 60 8b 51 04 1b c0 83 e0 1d 48 89 4c 24 58 83 c0 19 45 33 db 45 85 d2 }

        // index*5 / dec / table lookup; disp32 + rel32 wildcarded so a rebuild still matches
        $c2 = { 8b 4c 24 40 8d 04 80 03 c0 2b c8 74 41 8d 41 ff 8b 84 83 [4] 85 c0 0f 85 [4] 45 33 c9 }

        // struct-field length check [rbx+18]/[rbx+28]; rel8 wildcarded
        $c3 = { 48 8b 4b 18 48 3b d1 76 0c 40 38 6b 28 74 ?? 40 88 6b 28 }
    condition:
        uint16(0) == 0x5A4D
        and filesize < 2MB
        // two independent Phoenix code regions, OR one code region + the UA string
        and (2 of ($c*) or (1 of ($c*) and $ua))
}
```

## Validation

| Target | Expected | Result |
| --- | --- | --- |
| `e9d376e8…` — my decrypted core | match | match |
| `b99edfb9…` — MalwareBazaar Hungary core | match | match |
| Payload carved from the Hungary maldoc | match | match |
| `e9a59bbb…` — the stage-2 loader | no match | no match |
| `notepad.exe` | no match | no match |

Three independently-sourced instances across two campaigns, plus a benign canary. What it has *not*
had is a retrohunt across a large corpus, which is the next step before I'd call it production.

## Pairing

Use with the [loader rule](/detections/phoenix-loader-yara) for on-disk coverage of the packed
variant, and the [memory config rule](/detections/phoenix-config-memory-yara) for process dumps.
