---
name: MuddyWater
aliases: [Earth Vetala, Static Kitten, Mercury, Seedworm, TEMP.Zagros]
nexus: Iran
firstSeen: '2017'
motivation: [Espionage, Intelligence collection]
attribution: moderate
status: tracking
summary: >-
  Iran-nexus espionage crew that leans almost entirely on phishing for access and rebuilds its
  backdoors constantly. I've reversed two of their implants end to end — BugSleep and Phoenix —
  and detonated one of them against a live SIEM, IDS and EDR stack.
malware: [BugSleep, Phoenix]
tags: [muddywater, iran, espionage, phishing]
attack:
  - { id: 'T1566.001', name: 'Spearphishing Attachment' }
  - { id: 'T1204.002', name: 'User Execution: Malicious File' }
  - { id: 'T1059.003', name: 'Windows Command Shell' }
  - { id: 'T1140', name: 'Deobfuscate/Decode Files or Information' }
  - { id: 'T1027', name: 'Obfuscated Files or Information' }
  - { id: 'T1027.009', name: 'Embedded Payloads' }
  - { id: 'T1036.005', name: 'Masquerading: Match Legitimate Name or Location' }
  - { id: 'T1036.008', name: 'Masquerade File Type' }
  - { id: 'T1055', name: 'Process Injection' }
  - { id: 'T1055.003', name: 'Thread Execution Hijacking' }
  - { id: 'T1543', name: 'Create or Modify System Process' }
  - { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols' }
  - { id: 'T1571', name: 'Non-Standard Port' }
  - { id: 'T1095', name: 'Non-Application Layer Protocol' }
  - { id: 'T1074.001', name: 'Local Data Staging' }
  - { id: 'T1082', name: 'System Information Discovery' }
---

MuddyWater has been active since around 2017 and is publicly linked to Iranian intelligence. They
are not a subtle group. Access comes from phishing, usually a macro-bearing Office document with a
regionally-tailored lure, and the interesting engineering happens after the document opens rather
than before.

I've taken two of their backdoors apart. What I keep coming back to is how little continuity there
is between them at the technical level, and how much that matters if you're the one writing the
rules.

## Two implants, two completely different execution models

**BugSleep (2024).** A 246 KB PE that imports nothing but KERNEL32 — no socket library, no crypto
library — and resolves everything it needs at runtime by parsing PE exports. Its obfuscation is
famously anticlimactic: every byte of the code and config is the plaintext **minus six**, flipped
back at runtime by an SSE `PSUBB` loop. Every triage tool called it packed. There was no packer.

It hides by injecting into `msedge.exe` so its C2 traffic looks like browsing, and its C2 is a
hardcoded IP on TCP/443 that it reaches with **no DNS lookup** and no TLS handshake — the port
implies both and it does neither. Persistence is a self-copy to
`C:\ProgramData\PackageManager\PackageManager.exe`, reusing that one bland name for the folder, the
binary and the mutex.

Full teardown in [BugSleep, Unmasked](/research/bugsleep-unmasked).

**Phoenix (2025).** A phishing `.doc` hides a hex-encoded PE inside a UserForm textbox — not in the
macro body, where a `strings` pass would find it. The macro decodes it to
`C:\Users\Public\hostmanager.txt`, renames it `.txt` → `.png` → `.log` to dodge extension checks,
then runs it via `cmd.exe /C`. The stage-2 loader carries an encrypted core in a high-entropy
`.rdata` section.

Every published report described that encryption as AES. It isn't — at least not in this build. It's
a repeating 32-byte XOR with the key sitting in plaintext at the top of `.data`, followed by a
byte-stuffing layer that strips every 11th byte. I checked five separate ways for AES fingerprints
and found none in the loader or the core.

Full teardown in [Phoenix, Unmasked](/research/phoenix-unmasked).

**The gap between them is the point.** BugSleep crawls inside a signed browser via
`WriteProcessMemory` + `CreateRemoteThread`. Phoenix runs its payload with `CreateThread` in its own
process — no injection at all. Same crew, roughly a year apart, opposite tradecraft. A detection
tuned to either one would have been completely blind to the other, which is why the
[detection library](/detections) carries a layered set for each rather than one MuddyWater rule.

## Phoenix ships two ways

Worth recording separately, because it changed how I had to write the rules. Pivoting on the actor's
own `Phoniex` typo on MalwareBazaar turned up a Hungarian-lure campaign whose maldoc **embeds the
Phoenix core directly** and drops it as `Updater_VB.exe` — no XOR-packed loader in the chain at all.
The Israel/`netivtech` campaign I analysed uses the packed loader.

Same backdoor, two delivery chains, and a rule tuned to one is blind to the other. That's why the
[core YARA rule](/detections/phoenix-core-yara) — which anchors on the backdoor's own code rather
than on how it arrived — is the one I'd actually deploy.

## Tradecraft notes

They recompile constantly. The Phoenix PDB path
(`D:\phonix\phoenixV3\phoenixV3\phoenixV2\x64\Release\phoenix.pdb`) shows V2 nested inside V3 inside
a misspelled parent directory, which tells you something about both the release cadence and the
engineering discipline.

They also cut corners in ways that help defenders. Phoenix's user-agent is Microsoft's own WinHTTP
sample-code string with a browser prefix bolted on, and the literal `WinHTTP Example/1.0` is still
sitting in the binary. Its XOR key is a keyboard mash. BugSleep's cipher is subtraction. The typo in
their build folder is stable enough across campaigns to pivot on.

None of that is sophisticated — but sophistication isn't the same as effectiveness, and a phishing
document with a plausible local lure still works.

## On attribution

I've marked this **moderate** rather than high. Here's the split.

What I established myself: that BugSleep and Phoenix are what I say they are, how each one works at
the instruction level, and that the two Phoenix campaigns share a core. All of that came out of
samples I opened.

What corroborates but isn't mine: when I submitted the BugSleep sample to Trend's sandbox with no
input from me, it returned `Backdoor.Win64.MUDDYROT` and named the actor **Earth Vetala** — Trend's
name for MuddyWater. That's an independent engine reaching the same attribution, which is worth more
than another blog repeating it, and it's why this sits at moderate rather than inherited.

What I have **not** established: the link from these samples to Iranian intelligence specifically.
That comes from published reporting. I'm recording it as such rather than laundering someone else's
confidence into my own.

## Coverage

Nine rules across both families, layered by surface. The BugSleep set is
[lab-validated](/log/what-untested-means) — detonated live with Sysmon into Splunk, Suricata on a
mirrored span, and a commercial EDR on the victim
([the run is written up here](/research/catching-muddywater-live)). Most of the Phoenix set is
sample-validated only, because that detonation is still on the bench. The labels say which is which.
