---
id: 5
title: What the live bus feed gives, and how good the operator ETA is
labels: [wayfinder:task]
mode: AFK
status: closed
assignee: claude (delegated by owner)
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

## Resolution (Claude, 2026-11-11)

Done by the decider after a first short recording by an agent proved too thin (10 minutes, ETA to the next stop only).

- **Recorder:** `scripts/live-eta/record.mjs` (one read-only connection; positions every 3 s per bus, and every 20 s the operator's ETA to each upcoming stop).
- **Recording:** `scripts/diag/recordings/eta-202611110750.ndjson`, 40 minutes on Wednesday 11 Nov 2026 around 15:00 (off-peak): 3.969 buses, 986.464 positions, 280.678 ETA snapshots, 213 MB, git-ignored.
- **Feed facts:** every route id matches the GTFS; trip ids match GTFS trip ids, so each bus has a route shape; a bus reports about every 4 seconds; the operator's ETA is in whole minutes; the broker drops the connection about every 25 seconds and accepts a re-join.
- **Evaluator:** `npx vite-node scripts/live-eta/evaluate.ts`. Ground truth is the moment a bus comes within 20 m of a stop along its route.

| The bus really arrives in | Cases | Operator: typical / bad | Own speed | Class speed | Traffic cells |
|---|---|---|---|---|---|
| 0–2 min | 24.797 | 0,6 / 8,8 | 0,3 / 3,2 | 0,3 / 6,1 | 0,3 / 4,8 |
| 2–5 min | 31.126 | 1,0 / 4,6 | 1,1 / 7,1 | 0,9 / 2,9 | 0,8 / 2,6 |
| 5–10 min | 40.714 | 2,3 / 6,2 | 2,4 / 14,2 | 1,5 / 4,8 | 1,4 / 4,3 |
| 10–20 min | 48.222 | 4,7 / 10,9 | 4,8 / 25,0 | 2,4 / 7,8 | 2,4 / 7,3 |

Minutes of error: typical = median, bad = 90th percentile. The operator's ETA runs optimistic (about 4 minutes early at 10–20 minutes out).

**Limits.** One off-peak afternoon. Only arrivals inside the recording are scored. A peak-hour recording is still needed.
