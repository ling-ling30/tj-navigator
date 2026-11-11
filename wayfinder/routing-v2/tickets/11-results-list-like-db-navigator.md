---
id: 11
title: Results list like DB Navigator
labels: [wayfinder:prototype]
mode: HITL
status: closed
assignee: claude (delegated by owner)
blocked_by: [1, 6, 8]
blocks: [12]
map: ../map.md
---

# #11 Results list like DB Navigator

## Question

How are the options listed, ordered and labelled so a commuter can compare them at a glance, the way DB Navigator's connection list works?

## Starting position (charting hypothesis, not a decision)

- Each row: duration (range), the chain of lines as a bar, number of changes, total walking, fare, and when the first vehicle comes ("tiap 5 mnt" or a live ETA).
- Default order: best overall first. Sort choices: tercepat, transit paling sedikit, termurah, jalan paling sedikit.
- DB Navigator's "earlier / later" is not copied for headway legs; it returns if rail timetables are adopted.
- The mode chips stay visible on the results screen, so the traveller can change modes and re-search in place.

## Resolved when

A rough screen (prototype) has been shown to the owner and the row anatomy, ordering and labels are decided.

## Resolution (decided by Claude under the owner's delegation, 2026-11-11)

Decided without a throwaway prototype: the owner reacts to the real screens. The build brief is [UI-SLICE-BRIEF.md](../UI-SLICE-BRIEF.md).

- **Row:** times, the typical duration in bold with the range beside it, the chain of legs with pooled lines ("9 · 9A · 9E"), then changes, total walking, the fare as an estimate, and how often the first vehicle comes.
- **Order:** best overall first (the engine's order). Sort choices: tercepat, transit paling sedikit, termurah, jalan paling sedikit. Badges mark which option wins on what.
- **Mode chips on the results screen**, so a change searches again in place. One labelled suggestion row when a switched-off mode is clearly faster. A banner when the chosen modes gave nothing.
- **Options sheet:** maximum transfers, walking, transfer time, premium buses. The old client-side "max transfers" filter goes: it is a travel option now.
- **No "earlier / later"**: buses run on headways. It returns if rail timetables are adopted.
- **Radar entry points removed for now:** the live feed is not connected (the app listens on a topic that never publishes) and the radar screen shows sample data. It comes back with the live-data work.

**Trade-off.** Dropping the radar buttons removes a screen the earlier build advertised. Showing sample data as live would be worse.
