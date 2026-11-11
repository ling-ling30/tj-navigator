---
id: 5
title: What the live bus feed gives, and how good the operator ETA is
labels: [wayfinder:task]
mode: AFK
status: open
assignee:
blocked_by: []
blocks: [6]
map: ../map.md
---

# #5 What the live bus feed gives, and how good the operator ETA is

## Question

Our own arrival times must beat the ones the operator already publishes, or they are not worth building. What does the feed contain, and how accurate is its own ETA?

## Measure (scripts in `scripts/diag/`, names starting `live-`; one read-only connection, at most 30 minutes)

- The feed (`/mobile_armada/#` on the broker in `docs/FEASIBILITY.md`; see the live bus speeds ticket in `wayfinder/routing-v2`): fields, update interval per vehicle, share of vehicles with a route and trip that match the GTFS, position jitter, vehicles that stand still for long.
- Record a session to a file (git-ignored) so it can be replayed.
- From the recording: for each vehicle and its `next_gate`, the moment it really reached that halte, against the feed's `eta` at 10, 5 and 2 minutes before. Error distribution per service class.
- The same for a simple estimate of our own: distance along the route to the halte divided by the vehicle's recent speed. Is it already better or worse than the feed's ETA?

## Resolved when

Numbers under `## Resolution`: feed facts, the operator ETA error, the naive estimate's error, the recording file and the replay script.
