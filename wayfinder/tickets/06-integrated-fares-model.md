---
id: 6
title: Multi-modal fare calculation & JakLingko tariff capping rules
labels: [wayfinder:research]
mode: AFK
status: open
assignee:
blocked_by: [2]
blocks: []
map: ../map.md
---

# #6 Multi-modal fare calculation & JakLingko tariff capping rules

**Type:** research · **Mode:** AFK · **Blocked by:** #2 · **Blocks:** —

## Question

What is the precise mathematical and business rule specification for calculating fares across Transjakarta, KRL, MRT, and JakLingko integrated tariffs?

## Context

Jakarta transit fares follow distinct tariff schemes:
1. **Transjakarta**: Flat fare of Rp 3.500 (or Rp 2.000 during early morning 05:00–07:00 WIB promo hours on some corridors). Free transfers inside the BRT network when staying within the paid gate area. Mikrotrans / JakLingko angkot routes are Rp 0 with mandatory card tap.
2. **KRL Commuterline**: Progressive distance-based fare: Rp 3.000 for the first 25 km + Rp 1.000 for every additional 10 km.
3. **MRT Jakarta**: Station-to-station fare matrix: Base fare Rp 3.000 + ~Rp 1.000 per additional station, capping at Rp 14.000 for Lebak Bulus <-> Bundaran HI.
4. **LRT Jabodebek & LRT Jakarta**: Distance-based / flat matrix with government subsidies.
5. **JakLingko Integrated Tariff**: Multi-modal journeys combining Transjakarta + MRT + LRT within 180 minutes have a maximum ceiling cap of **Rp 10.000** (starting base fare Rp 2.500 + Rp 250 / km).

## Resolved when

A research document specifies:
1. Exact tariff formulas and pricing lookup tables for all 4 modes.
2. The JakLingko 3-hour transfer window capping algorithm.
3. Edge cases (e.g. out-of-station transfers vs inside-gate transfers).

## Resolution

_(empty — written by the session that claims and closes this ticket)_
