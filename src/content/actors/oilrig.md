---
name: OilRig
aliases: [APT34, Helix Kitten, Cobalt Gypsy, Earth Simnavaz]
nexus: Iran
firstSeen: '2014'
motivation: [Espionage, Intelligence collection]
attribution: inherited
status: tracking
summary: >-
  Long-running Iran-nexus espionage group with a habit of building command-and-control into
  protocols nobody inspects. I've reversed Saitama, their DNS-tunnelling backdoor — the write-up
  is still in progress, but the decoder and detections are done.
malware: [Saitama]
tags: [oilrig, apt34, iran, espionage, dns-tunnelling]
attack:
  - { id: 'T1566.001', name: 'Spearphishing Attachment' }
  - { id: 'T1204.002', name: 'User Execution: Malicious File' }
  - { id: 'T1071.004', name: 'Application Layer Protocol: DNS' }
  - { id: 'T1132.002', name: 'Data Encoding: Non-Standard Encoding' }
  - { id: 'T1001.003', name: 'Data Obfuscation: Protocol or Service Impersonation' }
  - { id: 'T1041', name: 'Exfiltration Over C2 Channel' }
---

OilRig has been operating since roughly 2014, targeting government, energy and telecoms across the
Middle East. Where MuddyWater is loud and iterative, OilRig tends toward channels that don't get
looked at — and DNS is the canonical one.

## Saitama

Saitama is their DNS-tunnelling backdoor, and it's the most technically interesting sample I've
worked on. There is no HTTP, no TLS, no beaconing to a web server. Everything — registration,
tasking, command output, exfiltration — moves through DNS queries and responses to subdomains of the
operator's zone. To a network sensor without DNS analytics, an infected host looks like a host that
resolves a lot of names.

What makes it awkward to detect and awkward to decode is the encoding stack. Payloads are encoded
with a **base32 variant**, counters use **base36**, and the alphabet itself is shuffled by a
**Mersenne Twister (MT19937)** seeded per-session. That last part is the reason you can't just
base32-decode a captured query and read it — you have to reproduce the PRNG state first.

## Where this work stands

I have finished the reverse engineering. The deliverables that exist and are validated:

- A **DNS-tunnel decoder** that reproduces the MT19937 shuffle and recovers plaintext from captured
  queries. Validated two ways: against a publicly documented example, and against my own FakeNet-NG
  capture from detonating the sample in the lab.
- A **config extractor** that pulls the C2 zone and session parameters statically.
- **Behavioural detections** for the tunnel itself — the gap-filling kind, aimed at the shape of the
  traffic rather than at one campaign's domain, since a domain-based rule against a DNS implant ages
  out immediately.

What does not exist yet is the write-up. Rather than publish the profile with a link to nothing, I'd
rather this page say plainly that the analysis is done and the article is pending. It'll land in
[research](/research) when it's finished.

## On attribution

Marked **inherited**, for the same reason as MuddyWater. I can demonstrate what Saitama does and how
its encoding works, because I decoded it. The link from the sample to Iranian state interests comes
from published reporting, not from anything I established myself.
