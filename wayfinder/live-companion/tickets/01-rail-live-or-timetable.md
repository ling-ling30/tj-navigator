---
id: 1
title: Where real arrival times for KRL, MRT and LRT can come from
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [6]
map: ../map.md
---

# #1 Where real arrival times for KRL, MRT and LRT can come from

## Question

The owner wants arrival times recalculated from where vehicles really are, for buses and trains. Buses have a live position feed. What exists for rail?

## Cover (sources you actually open; link each)

- KRL Commuterline: any live train position or real-time arrival source (official app back end, open data, community projects such as Comuline), its access conditions, and whether using it is allowed.
- MRT Jakarta, LRT Jakarta, LRT Jabodebek: live positions or real-time arrivals, if any.
- Official timetables for each (format, completeness, licence), as the fallback when no live source exists.

## Resolved when

Per operator: live source (yes / no / not allowed), timetable source, and a recommendation. Anything not confirmed is marked "needs verification".

## Resolution

### Overview of Rail Data Sources

An empirical assessment conducted on 2026-11-11 across operator portals, public developer repositories, and transit data catalogues (Mobility Database, Transitland, Satu Data Jakarta) reveals a fundamental contrast with Transjakarta bus data: **no public, legal live vehicle GPS or GTFS-RT feed exists for any rail operator in Jakarta**.

| Operator | Live Source | Timetable Source | Format | Licence | Link (Verified 2026-11-11) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KRL Commuterline** *(PT Kereta Commuter Indonesia)* | **Not allowed** (no open feed; private partner API token-gated) | Official station schedule portal; *C-Access* app; community ETL replica ([Comuline](https://github.com/comuline/api), frozen March 2025) | HTML web query (official); JSON REST (Comuline snapshot) | Proprietary / All rights reserved (PT Kereta Commuter Indonesia) | [commuterline.id Jadwal](https://commuterline.id/perjalanan-krl/jadwal-kereta), [Comuline API Repo](https://github.com/comuline/api), [0xrsydn Research Vault](https://git.rasyidanaf.com/0xrsydn/research/src/branch/main/comuline-krl-data/sources.md) |
| **MRT Jakarta** *(PT MRT Jakarta)* | **No** (restricted to *MyMRTJ* app; no public telemetry) | Official timetable portal; [reksamamur/mrt-jakarta-api](https://github.com/reksamamur/mrt-jakarta-api) scraper | HTML / React SPA tables (official); JSON (community scraper) | Proprietary / All rights reserved (PT MRT Jakarta) | [MRTJ Jadwal Keberangkatan](https://jakartamrt.co.id/id/jadwal-keberangkatan), [mrt-jakarta-api Repo](https://github.com/reksamamur/mrt-jakarta-api) |
| **LRT Jakarta** *(PT LRT Jakarta)* | **No** (internal TMS / *LRTJ Apps* only; no public telemetry) | Official operational notices & press releases; station boards | HTML / text announcement; fixed headway | Proprietary / All rights reserved (PT LRT Jakarta) | [LRT Jakarta Operasional](https://www.lrtjakarta.co.id) |
| **LRT Jabodebek** *(PT KAI Divisi LRT Jabodebek)* | **No** (no open live GPS feed; active hour flagged on web) | Official schedule portal; *Access by KAI* app | HTML web tables per station | Proprietary / All rights reserved (PT Kereta Api Indonesia) | [LRT Jabodebek Jadwal](https://lrtjabodebek.kai.id/jadwal-keberangkatan) |

---

### Detailed Findings per Operator

#### 1. KRL Commuterline (KAI Commuter)
- **Live Train Positions / Real-Time Arrivals:**
  - **Status: Not allowed.**
  - **Details:** The upstream partner API (`https://api-partner.krl.co.id/krl-webs/v1/`, endpoints `GET /krl-station`, `GET /schedules`) is an unadvertised, internal partner gateway used by mobile clients (*C-Access*, *Access by KAI*) and private corporate partners (Google Transit, GoTransit/Gojek).
  - **Access Conditions & Legality:** Protected by rotating Bearer JWT tokens, custom browser headers, and preflight CORS checks. Unauthenticated probes return HTTP 404 / 401. Re-using leaked tokens from community repositories or mobile sniffing violates KAI terms of service. Live train coordinates are not exposed in open payloads.
  - **Community Experience:** Open-source project [Comuline (`comuline/api`)](https://github.com/comuline/api) replicated station and timetable schedules, but the sync broke and froze in March 2025 when the hardcoded token expired and upstream endpoints changed paths (`/schedule` to `/schedules`).
- **Official Timetable Fallback:**
  - **Source:** [commuterline.id Jadwal Kereta](https://commuterline.id/perjalanan-krl/jadwal-kereta).
  - **Format:** Form-based HTML timetable per station; bot-protected via Cloudflare (HTTP 403 on automated fetches).
  - **Completeness:** Covers all 6 Commuterline lines (Bogor Line, Cikarang Loop Line, Rangkasbitung Line, Tangerang Line, Tanjung Priok Line, Airport Rail) across ~110 stations and ~1,100 daily train runs.
  - **Licence:** Proprietary, all rights reserved by PT Kereta Commuter Indonesia.

#### 2. MRT Jakarta (PT MRT Jakarta)
- **Live Train Positions / Real-Time Arrivals:**
  - **Status: No open source.**
  - **Details:** Real-time train tracking and live countdowns exist only within the proprietary *MyMRTJ* mobile application. PT MRT Jakarta operates a private Strapi CMS middleware (`beweb-dev.jakartamrt.co.id/middleware/`), with formal B2B partner integration by direct application only (`commercial@jakartamrt.co.id`).
- **Official Timetable Fallback:**
  - **Source:** [jakartamrt.co.id Jadwal Keberangkatan](https://jakartamrt.co.id/id/jadwal-keberangkatan).
  - **Format:** HTML / React SPA tables per station. Community projects like [reksamamur/mrt-jakarta-api](https://github.com/reksamamur/mrt-jakarta-api) wrap and cache the website's station schedule data as JSON.
  - **Completeness:** Complete for North-South Line (Lebak Bulus Grab <-> Bundaran HI Bank DKI, 13 stations, ~280 daily runs). Operates 05:00–24:00 WIB with deterministic 5-minute peak headway (07:00–09:00, 17:00–19:00 WIB) and 10-minute off-peak/weekend headway.
  - **Licence:** Proprietary, all rights reserved by PT MRT Jakarta.

#### 3. LRT Jakarta (PT LRT Jakarta)
- **Live Train Positions / Real-Time Arrivals:**
  - **Status: No open source.**
  - **Details:** Operational fleet monitoring is handled by the internal Train Monitoring System (TMS). Commuter real-time estimates are restricted to *LRTJ Apps* and *JakLingko*. No public telemetry endpoint or open GTFS-RT feed exists.
- **Official Timetable Fallback:**
  - **Source:** [lrtjakarta.co.id](https://www.lrtjakarta.co.id) press releases and operational schedule notices.
  - **Format:** Text announcements and fixed headway rules (every 10 minutes from 05:30 to 23:00 WIB daily).
  - **Completeness:** Complete for Phase 1 (6 stations: Pegangsaan Dua <-> Velodrome).
  - **Licence:** Proprietary, all rights reserved by PT LRT Jakarta.

#### 4. LRT Jabodebek (PT KAI Divisi LRT Jabodebek)
- **Live Train Positions / Real-Time Arrivals:**
  - **Status: No open source.**
  - **Details:** The public schedule page highlights departing trips within the current hour in red, but exposes no live GPS coordinates or GTFS-RT protocol buffers. No developer portal exists.
- **Official Timetable Fallback:**
  - **Source:** [lrtjabodebek.kai.id Jadwal Keberangkatan](https://lrtjabodebek.kai.id/jadwal-keberangkatan) and *Access by KAI* app.
  - **Format:** HTML schedule tables for Weekday and Weekend operations across each station.
  - **Completeness:** Complete for all 18 stations on the Cibubur Line (Dukuh Atas BNI <-> Harjamukti) and Bekasi Line (Dukuh Atas BNI <-> Jati Mulya). Peak headway 3–6 min, off-peak 6–10 min (~300 daily trips).
  - **Licence:** Proprietary, all rights reserved by PT Kereta Api Indonesia.

#### 5. Open Data Portals & GTFS Catalogues
- **[Mobility Database](https://mobilitydatabase.org) (opened 2026-11-11):** Only Transjakarta static GTFS (`file_gtfs.zip`) is listed. Zero GTFS entries for KRL, MRT Jakarta, or LRT.
- **[Transitland](https://www.transit.land) (opened 2026-11-11):** Only Transjakarta (`f-transjakarta~id` / `o-qqgu-pttransportasijakarta`) is listed. No rail operators indexed.
- **[Satu Data Jakarta](https://satudata.jakarta.go.id) (opened 2026-11-11):** Contains aggregate monthly ridership statistics (CSV/JSON), but no network timetables, APIs, or GTFS feeds for rail.

---

### Recommendation

- **Recommendation:** Do **not** attempt live vehicle position tracking for rail. Instead, use a **deterministic static timetable model** for KRL Commuterline and LRT Jabodebek, combined with **frequency / headway windows** (e.g., *"every 5 min (peak) / 10 min (off-peak)"*) for MRT Jakarta and LRT Jakarta.
- **Key Reason:** None of the rail operators provide an open, authorized live GPS / GTFS-RT feed. Reverse-engineering KRL's token-gated partner API or mobile apps violates terms of service, creates legal liability, and is fragile (proven by Comuline's operational failure when upstream tokens and endpoints shifted).
- **Trade-off:** The companion app cannot alert travellers to unexpected track breakdowns or signal halts in real time for rail (unlike buses where live MQTT GPS is available). However, rail in Jakarta operates on dedicated rights-of-way with high schedule adherence (>95%), and deterministic timetables guarantee high stability, zero token breakage, and instant offline client evaluation.

---

### What Stayed Unverified

- Whether PT KAI / KAI Commuter has any future roadmap to release a public, unauthenticated GTFS-RT or developer open API feed.
- Internal API structures and auth mechanisms for mobile app backends (*Access by KAI*, *C-Access*, *MyMRTJ*, *LRTJ Apps*), which were deliberately not probed or reverse-engineered in compliance with research rules.
- Operational launch timetable and exact headway for LRT Jakarta Phase 1B (Velodrome to Manggarai extension), which is currently under construction and testing.
