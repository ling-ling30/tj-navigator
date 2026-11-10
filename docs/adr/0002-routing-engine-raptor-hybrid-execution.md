# ADR 0002: Routing Engine Algorithm (RAPTOR) and Hybrid Execution Model

## Status
Accepted

## Context
Commuters in Jakarta require fast, realistic multi-modal journey plans across rail (KRL, MRT, LRT) and bus networks (Transjakarta BRT). They experience frequent connectivity drops underground (e.g. MRT tunnels) and mobile network congestion during peak rush hour.

Traditional shortest-path algorithms like Dijkstra require artificial cost tuning to balance transfer count against travel time. External routing servers introduce latency, hosting costs, and complete failure when the user lacks cellular data.

## Decision

1. **Routing Algorithm**:
   - Adopt **RAPTOR (Round-Based Public Transit Routing)** as the core transit leg algorithm.
   - Round $k$ computes the Pareto-optimal frontier of trips with at most $k$ transfers without needing heuristic weight matrices.
   - Use a **Spatial KD-Tree** (2D coordinate indexing) to resolve nearest-neighbor walking access from origin/destination coordinates to halte/stations and inter-modal transfer links.

2. **Execution Architecture (Hybrid Model)**:
   - **Primary Execution Target**: **Client-side Web Worker**. The compiled transit network graph (~3.5 MB compressed) is cached in browser **IndexedDB** on first load. Queries execute locally in $<10\text{ ms}$, operating 100% offline in underground MRT stations or airplane mode.
   - **Fallback Execution Target**: **Edge API Route** (e.g. Next.js / Cloudflare Worker) serving identical query results for first-load previews, low-memory legacy devices, or server-side rendering.

3. **MVP Network Scope Boundary**:
   - **Phase 1 (Core Spine)**: All KRL lines (6 lines, ~110 stations), MRT Jakarta (13 stations), LRT Jabodebek & Jakarta (24 stations), Transjakarta BRT dedicated corridors (Corridors 1–14, ~260 halte), and prioritized physical Transfer Hubs.
   - **Phase 2 (Feeders & Microtransit)**: Transjakarta non-BRT street routes and Mikrotrans / JakLingko angkot routes (~200 additional routes).

## Consequences

### Positive
- Sub-15ms route calculations without network latency.
- Full offline capability for commuters in subway stations and low-signal areas.
- Zero server computation costs for active daily users once the static graph payload is cached.
- Clean Pareto-optimal comparisons (Fastest vs. Fewest Transfers vs. Rail-Only).

### Negative / Trade-offs
- Initial load requires downloading a ~3.5 MB transit bundle (stored in IndexedDB with version hash).
- RAPTOR implementation must be maintained in TypeScript (compiled to JS/WASM for both Web Worker and Edge).
