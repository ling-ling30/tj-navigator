# Routing v2 spec (draft)

> Status: decided by Claude under the owner's delegation (2026-11-11). Graph and engine are **built and benchmarked** (slices 1–4); the app still runs the old engine until slice 5. The speed table is calibrated on published end-to-end times.
> Reference product: DB Navigator. Decisions and their evidence live in the tickets of the [Routing v2 map](../wayfinder/routing-v2/map.md); this file is what gets built.

## 1. Why the current engine fails (measured)

| Complaint | Cause in the code | Evidence |
|---|---|---|
| Few routes to choose | One criterion (earliest arrival): at most one path per transfer count | 68 % of 300 queries give 1 distinct option, 0,3 % give 3+ |
| Cannot choose modes | Mode chips never reach the search; single-select | Code trace |
| Indirect routes | Riding time = stops × a fixed 140–180 s, so distance is free | Circuity p90 2,7×, worst 9,3× |
| Unreal durations | Same rule; and the GTFS times are a ~11 km/h template, so they cannot replace it | 694 trips recomputed |
| Wrong lines | One stop pattern kept per route and direction (corridor 9 keeps 7 of 50 stops); loop routes (166 of 241) break hop counting; invented corridors shadow real ones | GTFS audit |
| Wrong prices | No fare class per line; in-halte transfers charged again | Fare research |

## 2. What the traveller gets

- **3 to 5 genuinely different options** when the network has them, never padded with bad ones, never empty (the existing answer ladder stays: relaxed walk, closest approach, walk only, same place).
- **Mode groups** to switch on and off (BRT, Bus, Mikrotrans, KRL, MRT, LRT), respected strictly, plus a labelled suggestion when a switched-off mode is clearly faster.
- **Travel options:** maximum transfers, walking tolerance, transfer time, premium buses.
- **Believable durations** shown as a typical figure with a range, because buses run on headways.
- **Interchangeable lines as one leg:** "Naik 9, 9A atau 9E".

## 3. Model

**Option.** One path: an ordered list of legs. Not one departure. (DB Navigator lists departures because trains are timetabled; ours are not.)

**Line and pattern.** A line is a GTFS route or a rail line. A pattern is one ordered stop sequence of a line in one direction. All patterns in the feed are kept. A stop may appear twice in a pattern (loops), so the engine always works with positions in the pattern, never with "the index of this stop".

**Riding time.** Per hop: distance along the route ÷ speed for the hop's class and time of day. Distance comes from the GTFS shape between the two stops (straight line × 1,3 when a trip has no shape). The feed's own stop times are not used.

| Hop class | Applies to | km/h, off-peak / peak |
|---|---|---|
| busway | BRT corridor lines | 22 / 19 |
| street | other Transjakarta buses in mixed traffic | 18 / 13 |
| mikro | Mikrotrans | 16 / 13 |
| toll | hops of 2,5 km or more on Transjabodetabek and Royaltrans lines | 35 / 27 |
| krl | KRL | 39 / 35 |
| mrt | MRT | 31 |
| lrt | LRT Jakarta 27, LRT Jabodebek 40 | |

Basis: published end-to-end times (corridor 1, S61, S11, P11, B51, rail operators). `npx vite-node scripts/routing-v2/calibrate.ts` prints model against published; express routes fit within about a quarter.

Speeds are a table in one file (`time-model.ts`), with peak (weekdays 06:00–09:00 and 16:00–20:00) and off-peak values, so calibration never needs a graph rebuild.

**Waiting.** Expected wait = half the headway of the pattern in the time window of the query (`frequencies.txt`, by day type), capped at 15 minutes. A pattern with no window at that time does not run and is skipped. A leg with a headway of 30 minutes or more carries a warning ("jarang, tiap 60 mnt").

**Common lines.** Patterns that serve the same boarding stop and alighting stop in the same order, in the same fare class, with a ride time within 20 % (or 3 minutes) of the chosen one, form one leg. Its wait uses the pooled frequency: wait = 1 ÷ (2 × Σ 1/headway). Its label lists the line names. Pooling across lines happens after the search, for the real boarding and alighting stops; during the search only patterns of the same line pool, so a rare line never borrows a busy line's frequency.

**Continuation.** Feeds split a line at its terminus (corridor 1 at Kali Besar). Boarding the next pattern of the same line at that terminus is the same ride: no penalty, no new fare, one leg.

**Walking.** 4,5 km/h with a detour factor of 1,3 (unchanged). Access and egress up to 1,5 km (normal). A chosen stop is a named place: no walk to it, and the stops around it may be used too. Footpaths between stops (400 m, eight nearest, same-name stops, platforms of one halte, rail stations with a gate allowance) are derived when the graph loads, not shipped in the file.

**Duration shown.** Typical = riding + walking + expected waits. Range = from "no waiting at all" to "a full headway at every boarding" (each capped). Shown as "58 mnt" with "52–70 mnt" beside it.

## 4. Search

**Cost.** Each search minimises a generalised cost in seconds:

`cost = ride × 1,0 + wait × 1,0 + walk × 2,0 + transfer penalty per boarding after the first`

Transfer penalty: 300 s; 120 s when the change stays inside a paid area or the same halte. Minimum transfer buffer: 120 s (normal) or 300 s (longgar). These are OTP2's documented defaults and common practice (alternatives ticket); they are starting values, tuned on the benchmark.

**Algorithm.** Round-based line scanning (RAPTOR's structure): round k holds the best cost to each stop using k rides. In a round, every pattern touching an improved stop is scanned once, position by position, carrying `min(carried + hop ride, previous round at this stop + wait + penalty)`. Then transfers are relaxed from stops improved by a ride. Because waits are expectations that do not depend on the exact arrival second, costs are static within a query, so this is exact for the model.

**Hard rules.** At most 3 rides' worth of transfers (bebas) or the traveller's limit; at most one walk between two rides; no boarding the opposite direction of the line just left; lines of a switched-off mode group and excluded fare classes are not scanned.

**Where several options come from.** One query runs the search several times:

1. balanced (the cost above)
2. fastest (all weights 1, no transfer penalty)
3. fewest transfers (penalty 20 minutes)
4. least walking (walk × 5)
5. up to two re-runs that multiply by 1,5 the ride cost of the main line (the longest leg) of each option already found

Every run yields one candidate per transfer count. With restricted modes, one extra unrestricted run feeds the mode suggestion.

**Filter chain** (in this order):

1. Rebuild each candidate: pool common lines, recompute typical time, range, walk, transfers, fare, and the balanced cost.
2. Remove duplicates (same sequence of pooled lines and same change points).
3. Group by similarity: when two candidates share 85 % or more of their riding distance on the same lines, keep the cheaper in balanced cost.
4. Drop a candidate whose balanced cost exceeds 1,5 × the best + 15 minutes.
5. Drop a candidate that is worse or equal on all of time, transfers, walking and fare than another.
6. Keep at most 5, ordered by balanced cost. Add a walk-only option when the trip is 1,5 km or less.
7. Badges, each given once: tercepat, transit paling sedikit, termurah, jalan paling sedikit.

**Rejected.** McRAPTOR with four criteria (large label bags in a browser, and Pareto sets are not diverse). Range queries (need timetables). A separate circuity filter (distance-based time should make roundabout routes lose on cost; circuity is measured in the benchmark and a filter is added only if p90 stays above 2,0).

## 5. Modes and options

Decided in [Mode choice and travel options](../wayfinder/routing-v2/tickets/08-modes-and-travel-options.md). Summary: six multi-select chips; the group comes from the line; strict filter inside the search; suggestion row when the unrestricted best is faster by 15 minutes or 25 %; banner plus "Dengan moda lain" when the chosen modes give nothing; options sheet (transit maksimal, jalan kaki, waktu transit, bus premium).

Walking tolerance values: sedikit = access 800 m, walk × 3; normal = access 1,5 km, walk × 2; jauh = access 3 km, walk × 1,5.

## 6. Fares

Decided in [Fare model](../wayfinder/routing-v2/tickets/09-fare-model.md). Every price is shown as an estimate ("perkiraan").

## 7. Compiled graph v2

```
stops:     [id, name, lat, lon, halte]   (halte = GTFS parent station, a paid area)
lines:     [id, shortName, longName, color, modeGroup, fareClass, serviceClass]
patterns:  [lineIdx, direction, headsign, stopIdx[], hopMeters[],
            windows[[dayMask, startSec, endSec, headwaySec], ...]]
transfers: [fromStop, toStop, walkSec, meters, flags]   (curated only)
```

- Day types: weekday, saturday, sunday (from `calendar.txt` service ids).
- The invented corridor routes and their synthetic stops are removed; hub seeds are re-pointed to the real GTFS stops by name and distance. Rail seeds stay.
- At load, the worker builds typed-array indexes: stop → (pattern, position) and stop → transfers.
- Size: 750 KB uncompressed (the old graph is 2,2 MB), because footpaths are derived at load and the hop class is derived from the line.

## 8. Code layout

Small files, one job each (owner's rule: about 150 lines, no magic numbers, named constants):

```
src/lib/router/
  network-index.ts   typed arrays and indexes
  time-model.ts      speeds, waits, day types (the calibration table)
  cost-profiles.ts   weights per profile and per walking tolerance
  line-scan.ts       one cost search (rounds, pattern scan, transfers)
  path-builder.ts    back-pointers → legs
  pooling.ts         common lines
  option-filter.ts   the filter chain and badges
  planner.ts         runs the profiles, modes, suggestion, answer ladder
src/lib/fare/        fare classes and rules
```

Worker API: `plan({ origin, destination, departAt, modes, options }) → { options, suggestion?, answerKind }`.

## 9. Benchmark (the gate for every slice)

`scripts/bench-routing.ts`, run headless, prints pass or fail and these numbers:

- **Golden commutes** pass: the owner's commute (S61 then a corridor-9-family line via Kota Bambu or Taman Anggrek to Penjaringan must be option 1 or 2); trunk trips settled by official line maps (Blok M → Kota on corridor 1; Lebak Bulus → Bundaran HI on MRT; Bogor → Jakarta Kota on KRL); 200 random stop pairs on one pattern must offer that line direct.
- **Variety:** on 300 fixed random pairs at least 3 km apart, the share with 2+ and 3+ distinct options (today 32 % and 0,3 %). Target: 60 % and 30 %, without padding.
- **Directness:** circuity of the first option, p90 ≤ 2,0 (today 2,7).
- **Sanity:** no option with two walks in a row, none with the opposite direction of the same line back to back, none empty.
- **Speed:** p95 of a full query ≤ 150 ms in Node (today 25 ms for one search).
- The 16 existing audit trips, with expectations updated only where the old expectation was a product of the old model, each change explained.

## 10. Build slices

1. **Graph v2**: patterns, shape distances, hop classes, headway windows, mode group, fare class; remove invented corridors; graph report script.
2. **Engine core**: indexes, time model, cost search, path builder, mode filter, options; benchmark script with golden commutes.
3. **Alternatives**: profiles, re-runs, pooling, filter chain, badges, suggestion; answer ladder kept.
4. **Fares**: classes and rules.
5. **UI**: multi-select chips on search and results, options sheet, result rows (typical time and range, pooled line chain, changes, walking, fare, frequency), journey detail with pooled lines, sort buttons; both languages.
6. **Verification**: benchmark numbers recorded, screens checked at 390 px, old router code removed.

## 11. Known limits

- Speeds are class averages, not measured per road. Live positions can refine them later.
- Rail uses headways, not the real timetable, so no "earlier / later" yet.
- No "arrive by" search in this version.
- Fare rules for street transfers between Transjakarta services are disputed between the feed and the research; prices are estimates.
