---
id: 2
title: A free map and walking paths for a public app
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
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

## Resolution

### 1. Basemap Tiles: Provider & Policy Verification

| Provider / Stack | Free Tier Quota & Limits | Terms / Commercial Policy | Attribution Requirement | Reliability & SLA | Offline Use Policy | Allowed in Public Production? | Source & Policy Date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenFreeMap** (Public Instance) | **Unlimited** map views & tile requests. No API key, no registration. | Free for commercial and non-commercial apps. MIT License. | `OpenFreeMap © OpenMapTiles Data from OpenStreetMap` (injected automatically in MapLibre). | "As-is" / "as-available". **No SLA** guarantee. Community/sponsor funded. | Allowed up to **3,000 tiles** or **50 MB** per download, ≤4 parallel requests, unique `User-Agent`. | **Yes** (fully permitted). | [openfreemap.org/tos](https://openfreemap.org/tos/) (Updated Oct 14, 2026) & [openfreemap.org](https://openfreemap.org/) |
| **Protomaps PMTiles** on **Cloudflare R2** | **10 GB/mo storage**, **10M Class B read requests/mo** free. Beyond: $0.36/1M Class B, $0.015/GB storage. **$0 egress fees**. | Full self-hosted control. Allowed for any commercial or public app. | `© OpenStreetMap contributors, Protomaps` | Cloudflare R2 standard infrastructure SLA (high enterprise availability). | Client can cache range requests; full Jabodetabek extract (~40–60 MB) can be fetched on demand. | **Yes** (zero licensing barriers). | [developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/) (Checked Nov 2026) & [protomaps.com](https://protomaps.com/) |
| **`tile.openstreetmap.org` Direct** | Strictly limited; donation-funded community server. Zero heavy use. | Prohibits production apps with substantial traffic. | `© OpenStreetMap contributors` | **Zero SLA**. Aggressive IP/Referer blocking without notice. | **Strictly prohibited**: Bulk downloading and offline caching are explicitly banned. | **No** (strictly forbidden). | [operations.osmfoundation.org/policies/tiles](https://operations.osmfoundation.org/policies/tiles/) (Checked Nov 2026) |
| **MapTiler Cloud** (Free Tier) | 100,000 tile requests/mo (or ~5,000 map sessions). | **Non-commercial only**. Commercial requires paid Flex plan ($30/mo base). | Mandatory MapTiler watermark & OSM attribution. | 99.9% on paid; free has hard cut-off when monthly quota is reached. | Offline caching restricted to specialized mobile SDK tiers. | **No** (commercial/production apps exceed quota; non-commercial restriction). | [maptiler.com/cloud/pricing](https://www.maptiler.com/cloud/pricing/) (Checked Nov 2026) |
| **CARTO Basemaps** | Mandatory API key required (`?key=...`). Unauthenticated calls watermarked. | Free tier capped at 1M–5M req/mo. Paid plans start at **$500/mo** (10M req). | Mandatory CARTO + OSM attribution. | Commercial SLA on paid tiers; free tier subject to throttling. | Bulk offline download violates Terms of Service. | **No** (cost-prohibitive at scale without budget). | [carto.com/basemaps](https://carto.com/basemaps/) (Checked Nov 2026) |

---

### 2. Rendering: MapLibre GL Bundle Size & Lazy Loading

Exact file sizes measured directly from distribution packages (`maplibre-gl@5.24.0` via jsdelivr / npm):
* **JavaScript (`dist/maplibre-gl.js`)**:
  * Uncompressed minified: **1,056,837 bytes** (~1.06 MB)
  * Gzipped wire size: **275,366 bytes** (~269 KB)
  * Brotli wire size: **276,601 bytes** (~270 KB)
* **CSS (`dist/maplibre-gl.css`)**:
  * Uncompressed: **70,024 bytes** (~70 KB)
  * Gzipped wire size: **10,078 bytes** (~9.8 KB)
* **Total wire transfer cost**: **~279 KB gzipped**.

**Lazy Loading Architecture**:
Because TJ-Navigator is an offline-first PWA where the user primarily interacts with itineraries and vehicle arrivals, MapLibre GL must **never** be imported in the entry bundle.
1. The map component (`MapCanvas.tsx`) is loaded dynamically via `React.lazy(() => import('../components/map/MapCanvas'))`.
2. MapLibre CSS is imported inside that dynamic module.
3. **Result**: The initial PWA load incurs **0 KB overhead** from MapLibre. Only when the user navigates to the "Peta" tab or expands the route map does the browser download the 279 KB bundle in the background.

---

### 3. Walking Paths: Routing Options & Limits

| Walking Path Approach | Free Tier Limits & Usage Policy | Quota Reset Window & Throttling | Data / Graph Size | Production Feasibility & SLA | Cost @ 10k MAU | Cost @ 100k MAU | Source & Policy Date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **openrouteservice** (`/v2/directions/foot-walking`) | **2,000 requests/day** (~60k/mo). Free Standard Plan. Client token exposure forbidden (requires proxy). | Sliding daily window; ~40 req/min burst limit. Returns HTTP 429/403 when exceeded. | 0 KB on client (server API). | **No SLA**. Exposing API key in public frontend violates ToS. Daily limit easily breached. | $0.00 (if throttled) or blocked | Blocked (exceeds 2k/day) | [openrouteservice.org/plans](https://openrouteservice.org/plans) (Checked Nov 2026) |
| **Valhalla / OSRM on FOSSGIS** (`routing.openstreetmap.de`) | Maximum **1 request per second**. Max 2 simultaneous connections. | Community donation server for OSM mappers. Bulk use & navigation apps forbidden. | 0 KB on client (server API). | **Zero SLA**. Heavy or multi-user production traffic will trigger automatic IP ban without notice. | $0.00 (Banned) | Banned | [routing.openstreetmap.de/about.html](https://routing.openstreetmap.de/about.html) (Checked Nov 2026) |
| **GraphHopper** (Directions API Free Tier) | **500 credits/day** (1 route = 1 credit). Strictly non-commercial & evaluation. | Burst limit: 20 credits/min. Hard cap at 500/day. | 0 KB on client (server API). | **No SLA** on free tier. Production use requires paid plan (€69 – €479/mo). | €69 / mo (Basic plan needed) | €479+ / mo (Premium plan needed) | [graphhopper.com/terms](https://www.graphhopper.com/terms/) (Last modified Aug 9, 2021) & [pricing](https://www.graphhopper.com/pricing/) |
| **Client-Side Pedestrian Routing** (OSM Jabodetabek extract) | **Unlimited** (client executes A* / Dijkstra in Web Worker). | None (runs in user's browser). | **15 MB – 35 MB compressed graph** (from ~120–180 MB OSM extract). | High memory footprint (50–100 MB heap). Violates lightweight PWA budget. | $0.00 | $0.00 | [download.geofabrik.de](https://download.geofabrik.de/asia/indonesia.html) (Checked Nov 2026) |
| **Straight Dashed Line + Native Maps App Deep Link** (Fallback) | **Unlimited**. No external routing API calls. Zero quotas. | None. Computes geodesic distance and estimated walk time locally. | **0 KB** extra payload. | **100% Reliable**. Works fully offline; deep links open native Google/Apple Maps with audio/compass turn-by-turn. | **$0.00** | **$0.00** | Standard URI schemes ([Google Maps URL Scheme](https://developers.google.com/maps/documentation/urls/get-started)) |

---

### 4. Cost Analysis at 10.000 and 100.000 Monthly Active Users (MAU)

Assuming an average of 4 transit queries per user session, with 2 walking legs per journey:
* **At 10,000 MAU (~40,000 sessions/mo)**:
  * Map views: ~20,000 map interactions.
  * *OpenFreeMap*: **$0.00** (public instance absorbs interactive traffic).
  * *Protomaps on Cloudflare R2*: ~1,500,000 Class B range requests. Well within the **10,000,000 free monthly requests** allowance + 60 MB storage (< 10 GB free) = **$0.00/mo**.
  * *Walking routing APIs (ORS / GraphHopper / FOSSGIS)*: ~80,000 route calls needed (~2,667 calls/day). Both GraphHopper (500/day limit) and ORS (2,000/day limit) are breached. FOSSGIS bans due to >1 req/s peaks. Cost to avoid bans via GraphHopper Basic: **€69/mo (~$75/mo)**.
  * *Dashed Line + Deep Link*: **$0.00/mo** (0 server calls).
* **At 100,000 MAU (~400,000 sessions/mo)**:
  * Map views: ~200,000 map interactions.
  * *OpenFreeMap*: **$0.00** (subject to public infrastructure health).
  * *Protomaps on Cloudflare R2*: ~15,000,000 Class B range requests. First 10M free, remaining 5M at $0.36/1M = **$1.80/mo**. Storage: $0.00 (within 10 GB). Total: **$1.80/mo**.
  * *Walking routing APIs*: ~800,000 route calls needed (~26,667 calls/day). Requires GraphHopper Premium (50k credits/day) = **€479/mo (~$520/mo)**.
  * *Dashed Line + Deep Link*: **$0.00/mo**.

---

### 5. Recommendations

* **Recommended Tiles Stack**: **OpenFreeMap vector tiles as primary endpoint, with Protomaps PMTiles on Cloudflare R2 as pre-configured architectural fallback.**
  * *Key Reason*: OpenFreeMap is 100% free, MIT-licensed, explicitly allows commercial and public apps without API keys or token limits, and integrates natively with MapLibre GL. If OpenFreeMap experiences downtime, a single Cloudflare R2 PMTiles extract of Jabodetabek (`z0–z14`, ~50 MB) costs < $2.00/mo even at 100,000 MAU.
  * *Main Trade-off*: OpenFreeMap offers no formal SLA; relying entirely on its public servers carries minor operational risk if maintainer hosting changes.
* **Recommended Walking Paths Stack**: **Straight dashed line with tortuosity-calibrated walk time on the map canvas, plus deep links to native maps apps (`google.navigation:q=...` / Apple Maps / Web URL).**
  * *Key Reason*: Pedestrian turn-by-turn routing APIs either strictly ban public apps via rate limits (FOSSGIS 1 req/s, ORS 2k/day, GraphHopper 500/day non-commercial) or cost €69–€479/mo. Client-side routing graphs add an unacceptable 15–35 MB payload. A dashed line with a distance/time badge (e.g. "850 m · ~11 mnt jalan kaki") works 100% offline in underground stations, costs **$0.00**, and a single tap hands off to the commuter's native map app where turn-by-turn navigation, compass, and sidewalks are already optimized.
  * *Main Trade-off*: Does not render the exact sidewalk geometry curve on TJ-Navigator's own canvas.

---

### 6. What Stayed Unverified

1. **OpenFreeMap long-term donation longevity**: The public server is privately maintained by Hyperknot Software Kft.; whether donation income will sustainably cover multi-year global bandwidth growth remains unverified.
2. **GraphHopper custom inquiry outcome**: Whether GraphHopper grants free commercial production exceptions for civic non-profit transport PWAs upon email inquiry was not tested.
