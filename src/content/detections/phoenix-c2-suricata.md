---
title: Phoenix C2 on the wire — DNS and TLS SNI
date: 2026-07-09
summary: >-
  Pure-wire detection for the Phoenix C2 domain, plus the HTTP rules for a TLS-inspection
  point. Split across layers deliberately, so nothing here is a rule that can never fire.
format: suricata
surface: network
maturity: sample-validated
severity: critical
actor: muddywater
research: [phoenix-unmasked, hunting-phoenix]
# Hidden while the Phoenix write-ups are unpublished.
draft: true
tags: [muddywater, phoenix, suricata, c2]
telemetry:
  - Suricata on a span/tap with DNS and TLS parsers enabled
  - The HTTP rules additionally require TLS termination or a cleartext fallback
attack:
  - { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols' }
  - { id: 'T1573', name: 'Encrypted Channel' }
falsePositives:
  - "The domain rules are exact-match on a confirmed-malicious host — no expected false positives while the domain stays sinkholed or hostile."
  - "The WinHTTP user-agent is derived from Microsoft's own sample code, so a bespoke internal tool built from that sample could match. Pair with the host or URI."
---

Phoenix beacons over HTTPS, and that constrains what a network sensor can actually see. On the raw
wire you get the DNS query and the TLS SNI. The URI (`/register`) and the hardcoded user-agent are
HTTP fields sitting inside the TLS session — invisible to a passive sensor.

That distinction is the whole point of how this rule file is organised. Writing a `http.uri` rule
for an HTTPS-only implant and calling it detection is a rule that will never fire once, and I'd
rather split the layers honestly.

SID block: `9200000–9200099`.

## Pure wire — no TLS inspection required

```suricata
# --- C2 domain: DNS resolution --------------------------------------------------------
alert dns $HOME_NET any -> any any (msg:"MW PHOENIX C2 DNS query netivtech.org"; \
    dns.query; content:"netivtech.org"; nocase; isdataat:!1,relative; \
    classtype:trojan-activity; \
    metadata:actor MuddyWater, malware Phoenix, mitre_technique_id T1071.001, tlp CLEAR; \
    reference:url,group-ib.com; sid:9200001; rev:1;)

# --- C2 domain: TLS SNI ---------------------------------------------------------------
alert tls $HOME_NET any -> $EXTERNAL_NET any (msg:"MW PHOENIX C2 TLS SNI netivtech.org"; \
    tls.sni; content:"netivtech.org"; nocase; bsize:13; \
    classtype:trojan-activity; \
    metadata:actor MuddyWater, malware Phoenix, mitre_technique_id T1573, tlp CLEAR; \
    sid:9200002; rev:1;)
```

The `isdataat:!1,relative` on the DNS rule and `bsize:13` on the SNI rule both pin the match to the
exact domain rather than any label containing it — worth doing, because a sloppy `content` match on
a short domain string picks up subdomains of unrelated hosts.

## Requires TLS termination or a cleartext fallback

```suricata
# --- Malware user-agent (fires only where TLS is terminated / for cleartext fallback) --
# Phoenix hardcodes this WinHTTP UA. It is NOT a normal browser UA -> high-fidelity if
# ever seen in plaintext (misconfigured C2, HTTP fallback) or at a decrypting proxy.
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"MW PHOENIX hardcoded WinHTTP user-agent"; \
    flow:established,to_server; http.user_agent; \
    content:"Mozilla/5.0 (Windows NT 10.0|3b 20|Win64|3b 20|x64) WinHttpClient/1.0"; \
    classtype:trojan-activity; \
    metadata:actor MuddyWater, malware Phoenix, mitre_technique_id T1071.001, tlp CLEAR; \
    sid:9200003; rev:1;)

# --- Registration beacon URI (cleartext / TLS-inspection only) ------------------------
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"MW PHOENIX registration beacon POST /register"; \
    flow:established,to_server; http.method; content:"POST"; \
    http.uri; content:"/register"; bsize:9; \
    http.user_agent; content:"WinHttpClient/1.0"; \
    classtype:trojan-activity; \
    metadata:actor MuddyWater, malware Phoenix, mitre_technique_id T1071.001, tlp CLEAR; \
    sid:9200004; rev:1;)
```

If you don't have TLS inspection, these two are still worth loading — a misconfigured C2 or an HTTP
fallback path would light them up, and the cost of an idle rule is nothing.

## Validation

The DNS and SNI rules were confirmed against traffic from my own detonation, with FakeNet-NG
answering as the fake internet, so I know they have something real to bite on. The HTTP pair have
not been exercised against decrypted traffic — I didn't have a MITM in the path for that run.

For the same fields in proxy logs rather than on the wire, see the
[proxy beacon Sigma rule](/detections/phoenix-beacon-proxy-sigma).

## Rotation risk

`netivtech.org` is one campaign's infrastructure. Group-IB reported `screenai.online` for other
Phoenix samples, and there will be more. Domain-based network rules have a short half-life by
nature — treat these as campaign coverage, not family coverage, and lean on the
[core YARA rule](/detections/phoenix-core-yara) for the part that survives infrastructure changes.
