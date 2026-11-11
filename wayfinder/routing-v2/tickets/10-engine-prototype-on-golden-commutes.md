---
id: 10
title: Engine prototype on the golden commutes
labels: [wayfinder:prototype]
mode: HITL
status: closed
assignee: claude (delegated by owner)
blocked_by: [5, 6, 7]
blocks: [12]
map: ../map.md
---

# #10 Engine prototype on the golden commutes

## Question

Does the decided model actually produce the routes a commuter expects? A throwaway engine variant is run on the golden commutes and the owner reacts to the before / after table.

## Resolved when

A prototype script (not production code) prints, per golden commute: today's answer, the new options (lines, changes, duration range, walk, fare), and pass or fail against the accepted line sequences. The owner has reacted, and the weights are adjusted or confirmed.

## Resolution (2026-11-11)

The prototype became the engine itself (`src/lib/router/v2`), gated by the benchmark. All golden trips pass. The owner's commute at 07:00 on a weekday returns two options: S11 to Taman Anggrek then corridor 9 (87 min, Rp 7.000) and S61 to Kemanggisan then corridor 9 (101 min, Rp 3.500). The times rest on the provisional speed table and move when the speed tickets report.

The owner's reaction is collected on the finished app instead of on a throwaway table.
