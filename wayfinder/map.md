# wayfinder:map — TJ-Navigator Jakarta Public Transit Engine & Journey Planner

> Index, not a store. Each decision lives in its ticket; this map only gists and links.
> Rule: one ticket per session. Claim a ticket by setting `assignee:` in its front matter before working.

## Destination

A complete architectural and implementation blueprint for **TJ-Navigator** (a high-accuracy, open Jakarta public transit journey planner akin to DB Navigator / Citymapper for Transjakarta, KRL, MRT, LRT, and Mikrotrans) ready for vertical-slice implementation as a zero-cost, offline-capable static PWA.

## Notes

- Domain: Jakarta Multi-Modal Transit (Transjakarta BRT & Non-BRT, KRL Commuterline, MRT Jakarta, LRT Jabodebek/Jakarta, Mikrotrans/JakLingko).
- Stack: Modern TypeScript (Vite + React / TanStack), Tailwind CSS, Leaflet / MapLibre GL, Web Worker + IndexedDB, deployable as a static PWA to Cloudflare Pages / Vercel ($0/mo hosting).
- Prototyping: FigCraft with MCP for UI components and interactive journey sheets (`design/tj-navigator.figcraft`).
- Key skills for sessions: `wayfinder`, `grilling`, `domain-modeling`, `design-taste-frontend`.
- Tracker: Local markdown in `wayfinder/` — keep `blocked_by` and `blocks` front matter in sync.
- Source data verified in `docs/FEASIBILITY.md`: Transjakarta GTFS (8,143 stops, 241 routes), TJ Guest Auth REST API, TJ MQTT live bus stream (`wss://mqtt.tj.co.id:8084/mqtt`), KRL topology dictionary.

## Decisions so far

- Tracker is local markdown in `wayfinder/`. (charting, 2026-11-10)
- Feasibility confirmed: Ingestion of Transjakarta GTFS + KRL/MRT/LRT topology into unified in-memory graph is viable with sub-15ms search times. (charting, 2026-11-10)
- Transit modeling: Bus routes will be modeled as Headway Windows ("Every X–Y min") with real-time GPS overlays, avoiding fake minute-exact schedules for street traffic. (charting, 2026-11-10)
- [ADR 0001](docs/adr/0001-transit-graph-and-data-ingestion.md) accepted: Unified Multi-Modal Ingestion Pipeline and Transit Graph Model. (charting, 2026-11-10)
- [#1 Routing Engine Architecture](tickets/01-routing-engine-architecture.md): Standardized on in-browser RAPTOR + spatial KD-tree in a Web Worker, Option C (pure static PWA, $0 server cost, offline-capable in MRT tunnels), build-time ETL, covering Rail Spine + BRT 1–14 for MVP. (2026-11-10)
- [#2 Multi-Modal GTFS Normalization](tickets/02-multi-modal-gtfs-normalization.md): Ingestion pipeline, entity namespacing (`tj:`, `krl:`, `mrt:`, `lrt:`), and compact array schema for sub-8ms in-browser RAPTOR traversal documented in [ETL Spec](docs/ETL-TRANSIT-GRAPH-SPEC.md). (2026-11-10)
- [#3 Physical Transfer Hubs & Skywalks](tickets/03-transfer-hubs-and-skywalk-modeling.md): Structured hub model with directional edges, asymmetric vertical buffers, rush-hour peak penalties, and sheltered/step-free flags documented in [ADR 0003](docs/adr/0003-transfer-hubs-and-skywalk-modeling.md) and seeded in `data/seeds/transfer-hubs.json`. (2026-11-10)
- [#4 Real-Time MQTT Telemetry & ETA Engine](tickets/04-headway-vs-realtime-telemetry.md): On-demand multiplexed MQTT WebSocket subscriptions with Page Visibility pausing, 1.5s render throttling, heading-validated polyline snapping, and 3-tier staleness decay documented in [ADR 0004](docs/adr/0004-realtime-telemetry-and-eta-engine.md). (2026-11-10)
- [#5 Commuter Journey Planner UI/UX](tickets/05-commuter-ui-and-itinerary-ux.md): Mobile prototype designed in FigCraft, documented in [UI/UX Spec](docs/COMMUTER-UI-UX-SPEC.md), and exported to `design/screen-01-home.png` and `design/screen-02-results.png`. (2026-11-10)
- [#6 Multi-Modal Fare Engine](tickets/06-integrated-fares-model.md): Mathematical formulas for Transjakarta, KRL, MRT, LRT, and JakLingko Rp 10.000 / 3-hour tariff capping documented in [Fare Spec](docs/FARE-ENGINE-SPEC.md). (2026-11-10)

## Tickets

| # | Decision | Type | Mode | Blocked by | Status |
| --- | --- | --- | --- | --- | --- |
| [#1](tickets/01-routing-engine-architecture.md) | Routing Engine: In-memory RAPTOR vs Multi-Criteria Dijkstra on Edge / Browser? | grilling | HITL | — | closed |
| [#2](tickets/02-multi-modal-gtfs-normalization.md) | How to build the automated multi-modal GTFS ETL pipeline? | research | AFK | — | closed |
| [#3](tickets/03-transfer-hubs-and-skywalk-modeling.md) | Physical transfer hubs, skywalks, and walking penalty calibration | grilling | HITL | — | closed |
| [#4](tickets/04-headway-vs-realtime-telemetry.md) | Real-time MQTT stream integration & ETA estimation model | grilling | HITL | — | closed |
| [#5](tickets/05-commuter-ui-and-itinerary-ux.md) | Commuter Journey Planner UI/UX: Mobile-first itinerary flow & map canvas | prototype | HITL | — | closed |
| [#6](tickets/06-integrated-fares-model.md) | Multi-modal fare calculation & JakLingko tariff capping rules | research | AFK | — | closed |
| [#7](tickets/07-pwa-offline-storage.md) | Offline PWA Service Worker & IndexedDB caching strategy | research | AFK | — | open |
| [#8](tickets/08-vertical-slice-roadmap.md) | Slicing the architecture into executable implementation tickets | task | HITL | #7 | open |

## Not yet specified

- Turn-by-turn live navigation mode with push/vibration alarms before transfer stops.
- Crowdsourced disruption and congestion reporting (delay crowdsourcing).
- Multi-language support (Bahasa Indonesia & English).

## Out of scope

- Ride-hailing / Ojol (Gojek / Grab) dispatching or direct booking APIs (TJ-Navigator focuses strictly on public mass transit).
- In-app payment processing or digital ticketing issuance (users tap physical cards / JakLingko app at gates; we calculate fares, not sell tickets).
- Intercity rail outside Jabodetabek (Whoosh HSR and KAI Intercity trains like Argo Parahyangan are out of initial metro scope).
- Heavy dedicated backend routing servers (e.g. self-hosted Java OTP / Docker clusters).
