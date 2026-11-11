---
id: 2
title: Which technique gives several different options on a headway network in a browser
labels: [wayfinder:research]
mode: AFK
status: open
assignee:
blocked_by: []
blocks: [7]
map: ../map.md
---

# #2 Which technique gives several different options on a headway network in a browser

## Question

Our engine runs in a Web Worker on about 8.000 stops, 440 routes and 53.000 walking transfers, with no per-trip timetable for most buses (headway + per-hop times). Which technique gives 3–5 genuinely different, sensible options per query in well under 150 ms on a mid-range phone?

## Cover (primary sources: papers, official docs, source code; link each)

- Candidates: McRAPTOR (arrival, transfers, walking, fare); several single-criterion runs with different cost profiles; penalty or route-exclusion re-runs for diverse alternatives; range queries (rRAPTOR), which need timetables.
- How OpenTripPlanner 2 does it: Raptor search, generalized cost, itinerary filter chain (group by similarity, remove much-worse results), and its handling of `frequencies.txt`.
- Headway networks: expected waiting time, combining routes that share a stop pair (common lines), and what breaks RAPTOR's dominance rule when waiting is an expectation.
- Generalized cost: typical weights for walking, waiting and transfers; limits such as maximum walk and consecutive walks; filters that remove silly itineraries.
- A recommendation for our constraints with expected run time, and what not to build.

## Resolved when

A comparison table and a recommendation under `## Resolution` (≤ 200 lines) with sources. Read `src/lib/router/raptor.ts` and `journey-planner.ts` first so the advice fits the code.
