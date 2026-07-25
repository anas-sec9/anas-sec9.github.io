---
title: BugSleep C2 — hardcoded IP and non-TLS traffic on 443
date: 2026-07-07
updated: 2026-07-08
summary: >-
  Two rules: the C2 address itself, and the more durable one — an established session to
  port 443 that never negotiates TLS. Both fired during a live sinkholed detonation.
format: suricata
surface: network
maturity: lab-validated
severity: critical
actor: muddywater
research: [catching-muddywater-live, bugsleep-unmasked]
tags: [muddywater, bugsleep, suricata, c2]
telemetry:
  - Suricata on a span or tap with app-layer protocol detection enabled
attack:
  - { id: 'T1571', name: 'Non-Standard Port' }
  - { id: 'T1095', name: 'Non-Application Layer Protocol' }
falsePositives:
  - "SID 9100001 is an exact IP match — none expected while that infrastructure is hostile. Retire it as infrastructure rotates."
  - "SID 9100002 is scoped to the same IP, so it is equally tight. Generalised to any destination it would need tuning for VPNs, gaming and other non-TLS 443 traffic."
---

BugSleep beacons to a hardcoded IP on TCP/443 to look like HTTPS, but the traffic isn't TLS —
there's no valid handshake — and there's no DNS lookup preceding it, because the address is baked
into the binary rather than resolved.

Those two anomalies are the detection. A real browser resolves a name first and then speaks TLS.
This does neither, while using the port that implies both.

SID range `9100000–9100999` is reserved for my CTI rules.

## The rules

```suricata
# 1) Any traffic to the C2 IP - highest confidence IOC.
alert ip $HOME_NET any -> 91.235.234.202 any ( \
    msg:"CTI BugSleep MuddyWater C2 - traffic to 91.235.234.202"; \
    threshold:type limit, track by_src, count 1, seconds 300; \
    classtype:trojan-activity; sid:9100001; rev:1; )

# 2) Established beacon to C2 on 443 that is NOT TLS - custom protocol over the
#    HTTPS port. Fires when app-layer proto on dst 443 is not tls/ssl.
alert tcp $HOME_NET any -> 91.235.234.202 443 ( \
    msg:"CTI BugSleep MuddyWater C2 beacon - non-TLS traffic on TCP/443"; \
    flow:established,to_server; \
    app-layer-protocol:!tls; \
    classtype:trojan-activity; sid:9100002; rev:1; )
```

The `threshold` on the first rule matters: BugSleep beacons roughly every 60–80 seconds, so without
it a single infection generates an alert per beacon and buries the analyst in duplicates of one
finding.

## Live-fire result

Validated during a real detonation. Containment was a sinkhole route on the victim pointing
`91.235.234.202/32` at the sensor, with IP forwarding disabled on the sensor so the packet died
there — the beacon crossed the mirrored network where Suricata could see it and never reached the
internet.

```
[1:9100001:1] CTI BugSleep MuddyWater C2 - traffic to 91.235.234.202 ...
192.168.100.10:51859 -> 91.235.234.202:443
```

The clearest single frame of that run had the injected Edge going straight to the hardcoded IP with
no DNS, right next to a *different* Edge process doing a normal DNS lookup for a Microsoft domain.
Same process name, opposite behaviour. Full write-up in
[Catching MuddyWater Live](/research/catching-muddywater-live).

## The version worth generalising

SID 9100002 is scoped to one IP, which makes it tight but temporary. The transferable idea is
`app-layer-protocol:!tls` on destination port 443 — that's implant behaviour in general, not
BugSleep's.

Pointed at any destination it needs real tuning: some VPNs, game clients and internal tooling use
443 for non-TLS traffic. Measure it in your own environment before alerting; as a hunting query
rather than an alert, it's immediately useful.

## Not done yet

A content signature on the beacon payload itself — the base64 framing over the raw socket — would
survive an IP change entirely. That needs protocol reversing I haven't finished, and I'd rather
flag it as outstanding than pretend the IP rules cover it.
