# ADR 0002: Client-Side Static PWA Architecture and RAPTOR In-Browser Engine

## Status
Accepted (Amended from hybrid model to pure static client-side PWA)

## Context
Commuters in Jakarta require fast, realistic multi-modal journey plans across rail (KRL, MRT, LRT) and bus networks (Transjakarta BRT). In underground MRT stations (e.g., between Bundaran HI and Senayan) and during peak rush-hour platform crowds, cellular connections frequently drop or lag.

As a side project with zero operational budget, maintaining server clusters or continuous edge compute instances introduces hosting costs ($5–$50/mo), rate limits, uptime alerts, and unnecessary complexity.

Because Jakarta's compiled transit graph for Phase 1 (Rail Spine + Transjakarta BRT 1–14) is only ~350 KB (and even the full city network compresses to ~1.5–2.2 MB), modern mobile web browsers can easily store the entire network in IndexedDB and compute RAPTOR journeys in < 8 milliseconds directly inside a Web Worker.

## Decision

1. **Pure Client-Side Static Architecture (Option C / PWA)**:
   - Deploys as a 100% static application hosted on Cloudflare Pages, Vercel, or GitHub Pages ($0/month hosting bill forever, zero database or server infrastructure to maintain).
   - Fully PWA-capable: Installable to iOS/Android home screens, works completely offline in underground MRT stations or airplane mode.

2. **Build-Time Ingestion (Build-Time ETL)**:
   - An offline build script (`scripts/build-graph.ts`) runs at build time (or via weekly GitHub Actions cron).
   - Ingests Transjakarta GTFS, KRL station dictionaries, and MRT/LRT schedules, strips redundant attributes, and outputs a single optimized static JSON asset: `public/data/jakarta-transit-network.json`.
   - The client fetches this file once and stores it in browser IndexedDB / CacheStorage via Service Worker.

3. **In-Browser RAPTOR Routing**:
   - Routing queries execute in a dedicated **Web Worker** off the main browser UI thread.
   - Computes Pareto-optimal multi-modal itineraries (Fastest vs. Fewest Transfers) in 2–8ms with zero UI stutter.
   - Uses a lightweight 2D Spatial KD-tree in memory for walking access to nearby stops and transfer skywalks.

4. **Direct Browser WebSocket for Real-Time Telemetry**:
   - The client connects directly to Transjakarta's public WebSocket broker (`wss://mqtt.tj.co.id:8084/mqtt`) to stream live bus coordinates when viewing active routes or halte arrival boards, requiring zero server-side socket relays.

## Consequences

### Positive
- **Zero hosting cost**: Free static hosting with infinite scaling capacity.
- **Offline first**: Works seamlessly underground in MRT subway tunnels or during mobile data dips.
- **Instant speed**: Sub-10ms search results with zero network roundtrips.
- **Zero operational burden**: No servers to monitor, crash, or keep alive.

### Negative / Trade-offs
- First app visit requires downloading the ~1.5 MB static transit graph (mitigated by background Service Worker caching and showing instant skeletons).
- Any API endpoint with browser CORS gating (like TJ Guest Auth REST token) may need a 10-line serverless relay function or public token cache if direct browser access is blocked.
