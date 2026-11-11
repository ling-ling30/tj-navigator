---
id: 6
title: How the app computes its own arrival times
labels: [wayfinder:grilling]
mode: HITL
status: closed
assignee: claude (delegated by owner)
blocked_by: [1, 5]
blocks: [9]
map: ../map.md
---

# #6 How the app computes its own arrival times

## Question

How does the app turn vehicle positions into an arrival time at the traveller's stop, and how is it shown next to the planned time?

## Starting position (charting hypothesis, not a decision)

- Put each vehicle on its route (distance along the pattern), using the shape of the pattern.
- Speed per stretch of road comes from the vehicles that just drove it, so a jam ahead is seen before the bus reaches it. Fall back to the calibrated speed table when no vehicle passed recently.
- Arrival = time for the nearest vehicle that has not passed the stop yet, plus dwell at the haltes between.
- Options are re-ranked with live waits and live riding times while the result is open.
- Trains: timetable unless the rail research finds a live source.
- The measure of success: lower error than the operator's own ETA on the recorded session.

## Resolved when

The model is decided and its error on the recording is reported.

## Resolution (decided by Claude under the owner's delegation, 2026-11-11)

Evidence: [What the live bus feed gives, and how good the operator ETA is](05-bus-feed-and-operator-eta-accuracy.md). Detail: `docs/LIVE-COMPANION-SPEC.md` section 2.

- **Model:** place each bus on its route shape; cut roads into cells of about 165 m with a heading; a cell's speed is what buses actually did there in the last ten minutes (stops and lights included, layovers excluded); arrival = the remaining route at each cell's speed, with the calibrated class speed where no bus passed. Under two minutes the bus's own recent speed takes over.
- **Result:** it beats the operator's ETA at every horizon on the recording, and halves the typical error 10–20 minutes out (2,4 against 4,7 minutes).
- **Trains:** timetable only, labelled as scheduled.
- **Shown as:** the next vehicle per line on a leg, with the wait, the total duration and the order of options recomputed from it.

**Trade-off.** Measured on one off-peak afternoon, where plain class speed is almost as good as the traffic cells. The cells should earn their keep at rush hour; that needs a peak recording to prove.
