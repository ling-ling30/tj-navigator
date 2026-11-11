---
id: 5
title: Golden commutes: real trips the owner knows, as the benchmark
labels: [wayfinder:task]
mode: HITL
status: open
assignee:
blocked_by: []
blocks: [10]
map: ../map.md
---

# #5 Golden commutes: real trips the owner knows, as the benchmark

## Question

Which real trips define "a good answer"? The engine passed 16 synthetic tests and still failed the owner's own commute, so the benchmark must come from trips a person actually rides.

## Checklist for the owner

For 8–10 trips you know well, give:

1. From and to (stop name, or area).
2. The route you would really take: lines in order, where you change.
3. Roughly how long it takes door to door, at what time of day.
4. Other routes you would also accept, and routes you would never take (and why).

Trip 1 is already known: home near Flavor Bliss → S61 → Kota Bambu or Taman Anggrek → corridor 9 → Penjaringan → walk. Missing: door-to-door time, and whether Taman Anggrek or Kota Bambu is the better change.

## Update 2026-11-11: owner delegated the decisions

The owner's list is welcome at any time but no longer blocks. The benchmark is built from three sources, none invented: (1) the owner's commute; (2) trunk commutes that an official line map settles (for example Blok M → Kota on corridor 1, Lebak Bulus → Bundaran HI on MRT, Bogor → Jakarta Kota on KRL); (3) structural truths from the raw GTFS (two stops on one line must offer that line direct; the lines the feed shows between two stops are the accepted ones). Built after the GTFS audit reports which lines really serve each pair.

## Resolved when

The trips are recorded under `## Resolution` in a form a script can test (origin, destination, accepted line sequences, time range), and saved as `scripts/diag/golden-commutes.json`.
