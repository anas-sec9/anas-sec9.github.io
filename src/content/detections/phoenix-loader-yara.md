---
title: Phoenix stage-2 loader — XOR key plus encrypted .rdata
date: 2026-07-09
summary: >-
  On-disk detection for the XOR-packed Phoenix loader. Requires the actor's key or build path
  together with the structural trait of a high-entropy encrypted .rdata section.
format: yara
surface: file
maturity: sample-validated
severity: critical
actor: muddywater
research: [phoenix-unmasked]
# Hidden while the Phoenix write-ups are unpublished.
draft: true
tags: [muddywater, phoenix, yara, packer]
telemetry:
  - Files on disk scanned with YARA
  - Requires the pe and math modules
attack:
  - { id: 'T1027.009', name: 'Embedded Payloads' }
  - { id: 'T1140', name: 'Deobfuscate/Decode Files or Information' }
falsePositives:
  - The entropy condition alone matches most packers — it is deliberately never sufficient on its own here.
  - The XOR key and PDB path are per-build. A v4 rebuild with a new key will evade this rule; the core rule is the durable fallback.
---

This catches the packed stage-2 that the Israel/`netivtech` campaign drops as
`C:\Users\Public\hostmanager.log`. It's the delivery-specific half of the pack — precise, but by
design it only sees one of Phoenix's two delivery styles.

## The logic

Two classes of signal, required together:

The **content anchor** is either the 32-byte XOR key sitting in plaintext at the top of `.data`
(`edwfwergrtgtrgt5hyhy6hghtbgbt5by` — a keyboard mash, so effectively unique) or the developer's
build path, which carries a `phonix` typo in the directory name and the `phoenixV2`/`phoenixV3`
nesting.

The **structural anchor** is a `.rdata` section with entropy ≥ 7.0 — the embedded encrypted payload.
On its own this matches half of all packers, which is exactly why it never fires alone.

## The rule

```yara
import "pe"
import "math"

rule Phoenix_MuddyWater_loader
{
    meta:
        description = "MuddyWater Phoenix stage-2 loader on disk - actor PDB or XOR key AND encrypted .rdata payload"
        author      = "Anas"
        date        = "2026-07-09"
        reference   = "e9a59bbb4e2c28130d4daae12219f7ec2876c66ca9ab7e051cbf587770afab94"
        actor       = "MuddyWater / Earth Vetala"
        tlp         = "CLEAR"
    strings:
        // developer build path baked into the PE debug info - note the "phonix" typo in
        // the dev directory, and the phoenixV2/V3 nesting. Highly actor-specific.
        $pdb  = "phoenix.pdb"                       ascii nocase
        $dev1 = "\\phonix\\phoenix"                 ascii nocase
        $dev2 = "\\x64\\Release\\phoenix"           ascii nocase

        // 32-byte repeating-XOR key for the .rdata payload, stored plaintext in .data.
        $xkey = "edwfwergrtgtrgt5hyhy6hghtbgbt5by"  ascii
    condition:
        uint16(0) == 0x5A4D
        and filesize < 2MB
        // the embedded encrypted payload lives in a high-entropy .rdata section
        and for any i in (0 .. pe.number_of_sections - 1) : (
                pe.sections[i].name == ".rdata" and math.entropy(
                    pe.sections[i].raw_data_offset, pe.sections[i].raw_data_size) >= 7.0
            )
        // either the actor build path OR the XOR key, alongside the encrypted-blob structure
        and ($xkey or ($pdb and 1 of ($dev*)))
}
```

## Where it stops

The key and the PDB path are both per-build artifacts. The moment MuddyWater recompiles with a fresh
keyboard mash, this rule goes quiet — and that's fine, because the
[core rule](/detections/phoenix-core-yara) is the one built to survive that. Think of this as the
cheap, high-confidence first pass and the core rule as the safety net.

Once this fires, the [generic extractor](https://github.com/anas-sec9/threat-intel-reports) will
recover the key automatically and unpack the core statically — no detonation needed — so you can
confirm with the core rule in the same pass.
