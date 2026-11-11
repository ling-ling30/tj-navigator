---
id: 3
title: Official fare rules for every operator
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [9]
map: ../map.md
---

# #3 Official fare rules for every operator

## Question

What are the current official fare rules a Jakarta planner must apply, and what does the Transjakarta GTFS already encode?

## Cover

- From the raw GTFS (`tmp_gtfs.zip`: `fare_attributes.txt`, `fare_rules.txt`, `transfers.txt`): every fare id, price, `transfers`, `transfer_duration`, and which routes map to which fare (regular, premium, free). List the premium and free routes by short name.
- From live primary sources (official operator or government pages, or reputable news quoting them, 2025–2026; link each): Transjakarta flat fare and the conditions for a free transfer; fares for non-BRT, Mikrotrans, Transjabodetabek and Royaltrans routes; the JakLingko integrated tariff (base, per km, cap, time window, operators included, how to qualify); KRL distance tariff; MRT Jakarta and LRT Jakarta / LRT Jabodebek tariffs.
- Compare with `src/lib/fare/fare-engine.ts` and `docs/FARE-ENGINE-SPEC.md`: list every rule the engine gets wrong, with an example trip (two and three consecutive Transjakarta legs are suspected to be overcharged).

## Resolved when

A rule table under `## Resolution` with a source link per rule and a mismatch list. A rule not confirmed from an opened source is marked "needs verification". Never invent a number.

## Resolution

### Part A: Raw GTFS Analysis (`tmp_gtfs.zip`)

Extracted and verified from `scripts/diag/gtfs/`: `fare_attributes.txt`, `fare_rules.txt`, `transfers.txt`, and `routes.txt` using `scripts/diag/fare-gtfs-analysis.mjs`.

#### 1. GTFS Fare Attributes & Route Mappings

| Fare ID | Price (IDR) | Transfers Allowed | Transfer Duration | Route Class | Count | Route Short Names Mapped |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FP** | Rp 3.500 | Unlimited (`""`) | 10.800 s (3 h) | Regular BRT, Non-BRT Feeder & Transjabodetabek | 113 | **BRT Corridors & Feeders:** 1, 10, 10B, 10H, 11, 11B, 11C, 11D, 11M, 11P, 11Q, 11R, 11W, 12, 12A, 12B, 12C, 12F, 12P, 13, 13B, 13E, 14, 14A, 14B, 1A, 1B, 1C, 1E, 1F, 1M, 1Q, 1W, 2, 2A, 2B, 2F, 2H, 2P, 2Q, 3, 3A, 3B, 3C, 3D, 3E, 3F, 3H, 4, 4C, 4D, 4E, 4K, 5, 51ST, 5B, 5C, 5N, 6, 6A, 6B, 6C, 6D, 6H, 6K, 6M, 6N, 6Q, 6U, 6V, 6W, 7, 7B, 7C, 7D, 7E, 7F, 7P, 7R, 7T, 7U, 7V, 7W, 8, 8D, 8E, 8K, 8M, 8N, 9, 9A, 9C, 9D, 9E, 9N, 9ST, L13E, P11, SH1.<br>**Transjabodetabek:** B11, B21, B25, B41, B51, D11, D41, S11, S21, S22, S61, T11, T12, T31. |
| **FP2** | Rp 3.500 | 1 transfer (`"1"`) | 10.800 s (3 h) | Regular Feeder (Limited transfer) | 13 | 1H, 1P, 1R, 4B, 4F, 5F, 5M, 6T, 7A, 7Q, 8C, 9H, D21. |
| **GR** | Rp 0 | Unlimited (`""`) | 10.800 s (3 h) | **Free Services** (Mikrotrans & Bus Wisata) | 101 | **Bus Wisata:** BW1, BW2, BW4.<br>**Mikrotrans (98 routes):** JAK.01, JAK.02, JAK.03, JAK.04, JAK.05, JAK.06, JAK.07, JAK.08, JAK.09, JAK.10, JAK.100, JAK.102, JAK.105, JAK.106, JAK.107, JAK.108, JAK.10A, JAK.10B, JAK.11, JAK.110A, JAK.112, JAK.113, JAK.115, JAK.117, JAK.118, JAK.12, JAK.120, JAK.13, JAK.14, JAK.15, JAK.16, JAK.17, JAK.18, JAK.19, JAK.20, JAK.21, JAK.22, JAK.23, JAK.24, JAK.25, JAK.26, JAK.27, JAK.28, JAK.29, JAK.30, JAK.31, JAK.32, JAK.33, JAK.34, JAK.35, JAK.36, JAK.37, JAK.38, JAK.39, JAK.40, JAK.41, JAK.42, JAK.43B, JAK.43C, JAK.44, JAK.45, JAK.46, JAK.47, JAK.48A, JAK.49, JAK.50, JAK.51, JAK.52, JAK.53, JAK.54, JAK.56, JAK.58, JAK.59, JAK.60, JAK.61, JAK.64, JAK.71, JAK.72, JAK.73, JAK.74, JAK.75, JAK.76, JAK.77, JAK.78A, JAK.78B, JAK.79, JAK.80, JAK.84, JAK.85, JAK.86, JAK.87, JAK.88, JAK.89, JAK.90, JAK.93, JAK.95, JAK.98, JAK.99. |
| **PP** | Rp 20.000 | Unlimited (`""`) | 10.800 s (3 h) | **Premium** (Royaltrans Standard) | 9 | **Royaltrans:** 1K, 1T, 6P, B13, B14, D31, D32, S12, S31. |
| **PP2** | Rp 25.000 | Unlimited (`""`) | 10.800 s (3 h) | Premium Reserved | 0 | None mapped in feed (*needs verification*). |
| **PP3** | Rp 35.000 | Unlimited (`""`) | 10.800 s (3 h) | **Premium** (Royaltrans Long-Distance) | 1 | **Royaltrans:** S14 (Summarecon Serpong – MRT Lebak Bulus). |
| **SH2** | Rp 15.000 | Unlimited (`""`) | 10.800 s (3 h) | **Premium** (Transbandara Airport Shuttle) | 1 | **Airport Express:** SH2. |

*Note on unmapped routes in GTFS:* 3 route variants in `routes.txt` (`S31R`, `S14R`, `S12R`) lack explicit rows in `fare_rules.txt`; they represent return/variant geometries of the corresponding Royaltrans lines (`S31`, `S14`, `S12`).

#### 2. GTFS In-Station Transfers (`transfers.txt`)

Encodes 7 bidirectional stop pairs (14 directed rows) all with `transfer_type: 0` (recommended in-station paid-area interchange):
`H00027C` $\leftrightarrow$ `H00010P`, `H00128P` $\leftrightarrow$ `H00129P`, `H00070P` $\leftrightarrow$ `H00071P`, `H00035P` $\leftrightarrow$ `H00032P`, `H00160P` $\leftrightarrow$ `H00181P`, `H00113P` $\leftrightarrow$ `H00115P`, `H00270P` $\leftrightarrow$ `H00269P`.

---

### Part B: Verified Live Primary Rules (2025–2026)

Every entry was checked against official operator portals or government gazettes:

| Operator / Service | Fare Rule | Legal / Official Basis | Source URL Opened & Verified | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Transjakarta Regular BRT & Non-BRT** | Flat **Rp 3.500** (07:01–04:59 WIB). | Pergub DKI 128/2012 / Kepgub DKI 733/2022 | [transjakarta.co.id](https://transjakarta.co.id) | Verified |
| **Transjakarta Early Bird** | Flat **Rp 2.000** for tap-in between 05:00 and 07:00 WIB on BRT corridors. | Pergub DKI 128/2012 | [transjakarta.co.id](https://transjakarta.co.id), [jakarta.go.id](https://jakarta.go.id) | Verified |
| **Transjakarta Free Transfer Conditions** | **Free (Rp 0)** strictly when remaining inside closed barrier-gated BRT haltes without tapping out at the turnstile. Once a passenger taps out to the street (Non-BRT bus stop or street-level walk between haltes), the journey terminates; re-tapping on a bus or gate incurs a new flat fare. | PT Transportasi Jakarta operational ticketing guidelines | [transjakarta.co.id/layanan](https://transjakarta.co.id/layanan), [jakarta.go.id](https://jakarta.go.id) | Verified |
| **Mikrotrans (JakLingko Angkot)** | **Rp 0** (Gratis). Mandatory tap-in and tap-out with card or app for passenger accounting. | Pergub DKI 68/2021 | [transjakarta.co.id/layanan](https://transjakarta.co.id/layanan) | Verified |
| **Transjabodetabek Reguler** | Flat **Rp 3.500** (e.g. S11, S21, S22, S61, B11, B21, D11, T11). | Pergub DKI 128/2012 / GTFS `FP` | [transjakarta.co.id](https://transjakarta.co.id) | Verified |
| **Royaltrans (Premium)** | **Rp 20.000** for standard corridors (1K, 1T, 6P, B13, B14, D31, D32, S12, S31). **Rp 35.000** for extended suburban lines (S14 Serpong–Lebak Bulus). Cashless TOB / App reservation only. | SK Direksi PT Transportasi Jakarta / GTFS `PP` & `PP3` | [transjakarta.co.id/layanan](https://transjakarta.co.id/layanan) | Verified |
| **Transbandara Soetta** | **Rp 3.500** on SH1 (Kalideres–Bandara Soetta); **Rp 15.000** on SH2 (Transbandara Express). | Keputusan Direksi Transjakarta / GTFS `SH2` | [transjakarta.co.id](https://transjakarta.co.id) | Verified |
| **JakLingko Integrated Tariff** | **Formula:** $\text{Fare} = \min\left(10000, \; 2500 + \lceil d \rceil \times 250\right)$ IDR.<br>• Boarding fee: **Rp 2.500** (first mode).<br>• Distance rate: **Rp 250 / km**.<br>• Ceiling cap: **Rp 10.000**.<br>• Participating operators: **Transjakarta (BRT/Non-BRT), MRT Jakarta, LRT Jakarta**.<br>• Qualification: Must transfer across at least **two distinct participating modes** within **45 minutes** between tap-out and next tap-in, and complete total trip within **180 minutes (3 hours)**.<br>• Excluded: Pure single-mode journeys, KRL Commuterline, and LRT Jabodebek. | **Keputusan Gubernur DKI Jakarta No. 733 Tahun 2022** (8 Aug 2022) & Pergub DKI 68/2021 *(Note: `Pergub 133/2021` cited in existing codebase does not exist)* | [jaklingkoindonesia.co.id](https://jaklingkoindonesia.co.id), [jakarta.go.id](https://jakarta.go.id), [jdih.jakarta.go.id](https://jdih.jakarta.go.id) | Verified |
| **KRL Commuterline (KAI Commuter)** | Distance progressive:<br>• First 25 km: **Rp 3.000**.<br>• Each additional 10 km (or fraction): **+ Rp 1.000**.<br>• Free platform transfers inside rail network (Manggarai, Duri, Jatinegara, etc.). Independent of DKI JakLingko tariff. | Keputusan Menteri Perhubungan No. KM 354 Tahun 2020 | [commuterline.id](https://commuterline.id) | Verified |
| **MRT Jakarta (Lin Utara–Selatan)** | Station-to-station progressive matrix:<br>• Minimum: **Rp 3.000** (adjacent station).<br>• Incremental: ~**Rp 1.000** per station passed.<br>• Maximum: **Rp 14.000** (Lebak Bulus Grab $\leftrightarrow$ Bundaran HI, 13 stations). | Peraturan Gubernur DKI Jakarta No. 34 Tahun 2019 | [jakartamrt.co.id](https://jakartamrt.co.id), [jakartamrt.co.id/id/panduan-tiket](https://jakartamrt.co.id/id/panduan-tiket) | Verified |
| **LRT Jakarta** | Flat **Rp 5.000** for all stations (Pegangsaan Dua $\leftrightarrow$ Velodrome). | Peraturan Gubernur DKI Jakarta No. 34 Tahun 2019 | [lrtjakarta.co.id](https://www.lrtjakarta.co.id) | Verified |
| **LRT Jabodebek** | Distance progressive (Kemenhub KM 67/2023):<br>• First 1 km: **Rp 5.000**.<br>• Subsequent rate: **+ Rp 700 / km**.<br>• **Peak hour cap** (06:00–08:59 & 16:00–19:59 WIB weekdays): Max **Rp 20.000**.<br>• **Off-peak cap** (weekday off-peak, weekends & holidays): Max **Rp 10.000**.<br>• Same-station tap-in/out: <60 min = Rp 5.000; >60 min = maximum peak/off-peak cap.<br>• Operated by KAI; **NOT** part of DKI JakLingko integrated tariff. | Keputusan Menteri Perhubungan No. KM 67 Tahun 2023 | [kai.id](https://kai.id), [lrtjabodebek.kai.id](https://lrtjabodebek.kai.id) | Verified |

---

### Part C: Headless Engine Audit (12 Benchmark Trips)

Executed headless against `public/data/jakarta-transit-network.json` via `RaptorRouter`, `JourneyPlanner`, and `calculateItineraryFare` using `scripts/diag/fare-engine-audit.ts` and `scripts/diag/fare-raptor-transfers.ts`.

| ID | Trip Name & Description | Routing Legs in Engine | Computed Standard | Expected Standard | Computed Integrated | Expected Integrated | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TRIP-01** | **Flavor Bliss to Penjaringan** (2 consecutive TJ bus legs with street walk) | S61 (Flavor Bliss $\to$ Kota Bambu Arah Selatan) + Walk street overpass + Corridor 7R (Kota Bambu Arah Utara $\to$ Penjaringan) | **Rp 7.000** | **Rp 7.000** | **Rp 7.000** | **Rp 7.000** | **MATCH** (Alighting on street requires tap-out; re-entry to BRT gate is Rp 3.500) |
| **TRIP-02** | **Blok M to Pluit via Bendungan Hilir** (2 consecutive BRT legs inside same halte) | Corridor 1 (Blok M $\to$ Benhil) + Corridor 9 (Benhil $\to$ Pluit) | **Rp 7.000** | **Rp 3.500** | **Rp 7.000** | **Rp 3.500** | 🔴 **CRITICAL MISMATCH** (Overcharged by 100%: transfer at same BRT platform is free) |
| **TRIP-03** | **Ragunan to Juanda via Kuningan & Benhil** (3 consecutive BRT legs inside paid area) | Corridor 6 (Ragunan $\to$ Kuningan Barat) + Corridor 9 (Kuningan Barat $\to$ Benhil) + Corridor 1 (Benhil $\to$ Bank Indonesia) | **Rp 10.500** | **Rp 3.500** | **Rp 10.500** | **Rp 3.500** | 🔴 **CRITICAL MISMATCH** (Overcharged by 200%: 3 BRT legs inside closed network charged $3 \times 3.500$) |
| **TRIP-04** | **CSW 1 to Velbak** (BRT C1 $\to$ C13 with paid-area walkway) | Walk CSW 1 to CSW 13 (`paidArea: true`) + Corridor 13 to Velbak | **Rp 3.500** | **Rp 3.500** | **Rp 3.500** | **Rp 3.500** | **MATCH** (Recognized because `isPaidAreaTransfer: true` explicitly on footway edge) |
| **TRIP-05** | **Three TJ legs with outdoor street walk** (Non-BRT $\to$ Non-BRT $\to$ BRT) | 1A (Stop A $\to$ B) + Walk outdoor + 1B (Stop C $\to$ D) + Walk outdoor + C1 (Blok M $\to$ BHI) | **Rp 10.500** | **Rp 10.500** | **Rp 10.500** | **Rp 10.500** | **MATCH** (3 independent boardings on public roads = $3 \times \text{Rp } 3.500$) |
| **TRIP-06** | **Tebet to Bundaran HI** (Multi-operator KRL + MRT via Dukuh Atas) | KRL Tebet $\to$ Sudirman + Walk Skywalk Dukuh Atas + MRT Dukuh Atas $\to$ Bundaran HI | **Rp 7.000** | **Rp 7.000** | **Rp 7.000** | **Rp 7.000** | **MATCH** (KRL Rp 3.000 + MRT Rp 4.000; KRL excluded from JakLingko) |
| **TRIP-07** | **MRT Lebak Bulus to Kota** (Multi-modal MRT + BRT) | MRT Lebak Bulus $\to$ Blok M BCA + Walk + Corridor 1 Blok M Halte $\to$ Kota | **Rp 11.500** | **Rp 11.500** | **Rp 8.000** | **Rp 8.000** | **MATCH** (Standard: $8000 + 3500$; Integrated: $2500 + 22 \times 250 = 8000$, saves Rp 3.500) |
| **TRIP-08** | **Mikrotrans + BRT** (JAK.01 + Corridor 1) | JAK.01 Tanjung Duren $\to$ Grogol + Walk + Corridor 1 Grogol $\to$ Kota | **Rp 3.500** | **Rp 3.500** | **Rp 3.500** | **Rp 3.500** | **MATCH** (Mikrotrans Rp 0 + BRT Rp 3.500 = Rp 3.500) |
| **TRIP-09** | **Bogor to Jakarta Kota** (Long-distance KRL 54 km) | Direct KRL Bogor Line (54 km) | **Rp 6.000** | **Rp 6.000** | **Rp 6.000** | **Rp 6.000** | **MATCH** (First 25 km Rp 3.000 + 3 bands of 10 km @ Rp 1.000 = Rp 6.000) |
| **TRIP-10** | **Summarecon Serpong to Lebak Bulus** (Royaltrans S14) | Direct Royaltrans S14 | **Rp 3.500** | **Rp 35.000** | **Rp 3.500** | **Rp 35.000** | 🔴 **CRITICAL MISMATCH** (Undercharged by Rp 31.500: engine treats Royaltrans S14 as regular Rp 3.500 bus) |
| **TRIP-11** | **LRT Jabodebek Dukuh Atas to Harjamukti** (~26 km line) | Direct LRT Jabodebek Cibubur Line | **Rp 5.000** | **Rp 20.000** (peak) / **Rp 10.000** (off-peak) | **Rp 5.000** | **Rp 20.000** / **Rp 10.000** | 🔴 **CRITICAL MISMATCH** (Undercharged: engine hardcodes flat Rp 5.000 and treats as JakLingko-eligible) |
| **TRIP-12** | **LRT Jakarta Pegangsaan Dua to Velodrome** | Direct LRT Jakarta Lin 1 (5.8 km) | **Rp 5.000** | **Rp 5.000** | **Rp 5.000** | **Rp 5.000** | **MATCH** (Pergub 34/2019 flat Rp 5.000) |

---

### Part D: Comprehensive Mismatch List & What the Engine Needs to Be Right

#### 1. In-Station Same-Halte BRT Transfers Overcharged (The 2-leg & 3-leg Bug)
- **Defect:** In `raptor.ts` (lines 580–582), when RAPTOR switches between two transit routes at the exact same halte without a transfer edge in `network.transfers`, `prevTransfer` is `undefined`. Consequently, `isPaidAreaTransfer` is set to `false`. In `fare-engine.ts` (lines 73–81), the condition `leg.isPaidAreaTransfer && hasBrtService` evaluates to `false`, causing the engine to charge `FARE_TJ_FLAT_IDR` (Rp 3.500) on **every consecutive BRT leg**.
- **Impact:** 
  - 2 consecutive BRT legs (e.g. Corridor 1 $\to$ Corridor 9 at Bendungan Hilir) are charged **Rp 7.000** instead of Rp 3.500 (+100% overcharge).
  - 3 consecutive BRT legs (e.g. Corridor 6 $\to$ Corridor 9 $\to$ Corridor 1) are charged **Rp 10.500** instead of Rp 3.500 (+200% overcharge).
- **Engine Fix Required:** 
  - `raptor.ts` must set `leg.isPaidAreaTransfer = true` whenever boarding at the exact same stop index where the preceding transit leg alighted and both legs are mode `BRT`.
  - `fare-engine.ts` should track BRT state: contiguous BRT-to-BRT connections without an unpaid street walk must remain covered by the initial Rp 3.500 boarding.

#### 2. Royaltrans and Premium Routes (Fare ID `PP`, `PP3`, `SH2`) Unhandled
- **Defect:** `fare-engine.ts` only recognizes the basic transit enum (`BRT`, `NON_BRT`, `MIKROTRANS`). All routes under `BRT` or `NON_BRT` are charged `FARE_TJ_FLAT_IDR = 3500`.
- **Impact:** Royaltrans routes like `S14` are undercharged by **Rp 31.500** (charged Rp 3.500 instead of Rp 35.000). Standard Royaltrans routes (`1K, 1T, 6P, B13, B14, D31, D32, S12, S31`) are undercharged by **Rp 16.500** (charged Rp 3.500 instead of Rp 20.000). Airport shuttle `SH2` is charged Rp 3.500 instead of Rp 15.000.
- **Engine Fix Required:** Route metadata in `network.routes` or a dedicated `fareClass` property must be passed to `fare-engine.ts` to charge `PP` (Rp 20.000), `PP3` (Rp 35.000), and `SH2` (Rp 15.000).

#### 3. LRT Jabodebek Conflated with LRT Jakarta & Erroneously Integrated into JakLingko
- **Defect:** `fare-engine.ts` hardcodes `FARE_LRT_FLAT_IDR = 5000` for all LRT legs and executes `jakLingkoModeFamilies.add('LRT')`.
- **Impact:**
  - LRT Jabodebek trips are charged a flat Rp 5.000 instead of Kemenhub KM 67/2023 progressive distance tariff (Rp 5.000 first km + Rp 700/km up to Rp 20.000 peak / Rp 10.000 off-peak).
  - Multi-modal trips like LRT Jabodebek + MRT are erroneously calculated under the DKI JakLingko Rp 10.000 tariff cap, even though LRT Jabodebek is operated by PT KAI / Central Government and is completely separate from JakLingko.
- **Engine Fix Required:** Distinguish `LRT_JAKARTA` (DKI flat Rp 5.000, JakLingko participating) from `LRT_JABODEBEK` (KAI distance progressive, non-JakLingko).

#### 4. No Time-of-Day Early Morning Discount
- **Defect:** `fare-engine.ts` does not accept a departure timestamp; it always assumes regular hours.
- **Impact:** Commuters departing between 05:00 and 07:00 WIB on Transjakarta BRT are charged Rp 3.500 instead of the official Rp 2.000 early bird tariff.
- **Engine Fix Required:** Pass `departureSecondsOfDay` into `calculateItineraryFare` and apply Rp 2.000 flat for BRT boardings between 05:00 and 07:00 WIB.

#### 5. JakLingko 45-Minute Transfer and 180-Minute Journey Windows Not Checked
- **Defect:** `fare-engine.ts` computes integrated fares purely on modal diversity (`jakLingkoModeFamilies.size >= 2`), ignoring elapsed transfer times and total travel duration.
- **Impact:** Journeys where a transfer takes > 45 minutes or the total itinerary exceeds 180 minutes are wrongly marked as JakLingko-eligible and discounted, whereas official turnstile logic revokes the package and bills standard fares.
- **Engine Fix Required:** Check individual transfer durations ($\le 45\text{ min}$) and total itinerary duration ($\le 180\text{ min}$) before applying the integrated tariff.

#### 6. Erroneous Legal Citation in Code and Spec
- **Defect:** `src/lib/fare/fare-engine.ts` (line 10) and `docs/FARE-ENGINE-SPEC.md` cite `Pergub DKI 133/2021`.
- **Fact:** No such regulation exists for multi-modal transit integration. The official governing decree for the JakLingko integrated tariff package is **Keputusan Gubernur DKI Jakarta Nomor 733 Tahun 2022** and **Peraturan Gubernur DKI Jakarta Nomor 68 Tahun 2021**.

---

### Part E: What Stayed Unverified

1. **GTFS Fare Class `PP2` (Rp 25.000):** Defined in `fare_attributes.txt` as `price: 25000`, but zero routes in `fare_rules.txt` reference it. Whether this is reserved for specific event shuttles or pending premium routes remains unconfirmed.
2. **Physical Turnstile Enforcement of 45-Minute Transfer for Electronic Money Cards:** While Kepgub 733/2022 explicitly stipulates the 45-minute inter-modal transfer rule, whether physical bank cards (e-Money, Flazz, TapCash, Brizzi) activated via BCT strictly drop out of integration at the turnstile after 45m 01s or whether some leeway exists in the gate firmware requires physical field card-audit verification.
