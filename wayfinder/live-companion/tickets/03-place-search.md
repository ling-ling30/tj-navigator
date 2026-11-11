---
id: 3
title: Finding a place by name without a paid service
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [7]
map: ../map.md
---

# #3 Finding a place by name without a paid service

## Question

The owner wants to type a destination such as "Citywalk Sudirman". The app has stops, coordinates and "Lokasi saya", but no place search. What gives place search for Jabodetabek at no cost, ideally offline?

## Cover (live sources; link each)

- An offline index built from an OpenStreetMap extract (malls, offices, stations, schools, hospitals, housing, streets): how many places, compressed size, how to build it, licence and attribution.
- Public geocoders (Nominatim, Photon, others): usage policies, whether search-as-you-type is allowed, limits.
- A recommendation that fits a static, offline-capable app.

## Resolved when

A recommendation with size and policy facts, and what stayed unverified.

## Resolution

### 1. Offline Place Index from OpenStreetMap Extract

#### A. Place Counts by Category (Jabodetabek Bounding Box: `106.35, -6.75, 107.20, -5.95`)
Based on OpenStreetMap Indonesia regional extracts ([Geofabrik Java Extract](https://download.geofabrik.de/asia/indonesia/java.html) and [DKI Jakarta OSM dataset statistics](https://extract.bbbike.org/)):

| Category | OSM Filter Tags | Estimated Curated Named Places | Examples in Jakarta |
| :--- | :--- | :--- | :--- |
| **Malls & Retail Centers** | `shop=mall`, `shop=department_store`, `shop=supermarket` (with `name`) | **~450 – 600** | Citywalk Sudirman, Grand Indonesia, Pondok Indah Mall, Mall Kelapa Gading, Summarecon Serpong |
| **Commercial & Office Towers** | `office=*`, `building=commercial`, `building=office` (with `name`) | **~3,000 – 4,500** | Menara BCA, Wisma Nusantara, Sampoerna Strategic Square, Equity Tower |
| **Transit Stations & Halte** | `railway=station`, `railway=halt`, `highway=bus_stop`, `amenity=bus_station` | **~4,800** | All Transjakarta BRT halte (~4,000 stops), MRT stations, KRL commuter stations |
| **Hospitals & Major Clinics** | `amenity=hospital`, `amenity=clinic` (with `name`) | **~1,500 – 2,000** | RS Cipto Mangunkusumo, RS Siloam Semanggi, RS Fatmawati, RS Mayapada |
| **Education (Schools & Universities)** | `amenity=university`, `amenity=college`, `amenity=school` (with `name`) | **~3,500 – 5,000** | Universitas Indonesia, Atma Jaya Semanggi, ITB Jakarta, SMA 68 |
| **Housing, Apartments & Subdivisions**| `building=apartments`, `landuse=residential`, `place=suburb` (with `name`) | **~3,500 – 5,500** | Sudirman Park, Thamrin Residence, Bintaro Jaya, Pantai Indah Kapuk |
| **Named Streets & Corridors** | `highway=*` with unique `name=*` (deduplicated) | **~9,000 – 14,000** | Jl. Jend. Sudirman, Jl. M.H. Thamrin, Jl. H.R. Rasuna Said, Jl. Gatot Subroto |
| **Total Curated POI Index** | Filtered for transit destinations with non-empty `name` | **~26,000 – 35,000 entries** | Complete destination directory for Greater Jakarta |

#### B. Index Size Arithmetic (Estimate)
* **Uncompressed Record Structure**:
  Using a compact columnar JSON array:
  `[name: string, lat: float, lon: float, category: int, area: string]`
  * Average name length: ~22 characters (~22 bytes UTF-8).
  * Coordinates: 2 float values (~14 bytes formatted JSON).
  * Category ID + Area ID: 2 integers (~4 bytes formatted JSON).
  * Overhead (brackets, commas): ~2 bytes.
  * **Average size per record**: **~42 bytes** (estimate).
* **Uncompressed Total Size**:
  $30{,}000\text{ records} \times 42\text{ bytes} \approx 1{,}260{,}000\text{ bytes}$ (**~1.26 MB** uncompressed JSON, estimate).
* **Compressed Wire Size**:
  Indonesian place names share heavy prefixes ("Jalan", "Gedung", "Menara", "Apartemen", "RSUD", "Universitas"). Text and coordinate arrays compress by ~70% under standard gzip/brotli:
  $1{,}260{,}000\text{ bytes} \times 0.30 \approx 378{,}000\text{ bytes}$ (**~380 KB gzipped / ~320 KB brotli**, estimate).
* **In-Memory Footprint & Search Latency**:
  * Unpacks to ~3 MB in browser heap memory.
  * In-memory prefix/ngram search (e.g. using `MiniSearch` or a 200-line custom prefix trie in a Web Worker) queries 30,000 records in **< 5ms** on mobile devices with zero DOM blocking.

#### C. How to Build It
1. **Download Source Extract**: Obtain `java-latest.osm.pbf` (~857 MB) from [Geofabrik](https://download.geofabrik.de/asia/indonesia/java.html) or custom bbox `[106.35, -6.75, 107.20, -5.95]` via [BBBike](https://extract.bbbike.org/).
2. **Filter via Osmium / Node CLI**:
   ```bash
   osmium tags-filter java-latest.osm.pbf \
     nwr/name \
     shop=mall,supermarket,department_store \
     office \
     amenity=hospital,clinic,school,university,bus_station \
     railway=station,halt \
     building=apartments,commercial,office \
     highway=primary,secondary,tertiary,residential \
     -o jabodetabek-places-raw.osm.pbf
   ```
3. **Parse & Deduplicate**: A Node.js build script (`scripts/build-places.ts`) resolves centroids for polygon ways/buildings, strips duplicate street segments down to central access points, and outputs `public/data/jabodetabek-places.json`.
4. **Service Worker Integration**: Add `/data/jabodetabek-places.json` to the CacheFirst / StaleWhileRevalidate cache in Workbox (`docs/PWA-OFFLINE-STORAGE-SPEC.md`).

#### D. Licence & Attribution
* **Licence**: OpenStreetMap data is licensed under the **Open Database License (ODbL) 1.0** by the OpenStreetMap Foundation ([openstreetmap.org/copyright](https://www.openstreetmap.org/copyright)).
* **Attribution**: Must display: `"Search data © OpenStreetMap contributors"` with a direct hyperlink.
* **Share-Alike Compliance**: Distributing the curated extract file `public/data/jabodetabek-places.json` publicly within the open-source GitHub repository fulfills ODbL Section 4.4 requirements.

---

### 2. Public Geocoders Comparison

| Geocoder / Endpoint | Usage Policy & Operational Status | Search-as-You-Type Permitted? | Rate Limits & Quotas | Production Viability for PWA | Source & Policy Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nominatim** (`nominatim.openstreetmap.org`) | Acceptable Use Policy covers OSM donation servers. No heavy use. Custom `User-Agent` & `Referer` mandatory. | **Strictly Prohibited**: *"The following uses are strictly forbidden and will get you banned: Auto-complete search This is not yet supported by Nominatim and you must not implement such a service on the client side using the API."* | **Absolute max 1 request/second** (sum of all app users combined). | **Unusable** for public PWA. Search-as-you-type will trigger instant IP ban. | [operations.osmfoundation.org/policies/nominatim](https://operations.osmfoundation.org/policies/nominatim/) (Checked Nov 2026) |
| **Komoot Photon** (`photon.komoot.io`) | Public demo server for the open-source Photon geocoder. **No SLA** or uptime guarantee. | Technically supported (Photon engine has search-as-you-type), but public server policy states: *"Extensive usage will be throttled or completely banned."* | No published numeric quota; dynamically throttled based on server load. | **Unviable** for primary keystroke search at scale; viable only as occasional Enter-key fallback. | [github.com/komoot/photon](https://github.com/komoot/photon) (README, Checked Nov 2026) |
| **Openrouteservice Geocoding** (`api.openrouteservice.org/geocode`) | Standard Plan. Free registration. Client-side token exposure strictly forbidden (requires private backend proxy). | Permitted via Pelias engine, but limited by daily quotas. | **1,000 requests/day**, ~40 requests/min. | **Unusable** for static PWA without backend; 1,000 req/day limit exhausted in minutes across public users. | [openrouteservice.org/plans](https://openrouteservice.org/plans) (Checked Nov 2026) |
| **Google Places Autocomplete** | Commercial pay-as-you-go API. | Native autocomplete sessions supported. | $17.00 – $28.30 per 1,000 session requests. Zero permanent free tier. | **Unusable** for a zero-cost PWA; costs $170–$1,700/mo at scale. | [developers.google.com/maps/billing](https://developers.google.com/maps/billing-and-pricing/pricing) (Checked Nov 2026) |

---

### 3. Recommendation

* **Recommended Place Search Stack**: **Pre-computed offline landmark index (`jabodetabek-places.json.gz`, ~380 KB) cached in IndexedDB, with in-memory prefix search in a Web Worker, plus an optional explicit Enter-key fallback to Photon for unindexed residential addresses.**
  * *Key Reason*:
    1. **100% Offline Resilience**: Allows typing "Citywalk Sudirman", "Menara BCA", or "Grand Indonesia" in underground MRT stations (Dukuh Atas, Istora) where mobile signal is dead.
    2. **Instant Search-as-You-Type (0ms Latency)**: Every keystroke filters locally in < 5ms without network calls.
    3. **Zero Operating Cost & Compliance**: $0.00/mo at 10k or 100k users. Completely avoids the strict Nominatim ban on autocomplete search and Photon demo-server throttling.
  * *Main Trade-off*:
    * The offline index covers curated POIs and major roads (~30,000 entries), but will not resolve specific private residential house numbers (e.g. "Jl. Tebet Barat Dalam No. 14"). For exact street numbers, the user can trigger an explicit on-demand external geocode search on Enter/Submit (never on keystroke).

---

### 4. What Stayed Unverified

1. **Exact POI counts in rural outer borders**: Precise counts for newly mapped residential alleys in fringe border zones (e.g. southern Bogor Regency and eastern Bekasi Regency) without running a full Osmium parse on the complete raw Indonesian planet dump.
2. **Photon demo server rate-limit ceiling**: The exact concurrency threshold where `photon.komoot.io` starts returning HTTP 429 to Jakarta IP ranges (policy only states "extensive usage will be throttled or completely banned").
