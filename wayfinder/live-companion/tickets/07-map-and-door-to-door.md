---
id: 7
title: The map and the door-to-door trip
labels: [wayfinder:grilling]
mode: HITL
status: closed
assignee: claude (delegated by owner)
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

## Resolution (decided by Claude under the owner's delegation, 2026-11-11)

Evidence: [A free map and walking paths for a public app](02-free-map-and-walking-paths.md) and [Finding a place by name without a paid service](03-place-search.md). The decider opened openfreemap.org and confirmed its terms: the public instance is free, commercial use is allowed, there are no limits on views or requests, no key or registration, attribution is required, and there is no service guarantee.

- **Map:** MapLibre GL with OpenFreeMap vector tiles, loaded only when the traveller opens the map from a result, so the list stays fast and works offline. When tiles do not load, the route is still drawn on a plain background.
- **What it shows:** the traveller's position, the walk to the first stop, every ride along its real route shape in its line colour, the changes, the walk to the destination, and later the live vehicles of the lines in use.
- **Walking paths:** a straight dashed line with distance and time, plus a link that opens walking directions in the phone's maps app. Free routing services cap at 500 to 2.000 requests a day, too few for a public app.
- **Place search:** an offline index of about 30.000 named places built from OpenStreetMap (about 380 KB compressed), searched on the device next to stops. No private house numbers. Public geocoders forbid search-as-you-type.
- **First stretch:** a long walk to the first stop shows both figures, for example "Jalan 2 km (30 mnt) atau naik motor sekitar 15 mnt", and a travel option "Naik motor ke halte" plans with a ride to the stop (a time estimate, no booking). The last stretch uses Mikrotrans when the network has it.
- **Order:** fastest first by default, as the owner asked. "Terbaik" (the balanced order) stays as a sort choice.

**Trade-offs.** OpenFreeMap has no service guarantee and lives on donations; the fallback is self-hosted tiles on free object storage. A dashed straight line is not a real footpath. The place index knows landmarks and streets, not every address; "Lokasi saya" and pasted coordinates cover the rest.
