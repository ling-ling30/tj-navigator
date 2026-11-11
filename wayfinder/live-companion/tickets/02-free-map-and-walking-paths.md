---
id: 2
title: A free map and walking paths for a public app
labels: [wayfinder:research]
mode: AFK
status: open
assignee:
blocked_by: []
blocks: [7]
map: ../map.md
---

# #2 A free map and walking paths for a public app

## Question

The owner wants a map again, on a free option, that shows people where to walk. Which map stack is really free and allowed for a public app, and how do we draw a walking path?

## Cover (live sources; link each; state the date of each policy page)

- Tiles: OpenFreeMap, Protomaps PMTiles on free object storage, and any other provider whose terms allow a public production app at no cost. Limits, attribution, reliability, offline use. Confirm again that tile.openstreetmap.org is not allowed.
- Rendering: MapLibre GL size and lazy loading, so the map costs nothing until it is opened.
- Walking paths: free pedestrian routing (openrouteservice, Valhalla on FOSSGIS, GraphHopper free tier, client-side routing on an OpenStreetMap extract for Jabodetabek): usage policy, limits, data size. And the fallback: a straight dashed line plus a link that opens walking directions in a maps app.
- Cost at 10.000 and 100.000 monthly users.

## Resolved when

One recommended stack for tiles and one for walking paths, each with key reason, trade-off and source links.
