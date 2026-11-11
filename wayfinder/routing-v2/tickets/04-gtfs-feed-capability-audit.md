---
id: 4
title: What the raw GTFS can support, and how wrong today's engine is
labels: [wayfinder:task]
mode: AFK
status: open
assignee:
blocked_by: []
blocks: [6, 7]
map: ../map.md
---

# #4 What the raw GTFS can support, and how wrong today's engine is

## Question

Before deciding the time model and the search, we need numbers: what does the raw Transjakarta GTFS really contain, and how far is today's engine from it?

## Measure (scripts in `scripts/diag/`, read-only on `src/` and `public/`)

**Feed capability**
- `stop_times.txt`: are per-stop times present for every trip? Implied speed per hop (using stop coordinates): distribution, absurd hops. Do times differ between peak and off-peak trips of the same route?
- `frequencies.txt`: routes covered, headway by time window, first and last departure; routes with no frequency row.
- `calendar.txt` and `trips.txt` service ids: which routes run only on weekdays, weekends, or Sundays.
- Stop patterns per route and direction: how many distinct patterns, how many stops are lost by keeping only the most frequent one. Loop patterns (a stop twice in one trip).
- Common lines: for stop pairs served by several routes in the same order, how many routes share them (for example 9, 9A, 9E).
- Size cost of adding per-hop seconds, headway windows and service hours to the compiled graph.

**Baseline of today's engine**
- In-vehicle time error against GTFS times: median, p90, worst 15 routes; S61, S11, S12, S14, corridors 1 and 9 named.
- Options per query over 300 origin–destination pairs: how many return 1, 2, 3+ genuinely different options (different set of lines).
- Circuity: (ride + walk distance) ÷ straight line, legs, walking transfers in a row; 20 worst cases with the cause.
- Query time p50 and p95.
- The owner's commute, stop to stop and point to point, every leg printed.
- Hand-written routes in `scripts/build-graph.ts` that duplicate real GTFS routes, and queries where the invented one wins.

## Resolved when

Numbers and tables under `## Resolution`, with the script path for each. No fixes in this ticket.
