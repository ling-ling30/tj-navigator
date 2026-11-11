---
id: 6
title: How the app computes its own arrival times
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
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
