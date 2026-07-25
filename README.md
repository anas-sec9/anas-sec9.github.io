# Ground Truth

### **[anas-sec9.github.io](https://anas-sec9.github.io)**

Malware reverse engineering and detection engineering, written up in full.

Every rule published here came out of a sample I opened myself, not a vendor feed I copied. Where I
couldn't prove something, it says so on the page. That's the whole editorial position, and it's what
the name refers to.

I'm Anas Abdulalieem — detection engineer, mostly SOC work: writing and tuning rules, chasing alerts
to ground, building the decoders and correlation logic that make the noisy parts quieter.

---

## A few things I found

**Phoenix isn't AES-encrypted.** Every published write-up on MuddyWater's 2025 backdoor described it
that way. I went in expecting to crack AES and checked five separate ways for its fingerprints —
AES-NI opcodes, S-boxes, `BCrypt`, `CALG` constants, ChaCha. None of them are there. The payload is
a repeating 32-byte XOR with the key sitting in plaintext at the top of `.data`, plus a byte-stuffing
layer that pushed the entropy high enough to sell the story.
→ [Phoenix, Unmasked](https://anas-sec9.github.io/research/phoenix-unmasked)

**BugSleep isn't packed either.** Every triage tool shouted "packed" at 7.81 entropy with a
KERNEL32-only import table. There's no packer. The cipher is subtracting 6 from every byte, done
sixteen at a time with `PSUBB`. Once I proved that, I could decrypt the whole family statically
without ever running a sample.
→ [BugSleep, Unmasked](https://anas-sec9.github.io/research/bugsleep-unmasked)

**Then I detonated it against a real stack.** Live sample, sinkholed C2, Sysmon into Splunk, Suricata
on a mirrored span, a commercial EDR on the victim. My injection rule fired 18 times and Suricata
caught the beacon — but two rules stayed completely silent while their artifacts sat on disk. That
turned out to be a telemetry gap in my own Sysmon config, not a detection failure, and finding it was
worth more than the rules that worked.
→ [Catching MuddyWater Live](https://anas-sec9.github.io/research/catching-muddywater-live)

---

## What's on the site

**[Research](https://anas-sec9.github.io/research)** — full teardowns. How the sample was unpacked,
what the config actually said, and which published claims I could and couldn't reproduce.

**[Detections](https://anas-sec9.github.io/detections)** — Sigma, YARA, Suricata and Splunk rules,
filterable by format, surface and maturity. Each one states the telemetry it needs to fire and the
false positives I actually hit.

**[Actors](https://anas-sec9.github.io/actors)** — tracked adversaries, with attribution confidence
stated explicitly. Where a claim is inherited from published reporting rather than reproduced, the
page says so.

**[Log](https://anas-sec9.github.io/log)** — working notes. Lab builds, hunts that went nowhere,
rules that fell over in testing.

## The maturity labels are the point

Every rule carries one of four labels, and each has a specific evidentiary bar:

| Label | What it means |
| --- | --- |
| `production` | Running live with tuning applied against real traffic |
| `lab-validated` | Fired end-to-end on my own instrumented stack, with a measured benign baseline |
| `sample-validated` | Matches real samples including ones I didn't produce; clean on a benign control |
| `untested` | Written from observed behaviour, syntax checked only |

The gap between "I wrote a rule" and "this rule works" is where most detection content quietly
lives, and a reader can't see it from the outside. A YARA rule anchored on the C runtime and one
anchored on the malware's own code look identical in a blog post — the only difference you can check
is whether the author told you which they were showing you.

Nothing here is at `production`, because nothing here runs somewhere I can publish about. The
BugSleep set is `lab-validated`; most of the Phoenix set isn't, because that detonation is still on
the bench. The labels say which is which, and
[the definitions are public](https://anas-sec9.github.io/log/what-untested-means) so I can't quietly
move the bar.

## Raw artifacts

The write-ups are here; the things you'd actually run live alongside them:

- [threat-intel-reports](https://github.com/anas-sec9/threat-intel-reports) — config extractors, YARA,
  Sigma, Suricata, IOC sets, validation reports
- [detection-library](https://github.com/anas-sec9/detection-library) — standalone detections with
  their hypotheses and test cases

---

## This repository

Source for the site. Astro, no theme and no CSS framework — the design system is hand-written in
`src/styles/`, and content is markdown in `src/content/`.

```bash
npm install
npm run dev      # http://localhost:4321
```

- [`docs/AUTHORING.md`](docs/AUTHORING.md) — content model, frontmatter schemas, the custom MDX
  components, how to change the design tokens
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — GitHub Pages setup and troubleshooting

Analysis is performed on isolated lab infrastructure; samples are handled offline and C2 traffic is
sinkholed. Published for defensive research only.
