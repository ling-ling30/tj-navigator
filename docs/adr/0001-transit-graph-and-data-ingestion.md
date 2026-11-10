# ADR 0001: Transit Graph Representation and Data Ingestion Strategy

## Status
Accepted

## Context
Jakarta features a multi-modal transit system with diverse operational realities:
- **Transjakarta** publishes an official, verified GTFS bundle (`https://gtfs.transjakarta.co.id/files/file_gtfs.zip`) containing over 8,140 stops, 241 routes, shapes, and trip frequencies, plus a real-time MQTT armada telemetry stream.
- **KRL Commuterline** operates ~110 stations across 6 rail lines with deterministic schedules. Its official mobile API is private, but complete topology and schedule dictionaries are available through open-source adapters.
- **MRT Jakarta & LRT** operate on strict headways (5–10 min) with published station matrices.
- Transferring between systems in Jakarta relies on dedicated pedestrian infrastructure (skywalks, bridges, underground passages).

We need a unified graph representation that can ingest all modes, support fast multi-criteria routing, and run on modern web and edge infrastructure without heavy external transit server dependencies.

## Decision

1. **Unified Multi-Modal Ingestion Pipeline**:
   - Ingest Transjakarta official GTFS directly as the primary bus and BRT network.
   - Inject KRL, MRT, and LRT rail lines as normalized GTFS-compatible routes, stations, and stop times via an ETL builder script.
   - Compile a curated `transfer_hubs.json` representing physical Jakarta interchanges (Dukuh Atas, CSW-ASEAN, Kebayoran, Rawamangun, etc.) as explicit pedestrian transfer edges with calibrated walking duration buffers.

2. **Graph Model**:
   - The compiled multi-modal transit network will be represented as an indexed transit graph:
     - `Nodes`: Halte / Stops and Rail Stations (~8,330 total).
     - `Edges`: Scheduled/Headway Transit Edges (grouped by Route/Pattern) and Pedestrian Transfer Edges.
   - Network payload size is under 15 MB in raw JSON and under 3.5 MB in compressed binary/protobuf, making it trivial to load into server memory (or even browser Web Worker memory).

3. **Routing Separation of Concerns**:
   - **Static Graph Layer**: Handles topological routing (routes, stops, transfers, travel times).
   - **Real-Time Augmentation Layer**: Overlays live Transjakarta bus locations (from MQTT) and status alerts on top of the calculated itineraries without requiring real-time graph re-weighting for every passenger request.

## Consequences

### Positive
- Fully self-contained: No dependency on third-party commercial routing APIs (e.g. Google Transit API or paid routing SaaS).
- Blazing fast response time: In-memory graph traversal executes in < 15ms.
- Deterministic behavior: Easy to test, benchmark, and debug route recommendations.
- Resilient: Works even if live GPS telemetry drops; system gracefully degrades to scheduled headways.

### Negative / Trade-offs
- Static data requires periodic synchronization (e.g., automated weekly cron to check for updated Transjakarta GTFS releases).
- Transfer walking times between complex stations must be maintained and verified against real physical skywalks.
