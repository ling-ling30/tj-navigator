---
id: 10
title: Engine prototype on the golden commutes
labels: [wayfinder:prototype]
mode: HITL
status: open
assignee:
blocked_by: [5, 6, 7]
blocks: [12]
map: ../map.md
---

# #10 Engine prototype on the golden commutes

## Question

Does the decided model actually produce the routes a commuter expects? A throwaway engine variant is run on the golden commutes and the owner reacts to the before / after table.

## Resolved when

A prototype script (not production code) prints, per golden commute: today's answer, the new options (lines, changes, duration range, walk, fare), and pass or fail against the accepted line sequences. The owner has reacted, and the weights are adjusted or confirmed.
