---
id: 8
title: Mode choice and travel options
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
blocked_by: [1]
blocks: [11, 12]
map: ../map.md
---

# #8 Mode choice and travel options

## Question

Which modes can the traveller choose, which other options exist, and what happens when the choice gives no good route?

## Starting position (charting hypothesis, not a decision)

- **Mode chips, multi-select, all on by default:** BRT (koridor), Bus non-BRT (feeder, Transjabodetabek), Mikrotrans, KRL, MRT, LRT. Any combination, for example BRT + KRL.
- **A hard filter inside the search**, not a filter on the results afterwards.
- **Never silently ignore the choice.** If the chosen modes give nothing, or something much worse, show what exists with the chosen modes (or the closest approach) and one clearly labelled suggestion with other modes: "Lebih cepat 25 mnt dengan KRL".
- **Options sheet** (DB Navigator "Optionen"): maximum transfers (langsung saja / 1 / 2 / bebas), walking (sedikit / normal / jauh), transfer time (normal / longgar), avoid premium buses. Remembered between visits.

## Open points to grill

- Is "Bus non-BRT" one group or split (feeder, Transjabodetabek, premium)?
- Should a preference be soft (prefer rail) as well as hard (only rail)?
- Where the chips live: home screen, results screen, or both.

## Resolved when

Mode groups, options, defaults and the fallback rule are decided, with the Bahasa Indonesia wording.
