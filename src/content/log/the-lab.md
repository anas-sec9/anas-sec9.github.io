---
title: The lab everything here is tested on
date: 2026-07-04
summary: >-
  A Hyper-V build with Splunk, a real domain, a network sensor and an air-gapped malware VM.
  What's in it, why each piece is there, and the two things it still can't do.
tags: [lab, splunk, sysmon, suricata, zeek]
---

Everything published on this site is built and tested on infrastructure I run myself. That's not a
flex — it's the reason I can say a rule fired rather than that it should fire. This is what the
build looks like right now, and where its limits are.

## The hosts

Five machines on Hyper-V, all on an internal switch with no route to anything I care about.

**Splunk.** The collection point. Everything else forwards here — Sysmon and Windows event logs from
the domain hosts, Suricata EVE JSON and Zeek logs from the sensor. This is where a detection either
fires or doesn't, and it's the difference between "lab-validated" and "untested" on every rule in
the [detection library](/detections).

**Domain controller.** A real Active Directory forest (`lab.local`) rather than a workgroup. Worth
the extra setup: a lot of what's interesting about an intrusion is authentication behaviour, and you
can't test any of that against standalone boxes. Also means the victim host is domain-joined, so
process ancestry and logon events look like they would in a real estate.

**Victim workstation.** Domain-joined Windows with Sysmon configured properly and command-line
auditing on. This is what gets attacked. Snapshot before, revert after, every time.

**Kali.** Delivery and the purple-team side. Atomic Red Team runs from here or on the victim
directly, depending on the technique.

**Network sensor.** Suricata and Zeek on a mirrored span, shipping to Splunk. This is the piece
people skip, and skipping it is why so many published rules are endpoint-only. A DNS-tunnelling
implant is invisible to your EDR and obvious to Zeek.

## The malware VM is separate, deliberately

Reverse engineering does not happen on the lab network. That's an isolated FLARE-VM on a host-only
network with FakeNet-NG standing in for the entire internet, so a sample resolves and beacons to me
instead of to its operator. Snapshot before detonation, revert after, no exceptions.

Keeping it off the detection lab costs me the ability to detonate a live sample straight onto
instrumented hosts — which is exactly the gap that has the Phoenix Sigma and Suricata rules sitting
at [untested](/detections/phoenix-delivery-sigma) rather than lab-validated. That's the trade, and
I'd rather have it that way round than the alternative.

## What it still can't do

**No proxy layer.** Which means anything that lives in proxy logs — like the
[Phoenix beacon rule](/detections/phoenix-beacon-proxy-sigma) — can't be validated here yet. Adding
a TLS-terminating proxy is the next build item.

**No real EDR.** Sysmon is excellent telemetry and it is not the same thing as an EDR agent. Rules
written against EDR-specific telemetry can't be tested on this stack, so I don't write them.

Neither of those is hard to fix; both are just work I haven't done. Recording them here so that when
a rule on this site says "lab-validated", you know precisely what lab it was validated on.
