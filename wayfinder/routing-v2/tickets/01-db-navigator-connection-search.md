---
id: 1
title: How DB Navigator lets a traveller search and choose connections
labels: [wayfinder:research]
mode: AFK
status: open
assignee:
blocked_by: []
blocks: [6, 8, 11]
map: ../map.md
---

# #1 How DB Navigator lets a traveller search and choose connections

## Question

What exactly does DB Navigator (and bahn.de, same engine) offer when searching and choosing a connection, and which of it should a headway-based Jakarta planner copy, adapt or skip?

## Cover (from live sources you actually open; link each)

- Search inputs: origin/destination types, depart-at vs arrive-by, via stops.
- Transport-mode selection ("Verkehrsmittel"): which toggles exist, multi-select behaviour, presets such as local transport only.
- Options: direct connections only, maximum transfers, transfer time, walking speed/distance, accessibility.
- The connection list: what each row shows, default ordering, "earlier" and "later", how many rows, how alternatives that differ only slightly are handled, labels such as fastest.
- What happens when the chosen modes or options give no connection.
- What is publicly documented about the engine behind it (HAFAS): multi-criteria search, criteria used.

## Resolved when

A behaviour sheet under `## Resolution` (≤ 200 lines): each behaviour with its source link, then a copy / adapt / skip table for Jakarta. Anything not confirmed from a source is marked "needs verification".
