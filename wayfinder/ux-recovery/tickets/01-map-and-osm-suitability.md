---
id: 1
title: Is OpenStreetMap-based tiling a good solution, and which provider if a map stays?
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [4]
map: ../map.md
---

# #1 OSM suitability

## Question

The app currently draws a full-screen MapLibre map using Carto dark raster tiles (OpenStreetMap data). If a map stays, is OSM-based tiling a good solution for a free, public, offline-capable PWA? Compare: `tile.openstreetmap.org` direct, Carto basemaps, self-hosted Protomaps/PMTiles (OSM extract for Jabodetabek), MapTiler/other free tiers, and no basemap (draw only route lines and stops on a plain background).

## Verify from live sources (do not answer from memory)

- Tile usage policy of OSM (heavy use, offline/bulk download, attribution, no SLA).
- Carto basemaps terms for free use and commercial/public apps.
- PMTiles size for the Jabodetabek bbox and how it fits the existing PWA offline spec (`docs/PWA-OFFLINE-STORAGE-SPEC.md`).
- Cost at, say, 10k and 100k monthly users.

## Resolved when

A recommendation (one provider or none) with the key reason, main trade-off, and sources linked in the resolution. Write the resolution under `## Resolution` in this file.

## Resolution

### 1. Provider Comparison & Policy Verification

| Provider / Option | Offline / Caching Feasibility | Terms & Usage Policy Constraints | Cost @ 10k MAU (~50k sessions) | Cost @ 100k MAU (~500k sessions) | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`tile.openstreetmap.org` Direct** | **Prohibited**: Offline bulk pre-caching strictly banned. | [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/): Donation-funded servers. Requires HTTPS, valid custom `User-Agent`, `Referer`, and "© OpenStreetMap contributors" attribution. **Zero SLA**. Heavy/production use or prefetching for offline use is explicitly prohibited and subject to immediate IP/UA ban without notice. | $0 (Non-compliant) | $0 (Banned/Throttled) | **Unusable** for public PWA. |
| **CARTO Basemaps** (Current in `MapCanvas.tsx`) | **Restricted**: Bulk pre-download violates TOS; standard HTTP cache only. | [CARTO Basemap Terms](https://carto.com/basemaps/terms-and-conditions/) & [Basemaps Overview](https://carto.com/basemaps/): **Mandatory API key** (`?key=...`). Unauthenticated requests (current code) receive "API KEY REQUIRED" watermarks or get blocked. Free tier limit: **1M requests/mo** for commercial, **5M requests/mo** for non-commercial. Paid plans start at **$500/mo** (10M req) and **$1,500/mo** (50M req). | $0 (within 1M req if authenticated) | **$500 – $1,500 / mo** (exceeds free tier) | **Unviable** at scale without budget. |
| **MapTiler Cloud** (Free / Flex Tier) | **Restricted**: Offline caching restricted to licensed SDKs; hard quota cap. | [MapTiler Cloud Pricing](https://www.maptiler.com/cloud/pricing/): Free tier allows 100k requests/mo (or 5k map sessions), **non-commercial only**, with mandatory watermark. Exceeding limit results in hard cut-off (maps suspend). Flex tier: $30/mo base (includes 25k sessions) + $2.50 per 1k additional sessions. | ~$92.50 / mo (Flex) | ~$1,217.50 / mo (Flex) | **Cost prohibitive** for a free public tool. |
| **Self-Hosted Protomaps / PMTiles** (Jabodetabek extract) | **Viable via HTTP Range Requests**, but client offline download is heavy. | [Protomaps Docs & Spec](https://protomaps.com/docs/frontends/pmtiles) & [go-pmtiles](https://github.com/protomaps/go-pmtiles): Open format under BSD. Host single `.pmtiles` on Cloudflare R2 ($0 egress fees, $0.015/GB storage, $0.36/M Class B range requests). No third-party API key, no rate limits. | < $1.00 / mo (R2 storage + requests) | ~$5.00 – $15.00 / mo (R2 range requests) | **Best tile provider** if basemap is kept. |
| **No Basemap (Schematic Vector + Arterials)** | **100% Offline-Native** (0ms load from IndexedDB / ServiceWorker). | Zero external dependencies, no third-party tile server terms, no API keys, no attribution requirements. Uses local transit vectors + 40 KB arterial GeoJSON underlay already specified in [`docs/PWA-OFFLINE-STORAGE-SPEC.md`](file:///C:/Users/Ricky/Documents/tj-navigator/docs/PWA-OFFLINE-STORAGE-SPEC.md). | **$0.00** | **$0.00** | **Top Recommendation** |

---

### 2. PMTiles Size Analysis & Offline Spec Fit

* **Jabodetabek Bounding Box (`106.35, -6.75, 107.20, -5.95`)**:
  * Full detail basemap (`z0–z15`): **~200 MB – 450 MB** ([Protomaps builds reference](https://build.protomaps.com/)).
  * Capped detail (`z0–z13/z14`) with client-side overzooming: **~40 MB – 90 MB**.
* **Fit with [`docs/PWA-OFFLINE-STORAGE-SPEC.md`](file:///C:/Users/Ricky/Documents/tj-navigator/docs/PWA-OFFLINE-STORAGE-SPEC.md)**:
  * Section 1 and Section 2.4 define the offline fallback as:
    1. IndexedDB hydration of stops, routes, and shapes (`< 20ms`).
    2. A compressed **~40 KB GeoJSON** of Jakarta's arterial roads (Sudirman-Thamrin, Gatot Subroto, Rasuna Said, Ciliwung River) rendered as subtle hairline underlays (`#FFFFFF08` on dark `#0A0E17` or neutral `#E2E8F0` on light).
  * Forcing mobile commuters in Jakarta (often on prepaid cellular quotas with 1-bar "Lie-Fi" signals in underground MRT stations) to download 40–450 MB of basemap tiles violates offline PWA UX principles.
  * In contrast, the 40 KB arterial GeoJSON + stop coordinates fits entirely in browser cache with zero latency.

---

### 3. Recommendation

**Primary Recommendation: Drop the raster/vector street basemap entirely ("No Basemap") and use a schematic transit canvas with the 40 KB arterial road underlay.**

* **Key Reason**:
  1. **Instant Offline Reliability**: Eliminates the "Lie-Fi" 2.5s tile-hang in underground MRT stations (Dukuh Atas, Bundaran HI, Senayan). The entire canvas renders deterministically in `< 20ms` from IndexedDB and Service Worker cache.
  2. **Zero Operating Cost**: Fixed $0.00/month cost at 0, 10k, or 100k users. Zero risk of service suspension or unexpected $500–$1,200/mo bills.
  3. **Visual Clarity Outdoors**: High-contrast, glare-resistant transit lines and stops without visual clutter from irrelevant alleys, building footprints, and POIs, perfectly aligning with DB Navigator's clean transit-first design.
* **Main Trade-off**:
  * Commuters lose micro-street context for the first/last 50 meters of walking outside a station. (Commuters already use native Google Maps/Apple Maps for walking turns; transit planners are used for corridor/transfer decisions).
* **Fallback (If a full street map is strictly mandated in Ticket #4)**:
  * Use **Protomaps PMTiles hosted on Cloudflare R2**, capped at zoom 14 with client-side overzoom (~50 MB extract), loaded strictly on-demand via HTTP Range Requests (never bulk pre-downloaded). Never use direct OSM tiles or unauthenticated Carto tiles.

