---
id: 7
title: The map and the door-to-door trip
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
blocked_by: [2, 3]
blocks: [9]
map: ../map.md
---

# #7 The map and the door-to-door trip

## Question

How does the map show a whole trip from the traveller's location to a named place, and how are the first and last stretch presented?

## Starting position (charting hypothesis, not a decision)

- The owner asked for the map back (2026-11-11). This reverses "Keep, hide or drop the map?" in the UX recovery map. The map opens from a result and is loaded only then, so the list stays fast.
- It shows: the traveller's position, the walk to the first stop, each ride in its line colour, the changes, the walk to the destination.
- First stretch as two figures: walking and riding (ojek or own motorbike, an estimate, no booking), for example "2 km: jalan 30 mnt, naik motor 15 mnt". The last stretch offers walking or Mikrotrans when the network has it.
- Options ranked by total time by default.
- Destination by place name (place search ticket), by stop, by coordinates or by "Lokasi saya".

## Resolved when

Map behaviour, first and last stretch, ranking and place search are decided.
