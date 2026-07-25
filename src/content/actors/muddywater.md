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
  backdoors constantly. I've reversed their BugSleep implant end to end and detonated it against a
  live SIEM, IDS and EDR stack.
malware: [BugSleep]
tags: [muddywater, iran, espionage, phishing]
attack:
  - { id: 'T1566.001', name: 'Spearphishing Attachment' }
  - { id: 'T1204.002', name: 'User Execution: Malicious File' }
  - { id: 'T1140', name: 'Deobfuscate/Decode Files or Information' }
  - { id: 'T1027', name: 'Obfuscated Files or Information' }
  - { id: 'T1036.005', name: 'Masquerading: Match Legitimate Name or Location' }
  - { id: 'T1055', name: 'Process Injection' }
  - { id: 'T1055.003', name: 'Thread Execution Hijacking' }
  - { id: 'T1543', name: 'Create or Modify System Process' }
  - { id: 'T1571', name: 'Non-Standard Port' }
  - { id: 'T1095', name: 'Non-Application Layer Protocol' }
  - { id: 'T1074.001', name: 'Local Data Staging' }
  - { id: 'T1106', name: 'Native API' }
  - { id: 'T1082', name: 'System Information Discovery' }
---

MuddyWater has been active since around 2017 and is publicly linked to Iranian intelligence. They
are not a subtle group. Access comes from phishing, usually a macro-bearing Office document with a
regionally-tailored lure, and the interesting engineering happens after the document opens rather
than before.

## BugSleep, in detail

A 246 KB PE that imports nothing but KERNEL32 — no socket library, no crypto library — and resolves
everything it needs at runtime by parsing PE exports. Every triage tool I pointed at it called it
packed: 7.81 entropy on `.text`, a near-empty import table, the works.

There is no packer. Its obfuscation is famously anticlimactic — every byte of the code and config is
the plaintext **minus six**, flipped back at runtime by an SSE `PSUBB` loop. Once that was proven, a
static extractor could pull the config out of any sample in the family without ever running it.

It hides by injecting into `msedge.exe` so its C2 traffic looks like browsing, and its C2 is a
hardcoded IP on TCP/443 that it reaches with **no DNS lookup** and no TLS handshake — the port
implies both and it does neither. Persistence is a self-copy to
`C:\ProgramData\PackageManager\PackageManager.exe`, reusing that one bland name for the folder, the
binary and the mutex.

Full teardown in [BugSleep, Unmasked](/research/bugsleep-unmasked), and the live detonation against
SIEM, IDS and EDR in [Catching MuddyWater Live](/research/catching-muddywater-live).

## Tradecraft notes

They recompile constantly, and they cut corners in ways that help defenders. BugSleep's "encryption"
is subtraction. Its injection target list is sitting in `.data` as plaintext strings. Its persistence
binary is named after nothing in particular and dropped to a world-readable directory.

None of that is sophisticated — but sophistication isn't the same as effectiveness, and a phishing
document with a plausible local lure still works.

What does make them awkward is the churn. They rebuild their implants often enough that
sample-specific indicators age out fast, which is why the
[behavioural injection rule](/detections/bugsleep-msedge-remote-thread) — a remote thread created in
Edge by something that isn't Edge — is the one I'd actually deploy. It doesn't care which build of
which backdoor arrived.

## On attribution

I've marked this **moderate** rather than high. Here's the split.

What I established myself: that BugSleep is what I say it is, how it works at the instruction level,
and what it does on a live host with full telemetry underneath it. That came out of a sample I
opened.

What corroborates but isn't mine: when I submitted the sample to Trend's sandbox with no input from
me, it returned `Backdoor.Win64.MUDDYROT` and named the actor **Earth Vetala** — Trend's name for
MuddyWater. That's an independent engine reaching the same attribution, which is worth more than
another blog repeating it, and it's why this sits at moderate rather than inherited.

What I have **not** established: the link from this sample to Iranian intelligence specifically. That
comes from published reporting. I'm recording it as such rather than laundering someone else's
confidence into my own.

## Coverage

Five rules, layered by surface, and all of them
[lab-validated](/log/what-untested-means) — detonated live with Sysmon into Splunk, Suricata on a
mirrored span, and a commercial EDR on the victim. That run is written up in
[Catching MuddyWater Live](/research/catching-muddywater-live), including the two rules that stayed
silent and why.

More MuddyWater analysis is in progress and will land here when it's finished, not before.
