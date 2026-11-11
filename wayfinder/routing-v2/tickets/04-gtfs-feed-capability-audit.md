---
id: 4
title: What the raw GTFS can support, and how wrong today's engine is
labels: [wayfinder:task]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [6, 7]
map: ../map.md
---

# #4 What the raw GTFS can support, and how wrong today's engine is

## Question

Before deciding the time model and the search, we need numbers: what does the raw Transjakarta GTFS really contain, and how far is today's engine from it?

## Measure (scripts in `scripts/diag/`, read-only on `src/` and `public/`)

**Feed capability**
- `stop_times.txt`: are per-stop times present for every trip? Implied speed per hop (using stop coordinates): distribution, absurd hops. Do times differ between peak and off-peak trips of the same route?
- `frequencies.txt`: routes covered, headway by time window, first and last departure; routes with no frequency row.
- `calendar.txt` and `trips.txt` service ids: which routes run only on weekdays, weekends, or Sundays.
- Stop patterns per route and direction: how many distinct patterns, how many stops are lost by keeping only the most frequent one. Loop patterns (a stop twice in one trip).
- Common lines: for stop pairs served by several routes in the same order, how many routes share them (for example 9, 9A, 9E).
- Size cost of adding per-hop seconds, headway windows and service hours to the compiled graph.

**Baseline of today's engine**
- In-vehicle time error against GTFS times: median, p90, worst 15 routes; S61, S11, S12, S14, corridors 1 and 9 named.
- Options per query over 300 origin–destination pairs: how many return 1, 2, 3+ genuinely different options (different set of lines).
- Circuity: (ride + walk distance) ÷ straight line, legs, walking transfers in a row; 20 worst cases with the cause.
- Query time p50 and p95.
- The owner's commute, stop to stop and point to point, every leg printed.
- Hand-written routes in `scripts/build-graph.ts` that duplicate real GTFS routes, and queries where the invented one wins.

## Resolved when

Numbers and tables under `## Resolution`, with the script path for each. No fixes in this ticket.

## Resolution

All measurements below were produced from the raw Transjakarta GTFS (cached at `tmp_gtfs.zip`, extracted to `scripts/diag/gtfs/`) and the compiled graph (`public/data/jakarta-transit-network.json`) using headless scripts under `scripts/diag/`.

---

### 1. Feed Capability: `stop_times.txt`
*Script: `scripts/diag/audit-feed-capability.ts`*

- **Completeness:** 25,701 rows evaluated across 694 trips. Missing arrival times: **0 (0%)**, missing departure times: **0 (0%)**. Per-stop times are present for 100% of trips.
- **Hop analysis (n = 25,007 hops):**

| Metric | Min | p10 | p50 (Median) | p90 | Max |
|---|---|---|---|---|---|
| Hop duration | 1 s | 38 s | 91 s | 275 s | 6,786 s |
| Hop distance | 0 m | 124 m | 294 m | 870 m | 19,902 m |
| Implied speed | 0.0 km/h | 9.2 km/h | 12.9 km/h | 13.2 km/h | 302.4 km/h |

- **Absurd hops (>100 km/h or <= 0 duration):** Exactly 3 hops out of 25,007 (<0.012%):
  1. Trip `3H-R06`: Sawah Besar Arah Utara (`G00050`) → Mangga Besar Arah Utara (`G00053`) | 474 m in 16 s = 106.6 km/h.
  2. Trip `9H-L11`: Sbr. TPU Islam Tanah Baru (`B07507P`) → TPU Islam Tanah Baru (`B07508P`) | 84 m in 3 s = 100.8 km/h.
  3. Trip `9H-R16`: Sbr. TPU Islam Tanah Baru (`B07507P`) → TPU Islam Tanah Baru (`B07508P`) | 84 m in 1 s = 302.4 km/h.
- **Peak vs Off-peak variation:** Transjakarta models schedules using template trips linked to `frequencies.txt`. Out of 410 route-directions, only 3 pattern groups have >1 trip in `stop_times.txt`. Two exhibit minimal variance (`3A_dir0`: 2 s difference; `3H_dir0`: 190 s difference). Time-of-day traffic variation is not encoded in `stop_times.txt`.

---

### 2. Feed Capability: `frequencies.txt`
*Script: `scripts/diag/audit-feed-capability.ts`*

- **Coverage:** 747 rows covering 694 / 694 trips (**100%**) and 241 / 241 routes (**100%**). Routes without frequency row: **0**.
- **Service Span:** First departure window starts at **00:00**; latest departure window ends at **23:59**.

| Time Window | Rows (n) | Min Headway | Median Headway | Max Headway |
|---|---|---|---|---|
| Early Morning (05:00–07:00) | 44 | 200 s (3.3 min) | 900 s (15 min) | 5,100 s (85 min) |
| Morning Peak (07:00–09:00) | 46 | 282 s (4.7 min) | 1,200 s (20 min) | 4,500 s (75 min) |
| Midday Off-peak (09:00–16:00) | 612 | 180 s (3.0 min) | 712 s (11.9 min) | 3,600 s (60 min) |
| Evening Peak (16:00–20:00) | 39 | 277 s (4.6 min) | 900 s (15 min) | 8,400 s (140 min) |
| Night (20:00–23:00) | 6 | 600 s (10 min) | 1,200 s (20 min) | 1,800 s (30 min) |
| **Overall Feed** | **747** | **180 s (3.0 min)** | **900 s (15 min)** | **8,400 s (140 min)** |

---

### 3. Feed Capability: `calendar.txt` and `trips.txt` Service Profiles
*Script: `scripts/diag/audit-feed-capability.ts`*

- **Service IDs:** `HK` (Hari Kerja: Mon–Fri), `HL` (Hari Libur: Sat–Sun), `HM` (Hari Minggu: Sun), `HR` (Hari Raya: Mon–Sat), `SH` (Semua Hari: daily), `HJ` (Friday), `X` (Sunday).

| Service Profile | Route Count | Share (%) | Example Routes |
|---|---|---|---|
| Daily / All Days (`SH`) | 221 | 91.7% | 1, 9, 6A, 8, 2A, 3D, JAK.74 |
| Weekdays Only (`HK`) | 16 | 6.6% | L13E, 6P, D32, D31, B14, S14, S12, S31, S31R, 1T |
| Weekends Only (`HL`) | 2 | 0.8% | 13E, 9N |
| Sundays Only (`HM`) | 2 | 0.8% | 51ST, 7T |
| Other / Irregular | 0 | 0.0% | — |

---

### 4. Feed Capability: Stop Patterns & Loops
*Script: `scripts/diag/audit-feed-capability.ts`*

- **Route-Directions:** 410 total across 241 routes.
- **Pattern Count:** 691 distinct patterns (1.69 avg per route-dir). 255 (62.2%) have 1 pattern; 155 (37.8%) have >1 pattern.
- **Stops Lost by `build-graph.ts` (keeping only the most frequent pattern):** **527 unique stop connections lost** across 64 route-directions.
- **Worst routes affected by stop loss in `build-graph.ts`:**
  1. Corridor 9 (`9_dir0`): 43 stops lost (canonical pattern kept 7 stops; 50 stops exist in GTFS).
  2. Corridor 1A (`1A_dir0`): 32 stops lost (kept 57 of 89 stops).
  3. Corridor 1 (`1_dir0`): 31 stops lost (kept 19 of 50 stops).
  4. Feeder 9D (`9D_dir1`): 22 stops lost (kept 59 of 81 stops).
  5. Feeder D31 (`D31_dir0`): 21 stops lost (kept 13 of 34 stops).
  6. Corridor 12 (`12_dir1`): 20 stops lost (kept 14 of 34 stops).
- **Loop Patterns (same stop visited ≥ 2 times in one trip):** **242 trips** across **166 routes (68.9% of all routes)** contain loops. Because `raptor.ts` calculates hop counts using `p - stopSeq.indexOf(boardingStopIdx)`, the first occurrence is always returned, severely corrupting travel times and backtracks on loop routes.

---

### 5. Feed Capability: Common Lines
*Script: `scripts/diag/audit-feed-capability.ts`*

- **Total distinct adjacent stop hops in GTFS:** 9,838.
- **Distribution of routes per hop:** min = 1, p50 = 1, p90 = 2, max = 10.
- **Top shared trunk hops:**
  - `Jln. Mastrip → Sbr. Term. Kampung Rambutan`: 10 routes (`7A, 7B, 7D, 7E, 7V, JAK.06, JAK.19, JAK.38, JAK.71, S22`).
  - `Term. Senen → Kel. Senen → Bangau VI`: 9 routes (`12B, 14B, 1P, 1R, 2P, 6H, JAK.17, JAK.23, JAK.24`).
  - `Pharmin → Explorer Tanah Abang → Blok F`: 9 routes (`1H, 1R, 5M, 8M, 9D, JAK.07, JAK.11, JAK.12, JAK.14`).
  - `Kemanggisan Arah Utara → Kota Bambu Arah Utara` (Corridor 9 spine): 8 routes (`1, 10H, 3F, 7R, 9, 9A, 9E, S61`).
  - `Kota Bambu Arah Selatan → Kemanggisan Arah Selatan`: 7 routes (`1, 10H, 3F, 9, 9A, 9E, S61`).

---

### 6. Feed Capability: Graph Size Impact
*Script: `scripts/diag/audit-feed-capability.ts`*

- **Current compiled graph (`jakarta-transit-network.json`):** 2,265.5 KB (2.21 MB uncompressed).
- **Network contents:** 7,966 stops, 436 routes, 17,032 total hops.
- **Estimated payload overhead to support timetable & headways:**
  1. Per-hop seconds array per route: ~52 KB.
  2. Headway windows (tuples per route): ~35 KB.
  3. Service calendar / operating days: ~10 KB.
  - **Total estimated addition:** ~97–120 KB (**+4.3% to +5.3%** size increase).

---

### 7. Engine Baseline: In-Vehicle Time Error vs GTFS
*Script: `scripts/diag/audit-engine-baseline.ts`*

- **Methodology:** 694 trips across all routes in GTFS compared against the engine's fixed hop rule (`hopCount × 170s` for BRT, `180s` for non-BRT).
- **Distribution of Error across all trips:**
  - Raw Error (Engine − GTFS): median = **+13.3 min (+796 s)**, p90 = **+99.4 min (+5,962 s)**.
  - Absolute Error (|Engine − GTFS|): median = **55.6 min (3,334 s)**, p90 = **125.9 min (7,553 s)**.
  - Relative Error: median = **18.8%**, p90 = **108.1%**.

- **Worst 15 Routes by Absolute Time Error:**

| Rank | Route | Dir | Hops | GTFS Time | Engine Time | Error | Pct Error | Description |
|---|---|---|---|---|---|---|---|---|
| 1 | B51 | 0 | 12 | 412.1 min | 34.0 min | −378.1 min | −91.7% | Cikarang – Cawang |
| 2 | B51 | 0 | 8 | 313.4 min | 22.7 min | −290.7 min | −92.8% | Cikarang – Cawang |
| 3 | T31 | 0 | 28 | 328.0 min | 79.3 min | −248.6 min | −75.8% | PIK 2 – Blok M |
| 4 | P11 | 0 | 11 | 266.6 min | 31.2 min | −235.5 min | −88.3% | Bogor – Blok M |
| 5 | P11 | 1 | 9 | 258.8 min | 25.5 min | −233.3 min | −90.1% | Bogor – Blok M |
| 6 | SH2 | 0 | 24 | 300.9 min | 68.0 min | −232.9 min | −77.4% | Blok M – Bandara Soetta |
| 7 | JAK.53 | 0 | 152 | 223.4 min | 456.0 min | +232.6 min | +104.1% | Grogol – Pos Pengumben |
| 8 | JAK.50 | 0 | 149 | 214.5 min | 447.0 min | +232.5 min | +108.4% | Kalideres – Puri Kembangan |
| 9 | JAK.33 | 0 | 153 | 227.2 min | 459.0 min | +231.8 min | +102.0% | Pulo Gadung – Kota |
| 10 | JAK.32 | 1 | 131 | 162.6 min | 393.0 min | +230.4 min | +141.7% | Joglo – Lebak Bulus |
| 11 | T31 | 0 | 22 | 287.1 min | 62.3 min | −224.8 min | −78.3% | PIK 2 – Blok M |
| 12 | JAK.12 | 0 | 119 | 135.8 min | 357.0 min | +221.2 min | +162.9% | Tanah Abang – Kebayoran Lama |
| 13 | T31 | 0 | 24 | 288.3 min | 68.0 min | −220.3 min | −76.4% | PIK 2 – Blok M |
| 14 | B51 | 0 | 4 | 231.1 min | 11.3 min | −219.7 min | −95.1% | Cikarang – Cawang |
| 15 | SH2 | 1 | 17 | 267.4 min | 48.2 min | −219.3 min | −82.0% | Blok M – Bandara Soetta |

- **Named Routes Audit:**

| Route | Trips Sampled | GTFS Duration | Engine Duration | Error (Engine − GTFS) | Relative Error |
|---|---|---|---|---|---|
| **S61** (BSD–Kota Bambu–Blok M) | 5 trips (14–32 hops) | 140.7 – 280.8 min | 39.7 – 90.7 min | **−89.7 to −196.6 min** | **−63.7% to −75.5%** |
| **S11** (BSD–Grogol) | 3 trips (25–51 hops) | 150.5 – 301.7 min | 70.8 – 144.5 min | **−76.8 to −157.2 min** | **−51.0% to −53.1%** |
| **S12** (BSD–Lebak Bulus) | 2 trips (1–2 hops) | 87.2 – 87.4 min | 2.8 – 5.7 min | **−81.5 to −84.6 min** | **−93.5% to −96.8%** |
| **S14** (Pamulang–Lebak Bulus) | 2 trips (3–8 hops) | 79.8 – 84.8 min | 8.5 – 22.7 min | **−57.2 to −76.3 min** | **−71.6% to −90.0%** |
| **Corridor 1** (Blok M–Kota) | 18 trips (6–35 hops) | 23.6 – 120.8 min | 17.0 – 99.2 min | **−4.7 to −64.3 min** | **−14.8% to −57.2%** |
| **Corridor 9** (Pinang Ranti–Pluit) | 10 trips (6–47 hops) | 35.2 – 215.9 min | 17.0 – 133.2 min | **−18.2 to −91.2 min** | **−38.3% to −65.4%** |

*(Suburban express routes like S61, S12, S14, and B51 have long distance between few stops; the hop-multiplier causes catastrophic time underestimation up to 96%).*

---

### 8. Engine Baseline: Options per Query (300-Pair Random Sweep)
*Script: `scripts/diag/audit-engine-baseline.ts`*

- **Sampling:** 300 origin–destination pairs sampled uniformly from 7,966 active stops using PRNG `mulberry32(42)`. Departure time: 08:00 AM.
- **Distinct Option Definition:** Genuinely different sets of transit route short names used, ignoring walking legs.

| Distinct Options Returned | Query Count | Share (%) |
|---|---|---|
| **0 distinct options** | 0 | 0.0% |
| **1 distinct option** | 204 | **68.0%** |
| **2 distinct options** | 95 | 31.7% |
| **3+ distinct options** | 1 | **0.3%** |

*(68.0% of all queries offer no variation at all; only 1 out of 300 queries provided 3 or more distinct transit options).*

---

### 9. Engine Baseline: Circuity & Path Complexity
*Script: `scripts/diag/audit-engine-baseline.ts`*

- **Circuity metric:** $(\text{ride distance} + \text{walk distance}) \div \text{straight line haversine distance}$ (trips with straight distance ≥ 1 km, n = 299).

| Metric | Min | p50 (Median) | p90 | Max |
|---|---|---|---|---|
| **Circuity** | 1.11× | 1.61× | **2.73×** | **9.33×** |
| **Legs count** | 1 | 7 | 10 | 11 |
| **Walk legs in a row** | 0 | 1 | 1 | 1 |

- **Top 5 Worst Circuity Anomalies:**
  1. **9.33× circuity** (9.4 km straight vs 88.0 km travelled, 99 min): `Gg. Tongolo → Pasar Damai Raya 1`. Route: `JAK.20 → B11 (to Cawang) → B13 → SH2 → 1E`. Cause: Detour into peripheral expressway feeders.
  2. **7.53× circuity** (4.2 km straight vs 31.6 km travelled, 98 min): `Sbr. SDN Srengseng Sawah 01 → Gerbang Tol Brigif 2`. Route: `D21 → 6V (detour north to Bundaran Senayan) → D32 (back south)`. Cause: Absence of direct orbital link forcing travel into Central Jakarta and back.
  3. **6.29× circuity** (7.5 km straight vs 47.1 km travelled, 80 min): `Sbr. Gg. Elektro → Jln. Bisma Raya 2`. Route: `12F → 10 → JAK.90`. Cause: Trunk corridor detour to Tanjung Priok terminal.
  4. **6.02× circuity** (9.5 km straight vs 57.1 km travelled, 101 min): `Sbr. Jln. Mesjid I Benhil → Gelanggang Remaja Pasar Minggu`. Route: `8C → SH2 (to Blok M) → 6U`. Cause: Forced hub interchange via Blok M.
  5. **5.51× circuity** (4.4 km straight vs 24.4 km travelled, 76 min): `Puskesmas Kb. Jeruk → Sbr. Bidan Ningsih Joglo`. Route: `JAK.14 → JAK.51`. Cause: Mikrotrans loops around residential zones.

---

### 10. Engine Baseline: Query Performance
*Script: `scripts/diag/audit-engine-baseline.ts`*

- **Sample Size:** 300 random queries with `mulberry32(42)`.

| Metric | Duration |
|---|---|
| **p50 (Median)** | **8.68 ms** |
| **p90** | 22.28 ms |
| **p95** | **24.69 ms** |
| **Max** | 60.93 ms |

---

### 11. The Owner's Commute Benchmark
*Script: `scripts/diag/audit-engine-baseline.ts`*

#### Test 1: Stop-to-stop (`tj:B08106P` Flavor Bliss → `tj:G00074` / `tj:G00075` Penjaringan)

- **Engine Output (40 min, 1 transfer, Rp 7.000):**
  - Leg 1: `[TRANSIT]` Route S61 (`tj:S61-0`): Flavor Bliss → Kota Bambu Arah Selatan | 19,136 m | 5 stops | 17 min (1,020 s).
  - Leg 2: `[WALK]` Footpath: Kota Bambu Arah Selatan → Kota Bambu Arah Utara | 112 m | 0 stops | 2 min (93 s).
  - Leg 3: `[TRANSIT]` Route 7R (`tj:7R-0`): Kota Bambu Arah Utara → Penjaringan | 6,728 m | 5 stops | 17 min (1,020 s).
- **GTFS Timetable Scheduled Times:**
  - S61 (`Trip S61-L01`): Flavor Bliss (`B08106P`, dep 05:00:10) → Kota Bambu Arah Selatan (`G00437`, arr 06:41:03) = **6,053 s = 100.9 min**.
  - Walk transfer + waiting: ~2 min.
  - Corridor 9/7R (`Trip 9-P24`): Kota Bambu Arah Utara (`G00436`, dep 07:49:56) → Penjaringan (`G00074`, arr 08:23:36) = **2,020 s = 33.7 min**.
  - **Total GTFS Ride Time:** **136.6 min (~2h 17m)**.
- **Engine Error:** Engine estimates **40 min** vs GTFS **136.6 min** (**−96.6 min, 70.7% underestimation**).

#### Test 2: Point-to-point (~1.2 km from Flavor Bliss → ~400 m from Penjaringan)
- **Coordinates:** Origin `(-6.2360, 106.6570)` (Alam Sutera) → Destination `(-6.1240, 106.7910)` (Penjaringan).
- **Engine Output:** Returned 12 itineraries, but only **2 distinct transit line combinations**:
  - *Option 1 (Ranked #1, 41 min, 2 transfers, Rp 10.500):* Walk 1,555 m (21m) to Masjid At Taqwa → Route S11 (21.0 km, 7 stops, 23m) to Taman Anggrek → Walk 78 m to Tanjung Duren → Route 9ST (1.1 km, 1 stop, 6m) to Grogol Reformasi → Walk 153 m to Grogol 2 → Route 9 (4.7 km, 0 stops, 3m) to Pluit → Walk 228 m to Kantor Penjaringan.
  - *Option 2 (Ranked #2–#12, 46–56 min, 1 transfer, Rp 7.000):* Walk 289 m (4m) to Olivia → Route S61 (17.8 km, 4 stops, 14m) to Kota Bambu → Walk 112 m → Route 7R (6.7 km, 5 stops, 17m) to Penjaringan → Walk 360 m to Kantor Penjaringan. *(Itineraries #2–#12 were identical S61+7R rides with redundant 50–200m walking permutations at destination).*

---

### 12. Hand-Written Routes Duplication & Competition
*Script: `scripts/diag/audit-engine-baseline.ts`*

- **Duplicated Routes:** 12 hand-written route directions hard-coded in `scripts/build-graph.ts` duplicate official GTFS routes:
  1. `tj:corridor-1` & rev (16 stops) vs GTFS `tj:1-0` (20 stops) & `tj:1-1` (22 stops).
  2. `tj:corridor-6` & rev (11 stops) vs GTFS `tj:6-0` (35 stops) & `tj:6-1` (18 stops).
  3. `tj:feeder-6c` & rev (6 stops) vs GTFS `tj:6C-0` (22 stops).
  4. `tj:corridor-9` & rev (10 stops) vs GTFS `tj:9-0` (7 stops) & `tj:9-1` (26 stops).
  5. `tj:corridor-13` & rev (4 stops) vs GTFS `tj:13-0` (27 stops) & `tj:13-1` (13 stops).
  6. `tj:jak-48a` & rev (4 stops) vs GTFS `tj:JAK.48A-0`.
- **Why and Where the Invented Routes Win:**
  - *Stop count distortion:* Because in-vehicle time is computed as `hopCount × 170s`, the invented Corridor 9 with 10 stops appears artificially faster (28 min) than the full GTFS Corridor 9 with 26 stops.
  - *Custom stop ID isolation:* The hand-written routes bind to synthetic stop IDs (e.g. `tj:1-1`, `tj:9-1`, `tj:1-22`). When queries originate from or target these landmark stops, RAPTOR only finds the synthetic route. In both Blok M → Kota and Pinang Ranti → Pluit, the invented hand-written route wins 100% of the time, completely suppressing real GTFS lines.

---

### What Explains the Owner's Complaints Most (Ranked)

1. **Unrealistic time (Rank 1 — Root Cause):**
   - The engine completely ignores distance and scheduled timetables, applying a naive `stops × 170s/180s` formula.
   - For express/suburban buses (S61, S11, S12, S14, B51), a 19 km hop takes the same calculated time as a 200 m hop. On S61, the engine predicts **17 minutes** for a segment that GTFS schedules at **100.9 minutes** (−83% error). The owner's entire commute is displayed as **40 minutes** instead of the scheduled **136.6 minutes**. Across the entire network, p90 absolute error is **125.9 minutes**.
2. **Few options (Rank 2 — Search Architecture):**
   - **68.0% of queries return only 1 distinct transit option**, and **0.3% return 3+ options**.
   - Standard RAPTOR tracks only the earliest arrival per round (number of transfers). For any origin-destination pair, only one route combination can survive per round. The UI shows up to 12 itineraries for coordinate queries, but 10 of them are duplicate transit lines with minor footpath offsets.
3. **Indirect route / Circuity (Rank 3 — Objective Mismatch):**
   - p90 circuity is **2.73×** and worst cases reach **9.33×**.
   - Because the search optimizes solely for arrival time under artificial stop counts rather than physical distance or directness, it routes passengers on massive detours (e.g. sending trips through central hubs like Blok M or Cawang) because they have high frequencies or fewer hops.
4. **No mode choice (Rank 4 — UI Disconnect):**
   - The mode chips on the search screen are local UI state never passed to `RaptorRouter` or `JourneyPlanner`.
   - Furthermore, in `raptor.ts`, transit mode is read from `stops[boardingStopIdx][4]` rather than the route itself, conflating BRT and feeder bus operations.

---

### What Could Not Be Measured

1. **Time-of-day traffic variance within `stop_times.txt`:** Transjakarta provides static template trips rather than distinct time-of-day trip rows, relying on `frequencies.txt` for headways. Dynamic traffic delay cannot be extracted from static `stop_times.txt`.
2. **Heavy and light rail timetable accuracy:** KRL Commuterline, MRT Jakarta, and LRT Jakarta schedules are not present in Transjakarta's GTFS feed; they exist only as synthetic seeds in `data/seeds/` without stop-level departure tables.
3. **Real-world live vehicle delays:** Measuring live road delays requires the MQTT live vehicle telemetry stream, which is not available in the offline GTFS archive.

---

## Verification by the decider (Claude, 2026-11-11)

**Correction: the GTFS stop times are not real schedules.** I recomputed the average speed of every trip (stop-to-stop distance ÷ scheduled time, 694 trips):

| Group | Trips | Median km/h | p10 | p90 |
|---|---|---|---|---|
| BRT | 162 | 11,2 | 9,7 | 11,9 |
| Angkutan Umum Integrasi | 166 | 10,5 | 9,2 | 11,4 |
| Mikrotrans | 227 | 10,0 | 9,1 | 10,6 |
| Transjabodetabek (toll express) | 80 | 11,1 | 9,6 | 11,8 |
| Royaltrans | 26 | 12,3 | 6,7 | 16,4 |

Every class of service, from a Mikrotrans in a kampung to an express bus on a toll road, runs at about 10–12 km/h in the feed. S61 takes 281 minutes for 53 km. That is a template (distance at a constant speed plus 10 s dwell), not a timetable.

Consequences:

- Sections 7 and 11 above compare the engine against the feed's times. Those "errors" are not errors against reality. The owner's commute is neither 40 minutes (engine) nor 137 minutes (feed).
- Riding time cannot be taken from `stop_times.txt`. It has to come from distance and a speed per kind of road and service, calibrated on real evidence (live bus positions, published figures, real trips). See the tickets on live speeds and speed references.
- Still trusted from the feed: stop order and patterns, `frequencies.txt` headways (values vary from 3 to 140 minutes, so they are not a template), service days, fare classes, shapes.
- Confirmed as measured: 68 % of queries give one distinct option and 0,3 % give three; 166 of 241 routes contain loop patterns; keeping one pattern per route and direction loses stops (corridor 9 keeps 7 of 50); the hand-written corridors shadow the real ones; query time p95 is 25 ms.
