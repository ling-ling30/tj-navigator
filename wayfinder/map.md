# wayfinder:map — TJ-Navigator Jakarta Public Transit Engine & Journey Planner

> Index, not a store. Each decision lives in its ticket; this map only gists and links.
> Rule: one ticket per session. Claim a ticket by setting `assignee:` in its front matter before working.

## Destination

A complete architectural and implementation blueprint for **TJ-Navigator** (a high-accuracy, open Jakarta public transit journey planner akin to DB Navigator / Citymapper for Transjakarta, KRL, MRT, LRT, and Mikrotrans) ready for vertical-slice implementation.

## Notes

- Domain: Jakarta Multi-Modal Transit (Transjakarta BRT & Non-BRT, KRL Commuterline, MRT Jakarta, LRT Jabodebek/Jakarta, Mikrotrans/JakLingko).
- Stack: Modern TypeScript (Vite/TanStack/Next.js), Leaflet/MapLibre GL for transit maps, Tailwind CSS.
- Key skills for sessions: `wayfinder`, `grilling`, `domain-modeling`, `design-taste-frontend`.
- Tracker: Local markdown in `wayfinder/` — keep `blocked_by` and `blocks` front matter in sync.
- Source data verified in `docs/FEASIBILITY.md`: Transjakarta GTFS (8,143 stops, 241 routes), TJ Guest Auth REST API, TJ MQTT live bus stream (`wss://mqtt.tj.co.id:8084/mqtt`), KRL topology dictionary.

## Decisions so far

- Tracker is local markdown in `wayfinder/`. (charting, 2026-11-10)
- Feasibility confirmed: Ingestion of Transjakarta GTFS + KRL/MRT/LRT topology into unified in-memory graph is viable with sub-15ms search times. (charting, 2026-11-10)
- Transit modeling: Bus routes will be modeled as Headway Windows ("Every X–Y min") with real-time GPS overlays, avoiding fake minute-exact schedules for street traffic. (charting, 2026-11-10)
- ADR 0001 accepted: Unified Multi-Modal Ingestion Pipeline and Transit Graph Model. (charting, 2026-11-10)

## Tickets

| # | Decision | Type | Mode | Blocked by | Status |
| --- | --- | --- | --- | --- | --- |
| [#1](tickets/01-routing-engine-architecture.md) | Routing Engine: In-memory RAPTOR vs Multi-Criteria Dijkstra on Edge / Browser? | grilling | HITL | — | open |
| [#2](tickets/02-multi-modal-gtfs-normalization.md) | How to build the automated multi-modal GTFS ETL pipeline? | research | AFK | — | open |
| [#3](tickets/03-transfer-hubs-and-skywalk-modeling.md) | Physical transfer hubs, skywalks, and walking penalty calibration | grilling | HITL | #1 | open |
| [#4](tickets/04-headway-vs-realtime-telemetry.md) | Real-time MQTT stream integration & ETA estimation model | grilling | HITL | #1 | open |
| [#5](tickets/05-commuter-ui-and-itinerary-ux.md) | Commuter Journey Planner UI/UX: Mobile-first itinerary flow & map canvas | prototype | HITL | #1 | open |
| [#6](tickets/06-integrated-fares-model.md) | Multi-modal fare calculation & JakLingko tariff capping rules | research | AFK | #2 | open |

## Not yet specified

- Offline PWA caching strategy: Compressing graph data for offline underground MRT search.
- Turn-by-turn live navigation mode with push/vibration alarms before transfer stops.
- Crowdsourced disruption and congestion reporting (delay crowdsourcing).
- Multi-language support (Bahasa Indonesia & English).

## Out of scope

- Ride-hailing / Ojol (Gojek / Grab) dispatching or direct booking APIs (TJ-Navigator focuses strictly on public mass transit).
- In-app payment processing or digital ticketing issuance (users tap physical cards / JakLingko app at gates; we calculate fares, not sell tickets).
- Intercity rail outside Jabodetabek (Whoosh HSR and KAI Intercity trains like Argo Parahyangan are out of initial metro scope).
