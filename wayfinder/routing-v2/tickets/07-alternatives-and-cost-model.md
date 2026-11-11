---
id: 7
title: How alternatives are found, and what makes a route good
labels: [wayfinder:grilling]
mode: HITL
status: closed
assignee: claude (delegated by owner)
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

## Resolution (decided by Claude under the owner's delegation, 2026-11-11)

Built and measured, so the decision is the code plus these numbers. Detail: `docs/ROUTING-V2-SPEC.md` section 4.

- **Cost:** ride × 1, wait × 1, walk × 2, plus 300 s per change (120 s inside a paid area). OpenTripPlanner's documented defaults, from the alternatives research.
- **Search:** round-based line scanning by pattern position; at most one walk between two rides; no boarding the opposite direction of the line just left; a line that carries on from its terminus as a new pattern is the same ride, not a change (the feed splits corridor 1 at Kali Besar).
- **Options:** four profiles (balanced, fastest, fewest transfers, least walking) and up to two re-runs that make the lines already shown 1,5 times costlier.
- **Filter chain:** duplicates, 85 % similarity, cost limit 1,5 × best + 15 min, dominance on time, changes, walking and fare, at most five.
- **Common lines:** pooled after the search for the real boarding and alighting stops, within one fare class; during the search only patterns of the same line pool.
- **No separate circuity filter:** distance-based time already brings p90 circuity to 1,92.

Measured on 300 random pairs at least 3 km apart (weekday 08:00), old engine → new engine: 2+ options 32 % → 90 %; 3+ options 0,3 % → 70 %; circuity p90 2,73 → 1,92; no empty answers; full query p95 40 ms.

**Trade-off.** Options come from a fixed set of profiles, not from a full multi-criteria search, so an unusual trade-off between criteria can be missed. In exchange the search is simple, fast and each option has a reason to exist.
