---
id: 8
title: Trip mode: telling the traveller what to do next
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
blocked_by: [4]
blocks: [9]
map: ../map.md
---

# #8 Trip mode: telling the traveller what to do next

## Question

What does "subscribe to a ride" do, step by step, and on which platform path?

## Starting position (charting hypothesis, not a decision)

- The traveller taps "Mulai perjalanan" on an option. The app follows the trip with the phone's location and the live arrival times.
- Alerts: bus arriving, board now, two stops before the change, get off now, walk to the next stop, destination near, and "you missed the change, here is the new plan".
- Step one on the web: screen kept on, voice or sound and vibration, notifications while the page is alive. Step two only if needed: a native wrapper for alerts with the screen locked.

## Resolved when

The alert list, the wording, and the platform path are decided.
