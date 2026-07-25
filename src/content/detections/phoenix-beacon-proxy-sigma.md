---
title: Phoenix C2 check-in in proxy logs
date: 2026-07-09
summary: >-
  Catches the Phoenix registration beacon where its HTTP fields are actually visible — proxy
  logs or a TLS-inspection point — rather than pretending a passive sensor can see them.
format: sigma
surface: network
maturity: untested
severity: high
actor: muddywater
research: [phoenix-unmasked, hunting-phoenix]
tags: [muddywater, phoenix, sigma, c2, proxy]
telemetry:
  - Web proxy logs with user-agent, host and URI stem fields
  - Or a TLS-inspecting gateway forwarding decrypted HTTP metadata
attack:
  - { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols' }
  - { id: 'T1132.001', name: 'Data Encoding: Standard Encoding' }
falsePositives:
  - "Rare legitimate applications built directly on Microsoft's WinHttpClient sample library keep its user-agent. Pair with the host or URI condition rather than alerting on the UA alone."
---

The Phoenix core registers by POSTing a base64 blob to `/register` with a hardcoded user-agent, then
polls `/` for tasking. All of that rides inside TLS, so it belongs in proxy logs, not in a wire rule.

The user-agent is the interesting field:

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) WinHttpClient/1.0
```

That's not a browser. It's Microsoft's own WinHTTP sample-code user-agent with a Chrome-ish prefix
bolted on — the developers lifted the sample and never changed the tail. The core still carries the
literal string `WinHTTP Example/1.0` elsewhere in the binary, which is how I traced it. Low effort
on their side, high signal on ours.

## The rule

```yaml
title: Phoenix C2 Beacon — WinHTTP UA to /register (Proxy / TLS-Inspection)
id: 8f2a1c3e-4b6d-4e21-9a0f-phoenix000003
status: experimental
description: >
    Detects Phoenix (MuddyWater) C2 check-in. The loader beacons over HTTPS with a
    hardcoded WinHTTP user-agent to /register (initial) and / (task poll). Because the
    traffic is TLS, these fields are only visible in proxy logs or at a TLS-inspection
    point — not on the raw wire (use the Suricata DNS/SNI rules there).
author: Anas
date: 2026/07/09
references:
    - internal: muddywater_phoenix analysis (config from process-memory dump)
tags:
    - attack.command-and-control
    - attack.t1071.001
    - attack.t1132.001
logsource:
    category: proxy
detection:
    winhttp_ua:
        c-useragent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WinHttpClient/1.0'
    c2_host:
        cs-host: 'netivtech.org'
    register_uri:
        cs-uri-stem: '/register'
    condition: winhttp_ua and (c2_host or register_uri)
falsepositives:
    - Rare legitimate apps built on the raw WinHttpClient sample library; pair with host
      or URI for confidence
level: high
```

## The hunt version

If you want to go looking rather than alerting, drop the host and URI conditions entirely and just
count distinct destinations per user-agent across a month of proxy logs. A hardcoded non-browser
user-agent talking to a small number of external hosts is a shape worth looking at whether or not
it's Phoenix — this is the same query that finds the next implant, not just this one.

## What the beacon body contains

The registration POST carries base64 of `HOST\user:OSver, build:priv` — for example
`DESKTOP-HBPB2TF\anas-lab:10.0, 19045:5`. Hostname, username, OS build and privilege level, handed
over on first contact. If your proxy logs request bodies (most don't), that's another anchor; if
they log request size, the registration POST is distinctively small and consistent.

## Status

Untested on a live stack. I confirmed these fields by dumping the running process, not by watching
them cross a proxy, and I haven't instrumented a proxy layer in the lab yet. That's part of the
pending live-fire run.
