---
id: 7
title: How alternatives are found, and what makes a route good
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
blocked_by: [2, 4, 6]
blocks: [10, 12]
map: ../map.md
---

# #7 How alternatives are found, and what makes a route good

## Question

How does the engine produce 3–5 genuinely different options, and which cost model makes it prefer the route a commuter would call direct?

## Starting position (charting hypothesis, not a decision)

**Cost model.** Keep the round-based search (the number of transfers comes for free) but minimise a generalized cost in seconds, not raw arrival time:

- riding time × 1,0 (a per-mode factor is allowed in a profile)
- waiting time × 1,5
- walking time × 2,0
- plus 5 minutes per transfer (2 minutes inside a paid area or the same halte)

**Hard limits.** At most one walking transfer between two rides (no chain of walks), transfer walk ≤ 400 m (600 m when relaxed), no re-boarding the same line or its opposite direction, minimum transfer buffer 2 minutes, at most 3 transfers (4 when relaxed).

**Where options come from.** Run the same search with a few profiles: balanced, fastest, fewest transfers, least walking, cheapest, rail first. Then up to 2 diversity re-runs that penalise the main line of options already found.

**Filter chain.** Merge near-identical options (same sequence of common lines); drop an option slower than the best by more than max(15 min, 40 %); drop an option that is worse on every criterion; drop a roundabout option (ride distance > 2,5 × straight line) unless nothing else exists. Keep 3–5, best overall first.

**Rejected for now.** McRAPTOR with four criteria (harder to get right; Pareto sets are large but not diverse). Time-range search (needs a timetable).

## Open points to grill

- The weights: calibrate on the golden commutes, not by taste.
- How strongly "direct" should beat "fast": is +10 minutes acceptable to save one transfer?
- Behaviour when only one sensible option exists (do not pad the list with bad ones).

## Resolved when

Strategy, weights, limits and filters are decided with numbers, backed by the research and the audit.
