---
id: 4
title: Keep, hide or drop the map?
labels: [wayfinder:grilling]
mode: decided-unattended
status: closed
assignee: claude-sonnet-5-5 (decided-unattended)
blocked_by: [1, 3]
blocks: [5]
map: ../map.md
---

# #4 Map stance

## Question

Given the OSM research (#1) and the DB Navigator reference (#3), should the app (a) keep a full-screen map, (b) make the map optional behind a "Peta" button (list-first), or (c) drop the basemap and draw only the route diagram? Owner's lean: map optional by default; final call by research and prototype.

## Resolved when

A one-paragraph decision with recommendation, key reason and main trade-off, recorded under `## Resolution`, marked for morning review. Owner is asleep: the parent agent decides.

## Resolution

**Decision (decided-unattended, review in the morning): option (c). Drop the street basemap and remove `maplibre-gl`.**

- **Recommendation** — no full-screen map. Home → Results → Journey detail are list/stepper screens (DB Navigator style). Optional, only after the rest ships: a "Peta rute" button on Journey detail opening a lightweight SVG route diagram (stops + line colour + the 40 KB arterial underlay from `docs/PWA-OFFLINE-STORAGE-SPEC.md`), lazy-loaded, no tiles.
- **Why** — (1) owner does not think a map is needed; (2) tile hangs ("Lie-Fi") in MRT tunnels disappear; (3) $0 cost at any user count; (4) drops the biggest dependency and the biggest source of visual clutter. See [#1](01-map-and-osm-suitability.md), [#3](03-db-navigator-reference.md).
- **Trade-off** — users lose street context for the first/last walking metres. If a street map is ever demanded: Protomaps PMTiles on Cloudflare R2, loaded on demand, never direct OSM tiles.
- **Caveats on #1** (not verified by the decider): the Carto "API key required" claim and the pricing figures need verification before any tile provider is adopted. They do not affect this decision, since no tile provider is adopted.
- **Answer to "is OpenStreetMap a good solution?"** — OSM *data* is excellent. The OSM *tile server* (`tile.openstreetmap.org`) is not allowed for a public production PWA (usage policy, per #1). The current Carto tiles are not a safe long-term choice either.
