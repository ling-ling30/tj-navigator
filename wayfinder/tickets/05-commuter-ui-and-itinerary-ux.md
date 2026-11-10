---
id: 5
title: Commuter Journey Planner UI/UX: Mobile-first itinerary flow & map canvas
labels: [wayfinder:prototype]
mode: HITL
status: closed
assignee: Antigravity
blocked_by: []
blocks: []
map: ../map.md
---

# #5 Commuter Journey Planner UI/UX: Mobile-first itinerary flow & map canvas

**Type:** prototype · **Mode:** HITL · **Blocked by:** — · **Blocks:** —

## Question

How should the commuter experience be structured on web and mobile browsers to match the clarity of DB Navigator / Citymapper while optimizing for Jakarta commuters?

## Context

A commuter in Jakarta typically needs:
1. **Search Input**: Quick origin / destination search with autocomplete for halte, stations, and major Jakarta landmarks (e.g., "Bundaran HI", "Monas", "SCBD", "Blok M").
2. **Itinerary Comparison List**: Clear card summaries comparing total duration, departure time, transfer count, modes used (colored transit pills: BRT Blue, MRT Red, KRL Green, LRT Orange), and estimated fare.
3. **Step-by-Step Leg Details**: Detailed accordion/sheet showing:
   - Walk to halte/station (duration, meters).
   - Boarding vehicle (corridor number, destination headsign, platform/bay).
   - Number of stops passed.
   - Transfer directions (e.g. "Take escalator up to Corridor 13 platform").
   - Alighting stop and exit guide.
4. **Interactive Map View**: Route polyline overlay on MapLibre / Leaflet with stop markers and live bus indicator.

## Resolved when

A working UI prototype or interactive layout specification is validated for:
1. Mobile layout (bottom sheet + full map background vs dedicated page flow).
2. Transit mode badges, line colors, and leg iconography.
3. Rapid origin/destination selection UX.

## Resolution

- **Visual Prototype Created in FigCraft**: Saved to `design/tj-navigator.figcraft` and exported to 2x resolution PNGs:
  - `design/screen-01-home.png`: Search Card with origin/destination pins, live status chip, Live Bus Radar with live MQTT ETA countdown (`~3 min`, `2 stops away`, landmark context), and Nearby Departures board.
  - `design/screen-02-results.png`: Peek vector map canvas paired with draggable Pareto Itinerary Drawer (Fastest, Direct, and Cheapest with inside-station badges).
- **Design System Tokens**: High-contrast dark-mode palette (`#0D1117` obsidian canvas, `#161B22` cards, `#0066FF` BRT Blue, `#00A859` KRL Green, `#EE3124` MRT Red, `#F58220` LRT Orange, `#00E676` Live Telemetry).
- **Commuter Guidance Badges**: `Covered Skywalk`, `Step-Free / Elevator`, `Inside Station Transfer (No Re-tap)`, and `Live Bus ~3m`.
- **Full Specification**: [docs/COMMUTER-UI-UX-SPEC.md](../../docs/COMMUTER-UI-UX-SPEC.md).
