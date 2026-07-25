---
title: What the maturity labels on this site actually mean
date: 2026-07-11
summary: >-
  Four labels, and the specific evidence each one requires. Written down so I can't quietly
  promote a rule because I feel good about it.
tags: [detection-engineering, methodology]
---

Every rule in the [detection library](/detections) carries a maturity label. They're not vibes — each
one has a specific bar, and the bar is written here so that future-me can't move it.

## Untested

Written from behaviour I confirmed, and it parses or compiles. Nothing more. I have not watched it
fire against telemetry.

Most rules published anywhere on the internet are this, and most of them don't say so. A rule at
this level is a starting point for your own engineering, not something to deploy.

## Sample validated

The rule has been run against real samples and produced the right verdict on each — including at
least one sample I did not produce myself, and at least one benign control that it stayed quiet on.

This is where most YARA lives. It's a genuinely useful bar: it catches the failure mode where you
write a rule that only matches the one file on your desk. What it doesn't cover is behaviour in a
live pipeline — throughput, the actual file corpus you'll scan, whether your scanner has the modules
the rule imports.

## Lab validated

The rule fired end to end on my own stack — the technique was executed on an instrumented host, the
telemetry reached Splunk, and the rule alerted on it. Plus a benign baseline measured on the same
host, with the false-positive count written down rather than asserted.

The [Squiblydoo rule](/detections/regsvr32-squiblydoo) is the example: one alert on the attack, zero
across five benign regsvr32 executions, and I published the table.

The honest limit is that my baseline is one host over a short window. A rule at this level has
proven its logic, not its volume.

## Production

Running in a live environment, with tuning applied against real traffic over time.

Nothing on this site is at this level, because nothing on this site is running in an environment I
can publish about. If you see this label appear later, it will be because something changed and I'll
say what.

## Why bother

Because the gap between "I wrote a rule" and "this rule works" is where most detection content
quietly lives, and readers can't see it from the outside. A YARA rule anchored on the C runtime and
a YARA rule anchored on the malware's own code look identical in a blog post. The only difference a
reader can check is whether the author told them which one they were looking at.

I got this wrong once already — my first attempt at the
[Phoenix core rule](/detections/phoenix-core-yara) anchored on MSVC boilerplate and would have
matched every Visual Studio binary in existence. A friend caught it. These labels exist so the next
one gets caught by me first.
