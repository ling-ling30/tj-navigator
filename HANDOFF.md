# Handoff: TJ-Navigator (Jakarta Public Transit Journey Planner)

> Context handoff preserving 100% of the research, empirical probes, and architectural decisions carried over from session `978b5cf2-2014-4469-a19e-3dda570de768`.

---

## 1. Project Overview & Vision

**TJ-Navigator** is an open, high-accuracy transit journey planner for Jakarta and the greater Jabodetabek metropolitan area — an equivalent to **DB Navigator** or **Citymapper** tailored to Jakarta's transit realities.

It answers the three core commuter questions:
1. **Which way to go?** Multi-modal itinerary finding across Transjakarta (BRT, Non-BRT, Mikrotrans/JakLingko), KRL Commuterline, MRT Jakarta, and LRT Jabodebek/Jakarta.
2. **How much time is needed from Point A to B?** Realistic journey durations accounting for rail schedules, BRT dedicated lanes, headway windows for buses, and realistic pedestrian transfers across skywalks.
3. **What are the alternatives?** Compare "Fastest", "Fewest Transfers", "Rail Only", and "Lowest Fare" options.

---

## 2. Empirical Feasibility Summary (Verified November 2026)

All primary transit infrastructure endpoints were empirically probed and verified:

| Service / System | Endpoint / Source | Probe Status | Key Findings |
| :--- | :--- | :---: | :--- |
| **Transjakarta GTFS** | `https://gtfs.transjakarta.co.id/files/file_gtfs.zip` | `200 OK` | Live **2.5 MB** bundle containing **8,143 stops/halte**, **241 routes**, route polylines (`shapes.txt`), departure frequencies, and fare rules. Last modified November 2026. |
| **Transjakarta Guest Auth** | `https://tijeapi.transjakarta.co.id/v1/auth/login/guest` | `200 OK` | Instant anonymous guest JWT token generation; used to query routes, halte details, and bus GPS telemetry. |
| **Transjakarta Realtime GPS** | `wss://mqtt.tj.co.id:8084/mqtt` | Accessible | Anonymous MQTT broker streaming live armada positions across corridors. |
| **KRL Commuterline Topology** | Comuline / `vyonizr/tarif-krl` | `200 OK` | Complete dictionary of 100+ stations (codes, coordinates, lines, DAOP) across Jabodetabek and Yogyakarta. Official raw partner endpoint (`api-partner.krl.co.id`) is header-gated, so open-source adapters are used. |
| **MRT Jakarta & LRT** | Timetable & Headway matrix | `100% Deterministic` | MRT (13 stations) and LRT operate on strict headways (5–10 min peak, 10–15 min off-peak) with published timetables. |

See [docs/FEASIBILITY.md](file:///c:/Users/Ricky/Documents/tj-navigator/docs/FEASIBILITY.md) for full technical breakdown.

---

## 3. Core Architectural Realities for Jakarta Transit

1. **Headway Windows vs. Fake Timetable Minutes**:
   Unlike rail systems with fixed signals, Jakarta buses face road congestion outside dedicated corridors. A naive schedule saying *"Bus arriving at 14:03"* erodes commuter trust. The routing engine must model bus routes as **Headway Windows** (*"Every 6–10 min"*) coupled with **Live GPS Countdown** (*"Bus TJ-204 arriving in ~4 min"*).
2. **Transfer Hubs & Pedestrian Skywalks**:
   Multi-modal transfers in Jakarta occur through specific infrastructure (e.g. CSW-ASEAN Skybridge, Dukuh Atas TOD, Kebayoran Skywalk, Manggarai central station). Transfer walking edges must be explicitly modeled with realistic walking penalties (3–7 minutes), not geometric straight-line walking.
3. **Graph Scale & Routing Performance**:
   With ~8,300 total transit nodes and ~250 routes, the entire Jakarta transit network fits comfortably in memory (< 20 MB). A modern routing engine (RAPTOR / CSA / multi-criteria Dijkstra) can evaluate point-to-point journeys in **< 15 milliseconds**.

---

## 4. Suggested Skills for Agent Sessions

When working on this repository, sessions should consult:
- `wayfinder`: Coordinate decisions, maintain the map in `wayfinder/map.md`, and resolve decision tickets one by one.
- `grilling`: Stress-test design decisions and frontier questions with the user.
- `domain-modeling`: Maintain `GLOSSARY.md` and ADRs in `docs/adr/`.
- `design-taste-frontend`: Build high-fidelity, distinctive, accessible commuter journey planner UI.
