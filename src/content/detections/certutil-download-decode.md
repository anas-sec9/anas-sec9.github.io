---
title: Certutil as a download cradle or decoder
date: 2026-07-06
summary: >-
  certutil is a certificate utility that attackers use to pull tools past the proxy and
  unpack base64 payloads. This separates that from its legitimate CRL-fetching job.
format: sigma
surface: endpoint
maturity: lab-validated
severity: medium
tags: [lolbin, ingress, defense-evasion, sigma, splunk]
telemetry:
  - Sysmon Event ID 1 (process creation) with CommandLine and OriginalFileName populated
attack:
  - { id: 'T1105', name: 'Ingress Tool Transfer' }
  - { id: 'T1140', name: 'Deobfuscate/Decode Files or Information' }
falsePositives:
  - certutil legitimately fetches CRL/CTL data via verifyctl/urlcache from CA URLs — allowlist known CA domains.
  - Admins convert certificate formats with -encode/-decode on .cer/.pem/.crt files. Tune by output extension; a decode to .exe/.dll/.b64 is the suspicious shape.
---

`certutil.exe` does two things attackers want. It fetches URLs (`-urlcache`, `-verifyctl`), which
makes it a download cradle that looks like certificate maintenance to a proxy. And it does base64
(`-encode`/`-decode`), which unpacks a staged payload without ever bringing a binary through the
perimeter in recognisable form.

Both are legitimate certutil functions, which is why the rule is shaped around *combinations* rather
than verbs.

## The rule

```yaml
title: Certutil Download or Encode/Decode (LOLBin ingress & staging)
id: d6a41f99-5e0c-4b3d-9c8a-3f4e5d6c7b8a
status: experimental
description: >
  Detects certutil.exe used as a download cradle (urlcache/verifyctl fetching a
  URL) or to encode/decode a payload on disk.
references:
  - https://attack.mitre.org/techniques/T1105/
  - https://attack.mitre.org/techniques/T1140/
  - https://lolbas-project.github.io/lolbas/Binaries/Certutil/
author: Anas
date: 2026-07-06
tags:
  - attack.command-and-control
  - attack.defense-evasion
  - attack.t1105
  - attack.t1140
logsource:
  category: process_creation
  product: windows
detection:
  selection_certutil:
    - Image|endswith: '\certutil.exe'
    - OriginalFileName: 'CertUtil.exe'
  selection_dl_verb:
    CommandLine|contains:
      - 'urlcache'
      - 'verifyctl'
  selection_dl_url:
    CommandLine|contains:
      - 'http://'
      - 'https://'
      - 'ftp://'
  selection_codec:
    CommandLine|contains:
      - '-decode'
      - '/decode'
      - '-encode'
      - '/encode'
  condition: selection_certutil and ((selection_dl_verb and selection_dl_url) or selection_codec)
falsepositives:
  - certutil legitimately fetches CRL/CTL data from CA URLs - allowlist known CA domains
  - Admins convert cert formats with -encode/-decode - tune by output file extension
level: medium
```

## Why the download branch needs both conditions

`-verifyctl` on its own is normal certificate infrastructure behaviour. A URL on the command line on
its own is meaningless without the fetch verb. Requiring the verb **and** a URL scheme is what
separates "certutil doing its job against a CA endpoint" from "certutil pulling a file from an
attacker's host" — and then the CA allowlist handles the remainder.

The encode/decode branch doesn't need a second condition, but it does need tuning: the discriminator
in practice is the *output extension*. A decode producing `.cer` or `.pem` is an admin. A decode
producing `.exe`, `.dll` or `.b64` is staging. If your environment has enough certificate work to
make this noisy, add an output-extension condition rather than dropping the branch.

## Severity note

I've rated this medium rather than high on purpose. Both branches have real legitimate analogues,
and the technique is a stage in a chain rather than the payload itself. It earns its place as
context that raises the priority of everything else that host does in the same window — not as a
page-someone alert on its own.
