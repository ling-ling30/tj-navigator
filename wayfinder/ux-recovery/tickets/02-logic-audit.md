---
id: 2
title: Does the engine logic give correct answers on real Jakarta trips?
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [5]
map: ../map.md
---

# #2 Logic audit

## Question

Does the engine produce correct, explainable results? Audit in `src/lib/router/raptor.ts`, `src/workers/raptor.worker.ts`, `src/lib/fare/fare-engine.ts`, `src/lib/telemetry/*`, `src/lib/store/transit-store.ts`, `src/lib/storage/transit-db.ts`, and the data in `public/data/jakarta-transit-network.json`, built by `scripts/build-graph.ts`.

## Method

- Pick 8–10 real Jakarta trips with an independently known answer (e.g. Tebet → Bundaran HI, Blok M → Kota, Bekasi → Sudirman, Bogor → Manggarai, Dukuh Atas transfers, a pure-BRT trip, a trip with no sensible route). Compare against published line maps and fares.
- Run the engine headless (node script in `scripts/`, not the browser) to get itineraries, durations, transfers, fares.
- Also audit the state flow: search → results → radar, error and empty states, stale live data, the origin = destination case, no-route case, loading and offline.
- Check duplicate/garbage stops, unnamed stops, wrong coordinates, orphan nodes in the data.

## Resolved when

A defect list under `## Resolution`: each defect with trip/input, expected, actual, file and likely cause, severity (🔴 wrong answer, 🟡 misleading, 🟢 cosmetic). A re-runnable test script is saved in `scripts/audit-trips.ts` (or `.mjs`). Do not fix anything in this ticket.

## Resolution

### How to Run the Headless Audit Script

The headless test suite runs outside the browser and executes `RaptorRouter`, `FareEngine`, telemetry modules, and network validation:

```bash
# Using Node directly (via runner script):
node scripts/audit-trips.mjs

# Or directly with Vite-node:
npx vite-node scripts/audit-trips.ts
```

---

### Audit Summary

- **Total trips tested**: 11 real Jakarta scenarios (Transjakarta BRT, KRL Commuterline, MRT Jakarta, LRT, multi-modal interchanges, disconnected routes, and origin=destination).
- **Systemic defects identified**: 15 (8 🔴 Wrong Answer, 5 🟡 Misleading, 2 🟢 Cosmetic).
- **Network health**: 8,273 stops ingested, but **8,143 stops (98.4%) are orphan nodes** with 0 routes because `build-graph.ts` ingests `stops.txt` without parsing GTFS `routes.txt`, `trips.txt`, or `stop_times.txt`.
- **Core router defect**: Corrupted backtracking in RAPTOR discards journey origins when a transfer edge finishes a round, truncating multi-modal trips mid-route.

---

### Trip Benchmark Results Table

| Trip / Input | Expected Result (Published Authority) | Actual Result (Engine) | Status | Primary Severity |
| :--- | :--- | :--- | :--- | :--- |
| **1. Blok M → Kota** (`tj:1-1` → `tj:1-22`) | Direct BRT Corridor 1 (16 stops), 40–55m, flat Rp 3.500 | 32m, 0 xfers, Rp 3.500 (FareEngine integrated tariff incorrectly Rp 3.750). Transit leg has hardcoded 600s/4500m/4 stops | ❌ FAIL | 🟡 misleading |
| **2. Tebet → Bundaran HI** (`krl:TEB` → `mrt:BHI`) | KRL Tebet→Manggarai→Sudirman + Walk Skywalk Dukuh Atas + MRT Dukuh Atas BNI→Bundaran HI (30–40m, Rp 7.000: KRL Rp 3.000 + MRT Rp 4.000) | 22m, 2 xfers. **Origin truncated: journey starts at Sudirman** (Walk Sudirman→Dukuh Atas BNI + MRT Dukuh Atas BNI→Bundaran HI). Tebet KRL leg missing entirely. Hardcoded standard fare Rp 6.500 | ❌ FAIL | 🔴 wrong answer |
| **3. Bekasi → Sudirman** (`krl:BKS` → `krl:SUD`) | Direct KRL Cikarang Line (8 stops, 27 km), 35–45m, published KCI fare Rp 4.000 (Rp 3.000 first 25 km + Rp 1.000 next 10 km) | 20m, 0 xfers, hardcoded fare Rp 3.500; FareEngine calculates Rp 3.000 because distance is hardcoded to 4.5 km | ❌ FAIL | 🔴 wrong answer |
| **4. Bogor → Manggarai** (`krl:BOG` → `krl:MRI`) | Direct KRL Bogor Line (16 stops, 44 km), 50–60m, published KCI fare Rp 5.000 (Rp 3.000 base + 2×Rp 1.000 distance tiers) | 35m, 0 xfers, hardcoded fare Rp 3.500; FareEngine calculates Rp 3.000 (distance clamped to 4.5 km) | ❌ FAIL | 🔴 wrong answer |
| **5. Sudirman → Dukuh Atas BNI** (`krl:SUD` → `mrt:DKA`) | Pure walking concourse transfer at TOD hub (280m, ~4 min, Rp 0) | **0 itineraries returned**. RAPTOR round scan starts at $k=1$, omitting $k=0$ initial transfer footpaths | ❌ FAIL | 🔴 wrong answer |
| **6. Dukuh Atas 1 → Sudirman** (`tj:1-12` → `krl:SUD`) | Reverse pedestrian walk connecting BRT to KRL (180m, ~3 min, Rp 0) | 37m, 1 xfer. **Corrupted origin: starts at Dukuh Atas BNI instead of Dukuh Atas 1**. Reverse transfer edge missing in `transfer-hubs.json` | ❌ FAIL | 🔴 wrong answer |
| **7. Pinang Ranti → Pluit** (`tj:9-1` → `tj:9-25`) | Direct BRT Corridor 9 (10 stops in graph), 50–70m, flat Rp 3.500 | 20m, 0 xfers, hardcoded 600s/4500m/4 stops; FareEngine integrated tariff incorrectly calculates Rp 3.750 | ❌ FAIL | 🟡 misleading |
| **8. CSW 1 → Velbak** (`tj:1-4` → `tj:13-2`) | Paid-area transfer via CSW hub escalators (CSW 1→13) + Corridor 13 to Velbak. Free transfer (Rp 3.500 total) | 9m, 0 xfers, Legs: Walk + Transit. Transit leg lacks `isPaidAreaTransfer: true`. FareEngine would double-charge multi-leg BRT transfers | ❌ FAIL | 🟡 misleading |
| **9. Lebak Bulus → Bundaran HI** (`mrt:LBB` → `mrt:BHI`) | Direct MRT North-South (13 stations, full line), 28–30m, published MRT Jakarta tariff exactly Rp 14.000 | 27m, 0 xfers. Hardcoded router fare Rp 3.500; FareEngine calculates Rp 7.000 (4 intermediate stops hardcoded) | ❌ FAIL | 🔴 wrong answer |
| **10. Pegangsaan Dua → Ragunan** (`lrt:PGD` → `tj:6-1`) | Disconnected / No sensible transit route in graph. Expected empty state ("Tidak ada rute langsung") | Raw RAPTOR returns 0 itineraries. **Store intercepts and injects 3 fake itineraries** (claiming KRL to Sudirman and Feeder 6C reach destination) | ❌ FAIL (Store) | 🔴 wrong answer |
| **11. Tebet → Tebet** (`krl:TEB` → `krl:TEB`) | Origin = Destination: 0 min, Rp 0, already at destination | Raw RAPTOR returns 0 itineraries. **Store intercepts and injects fake 38-min Feeder 6C trip** with +9m traffic delay | ❌ FAIL (Store) | 🔴 wrong answer |

---

### Ranked Defect List

#### 🔴 Wrong Answer (Critical correctness failures)

1. **Backtrack Leg Reconstruction Truncates Origin on Transfer Rounds**
   - **Trip/Input**: Tebet (`krl:TEB`) → Bundaran HI (`mrt:BHI`); Dukuh Atas 1 (`tj:1-12`) → Sudirman (`krl:SUD`)
   - **Expected**: Complete itinerary starting from the passenger's selected origin stop.
   - **Actual**: The journey starts mid-way (e.g. at Sudirman or Dukuh Atas BNI); the initial transit leg from Tebet is completely discarded.
   - **File:Line**: [`src/lib/router/raptor.ts:187-233`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/router/raptor.ts#L187-L233)
   - **Likely Cause**: In `backtrackLegs`, when a round $k$ reached destination via a transfer edge, `p.isTransfer` is unshifted, and `currRound--` immediately decrements. The transit leg that arrived at that transfer in round $k$ is stored in `parent[k][fromStopIdx]`, but the loop searches `parent[k-1]`, finds `null`, decrements past 0, and prematurely terminates.
   - **Severity**: 🔴 wrong answer

2. **Store Injects Fake Mock Itineraries on Empty Routes and Origin = Destination**
   - **Trip/Input**: Pegangsaan Dua → Ragunan (unconnected), Tebet → Tebet (identical stops), or any of 8,143 orphan stops
   - **Expected**: Empty results state ("Rute tidak ditemukan") or zero-duration notification.
   - **Actual**: `useTransitStore.calculateJourney` intercepts `rawItineraries.length === 0` and injects 3 hardcoded mock itineraries (KRL to Sudirman + Dukuh Atas skywalk + BRT Corridor 1; Feeder 6C; JAK-48A) substituting the user's origin/destination labels onto non-existent routes.
   - **File:Line**: [`src/lib/store/transit-store.ts:186-336`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/store/transit-store.ts#L186-L336)
   - **Likely Cause**: Demo prototype fallback code was left active in production store flow.
   - **Severity**: 🔴 wrong answer

3. **Round 0 Initial Footpaths Ignored by RAPTOR (Pure Walking Transfers Fail)**
   - **Trip/Input**: Sudirman (`krl:SUD`) → Dukuh Atas BNI (`mrt:DKA`); Kebayoran (`krl:KBY`) → Velbak (`tj:13-2`)
   - **Expected**: 1 walking leg (280m, ~4 min, Rp 0) across the concourse/skywalk.
   - **Actual**: 0 itineraries returned; store triggers fake mock itineraries.
   - **File:Line**: [`src/lib/router/raptor.ts:149-150`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/router/raptor.ts#L149-L150)
   - **Likely Cause**: Itinerary collection loop checks `for (let k = 1; k <= MAX_ROUNDS; k++)`, completely ignoring $k = 0$ where direct walking transfers from origin are populated.
   - **Severity**: 🔴 wrong answer

4. **Hardcoded Fares in RAPTOR Router Output**
   - **Trip/Input**: Any trip planned through RAPTOR (e.g. Bekasi → Sudirman, Bogor → Manggarai, Lebak Bulus → Bundaran HI)
   - **Expected**: Fare computed based on actual modes, distance, and station counts.
   - **Actual**: Router hardcodes `standardFareIdr: k === 1 ? 3500 : 6500` and `integratedFareIdr: 3500`. KRL and MRT trips are priced at Rp 3.500 instead of Rp 4.000–14.000.
   - **File:Line**: [`src/lib/router/raptor.ts:164-165`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/router/raptor.ts#L164-L165)
   - **Likely Cause**: Hardcoded ternary values bypassed `calculateItineraryFare`.
   - **Severity**: 🔴 wrong answer

5. **Hardcoded Transit Leg Runtime, Distance, and Intermediate Stop Count**
   - **Trip/Input**: Any transit leg across all routes (e.g. Bogor → Manggarai: 16 stops, 44 km)
   - **Expected**: Realistic runtime based on stop sequence hop times, actual track distance, and real intermediate stop count.
   - **Actual**: Every transit leg is hardcoded to `durationSeconds: 600` (10 min), `distanceMeters: 4500` (4.5 km), and `intermediateStopCount: 4`.
   - **File:Line**: [`src/lib/router/raptor.ts:223-228`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/router/raptor.ts#L223-L228)
   - **Likely Cause**: Hardcoded constants placed in leg builder instead of computing delta from `stopSeq`.
   - **Severity**: 🔴 wrong answer

6. **MRT Jakarta Station Progressive Fare Calculation Undercharge**
   - **Trip/Input**: Lebak Bulus Grab (`mrt:LBB`) → Bundaran HI (`mrt:BHI`)
   - **Expected**: Rp 14.000 (official MRT Jakarta tariff: Rp 3.000 base + 11 intermediate stations = Rp 14.000 maximum).
   - **Actual**: Rp 7.000.
   - **File:Line**: [`src/lib/fare/fare-engine.ts:38-42`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/fare/fare-engine.ts#L38-L42)
   - **Likely Cause**: Formula uses `stopsPassed = leg.intermediateStopCount || 3`, which receives the hardcoded value 4 from RAPTOR (`3000 + 4 * 1000 = 7000`).
   - **Severity**: 🔴 wrong answer

7. **KRL Distance-Based Progressive Fare Always Clamped to Flat Base Fare**
   - **Trip/Input**: Bogor → Manggarai (44 km, Rp 5.000), Bekasi → Sudirman (27 km, Rp 4.000)
   - **Expected**: Rp 5.000 and Rp 4.000 per KCI progressive distance bands (Rp 3.000 first 25 km + Rp 1.000 per subsequent 10 km).
   - **Actual**: Always Rp 3.000.
   - **File:Line**: [`src/lib/fare/fare-engine.ts:34-36`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/fare/fare-engine.ts#L34-L36)
   - **Likely Cause**: `leg.distanceMeters` receives hardcoded 4500 (4.5 km) from RAPTOR; `(km - 25)` is never positive.
   - **Severity**: 🔴 wrong answer

8. **98.4% Orphan Stops Ingested into Graph Poison Search & Routing**
   - **Trip/Input**: Selecting any GTFS bus stop in search modal (e.g. `tj:B00509P`)
   - **Expected**: All searchable stops connect to operable routes.
   - **Actual**: 8,143 stops out of 8,273 stops serve zero routes. Selecting any of them fails routing and triggers fake mock journeys.
   - **File:Line**: [`scripts/build-graph.ts:216-246`](file:///C:/Users/Ricky/Documents/tj-navigator/scripts/build-graph.ts#L216-L246) & [`public/data/jakarta-transit-network.json`](file:///C:/Users/Ricky/Documents/tj-navigator/public/data/jakarta-transit-network.json)
   - **Likely Cause**: `build-graph.ts` parses `stops.txt` from the GTFS zip but never parses `routes.txt`, `trips.txt`, or `stop_times.txt`.
   - **Severity**: 🔴 wrong answer

---

#### 🟡 Misleading (Flawed calculations or misleading state transitions)

9. **Single-Mode Transjakarta Trips Evaluated Under JakLingko Integrated Tariff**
   - **Trip/Input**: Blok M → Kota (Pure BRT Corridor 1)
   - **Expected**: Flat Rp 3.500 standard fare; integrated tariff not applicable for single mode.
   - **Actual**: Fare engine applies `2500 + ceil(4.5)*250 = 3750`, yielding Rp 3.750.
   - **File:Line**: [`src/lib/fare/fare-engine.ts:53-59`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/fare/fare-engine.ts#L53-L59)
   - **Likely Cause**: `hasJakLingkoMode` activates whenever a TJ, MRT, or LRT mode is present, failing to verify that a multi-modal transfer occurred (Pergub DKI 133/2021).
   - **Severity**: 🟡 misleading

10. **Hardcoded Live Telemetry Vehicle Identity and Route**
    - **Trip/Input**: `calculateArrivalEta` call for any vehicle/stop
    - **Expected**: Recounted ETA matching the specific tracked vehicle and corridor.
    - **Actual**: Always returns `vehicleId: 'TJ-0842'`, `routeShortName: '6C'`, and `confidenceScore: 0.94`, regardless of input parameters.
    - **File:Line**: [`src/lib/telemetry/live-segment-engine.ts:192-206`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/telemetry/live-segment-engine.ts#L192-L206)
    - **Likely Cause**: Hardcoded return values in ETA response object.
    - **Severity**: 🟡 misleading

11. **MQTT Failure Triggers Fake Simulated Buses Silently**
    - **Trip/Input**: Broker offline, connection error, or 15s watchdog timeout
    - **Expected**: UI indicates live radar is unavailable / offline fallback without simulated data.
    - **Actual**: `startSimulation()` generates synthetic vehicle pings for 4 hardcoded buses moving in an infinite loop, presenting simulated movement as real tracking.
    - **File:Line**: [`src/lib/telemetry/mqtt-client.ts:81-94, 176-184`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/telemetry/mqtt-client.ts#L81-L94)
    - **Likely Cause**: Simulation designed for testing triggers automatically on production disconnects.
    - **Severity**: 🟡 misleading

12. **Asymmetric and Incomplete Transfer Hub Edges in Seed Data**
    - **Trip/Input**: Dukuh Atas 1 (`tj:1-12`) → Sudirman (`krl:SUD`); ASEAN (`mrt:ASN`) → CSW 13 (`tj:13-1`)
    - **Expected**: Bidirectional pedestrian transfer pathways between interchange nodes.
    - **Actual**: `Sudirman -> Dukuh Atas 1` is one-way (reverse missing); `CSW 13 -> ASEAN` is one-way (reverse missing); `Galunggung (Dukuh Atas 2)` has 0 edges.
    - **File:Line**: [`data/seeds/transfer-hubs.json:64-75, 136-146`](file:///C:/Users/Ricky/Documents/tj-navigator/data/seeds/transfer-hubs.json#L64-L75)
    - **Likely Cause**: Missing reverse transfer definitions in seed data.
    - **Severity**: 🟡 misleading

13. **Un-expiring Stale Segment Congestion Multipliers Persisted in LocalStorage**
    - **Trip/Input**: Re-opening app after hours or days
    - **Expected**: Multipliers expire after reasonable TTL (e.g. 15–30 min) and revert to baseline.
    - **Actual**: `hydrateFromStorage()` loads days-old congestion multipliers without checking `Date.now() - lastUpdatedMs`.
    - **File:Line**: [`src/lib/telemetry/live-segment-engine.ts:63-73`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/telemetry/live-segment-engine.ts#L63-L73)
    - **Likely Cause**: Omission of TTL expiration check on hydrated storage objects.
    - **Severity**: 🟡 misleading

---

#### 🟢 Cosmetic (UX polish / non-blocking defects)

14. **Duplicate Stop Names Across GTFS and Seed Data Clutter Search**
    - **Trip/Input**: Searching "CSW 1" (8 duplicates), "Monas" (7 duplicates), "Cawang" (7 duplicates)
    - **Expected**: Deduplicated stops with clear corridor or mode indicators.
    - **Actual**: Search dropdown shows identical names pointing to disparate unlinked stop IDs.
    - **File:Line**: [`src/components/StopSearchModal.tsx:67-87`](file:///C:/Users/Ricky/Documents/tj-navigator/src/components/StopSearchModal.tsx#L67-L87)
    - **Likely Cause**: Ingestion of raw GTFS stop pairs without clustering or spatial deduplication.
    - **Severity**: 🟢 cosmetic

15. **Silent Route Computation Error Handling in Store**
    - **Trip/Input**: Routing computation error or exception
    - **Expected**: User-facing banner explaining calculation error.
    - **Actual**: Error logged to console only; `isComputingRoute` reset to `false` leaving UI in unchanged state without feedback.
    - **File:Line**: [`src/lib/store/transit-store.ts:353-356`](file:///C:/Users/Ricky/Documents/tj-navigator/src/lib/store/transit-store.ts#L353-L356)
    - **Likely Cause**: Missing `set({ error: err.message })` in try/catch block.
    - **Severity**: 🟢 cosmetic

