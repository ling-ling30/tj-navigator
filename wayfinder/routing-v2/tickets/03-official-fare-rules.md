---
id: 3
title: Official fare rules for every operator
labels: [wayfinder:research]
mode: AFK
status: open
assignee:
blocked_by: []
blocks: [9]
map: ../map.md
---

# #3 Official fare rules for every operator

## Question

What are the current official fare rules a Jakarta planner must apply, and what does the Transjakarta GTFS already encode?

## Cover

- From the raw GTFS (`tmp_gtfs.zip`: `fare_attributes.txt`, `fare_rules.txt`, `transfers.txt`): every fare id, price, `transfers`, `transfer_duration`, and which routes map to which fare (regular, premium, free). List the premium and free routes by short name.
- From live primary sources (official operator or government pages, or reputable news quoting them, 2025–2026; link each): Transjakarta flat fare and the conditions for a free transfer; fares for non-BRT, Mikrotrans, Transjabodetabek and Royaltrans routes; the JakLingko integrated tariff (base, per km, cap, time window, operators included, how to qualify); KRL distance tariff; MRT Jakarta and LRT Jakarta / LRT Jabodebek tariffs.
- Compare with `src/lib/fare/fare-engine.ts` and `docs/FARE-ENGINE-SPEC.md`: list every rule the engine gets wrong, with an example trip (two and three consecutive Transjakarta legs are suspected to be overcharged).

## Resolved when

A rule table under `## Resolution` with a source link per rule and a mismatch list. A rule not confirmed from an opened source is marked "needs verification". Never invent a number.
