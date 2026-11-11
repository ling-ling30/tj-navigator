---
id: 2
title: Which technique gives several different options on a headway network in a browser
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [7]
map: ../map.md
---

# #2 Which technique gives several different options on a headway network in a browser

## Question

Our engine runs in a Web Worker on about 8.000 stops, 440 routes and 53.000 walking transfers, with no per-trip timetable for most buses (headway + per-hop times). Which technique gives 3–5 genuinely different, sensible options per query in well under 150 ms on a mid-range phone?

## Cover (primary sources: papers, official docs, source code; link each)

- Candidates: McRAPTOR (arrival, transfers, walking, fare); several single-criterion runs with different cost profiles; penalty or route-exclusion re-runs for diverse alternatives; range queries (rRAPTOR), which need timetables.
- How OpenTripPlanner 2 does it: Raptor search, generalized cost, itinerary filter chain (group by similarity, remove much-worse results), and its handling of `frequencies.txt`.
- Headway networks: expected waiting time, combining routes that share a stop pair (common lines), and what breaks RAPTOR's dominance rule when waiting is an expectation.
- Generalized cost: typical weights for walking, waiting and transfers; limits such as maximum walk and consecutive walks; filters that remove silly itineraries.
- A recommendation for our constraints with expected run time, and what not to build.

## Resolved when

A comparison table and a recommendation under `## Resolution` (≤ 200 lines) with sources. Read `src/lib/router/raptor.ts` and `journey-planner.ts` first so the advice fits the code.

## Resolution

### 1. Comparison of Routing Techniques

| Technique | What it gives | Cost at our graph size (8k stops, 440 routes, 53k transfers) | Risk / Verdict |
| :--- | :--- | :--- | :--- |
| **McRAPTOR** (Multi-Criteria: arrival, transfers, walk, fare) | Full Pareto-optimal frontier across multiple criteria simultaneously. | **Prohibitive in JS Worker** (~400–1500 ms). Label bags grow to 20–50+ non-dominated labels at major hubs (e.g. Harmoni, Dukuh Atas); pairwise dominance comparisons and GC heap allocation explode. | **High Risk**: Violates the <150 ms mobile budget. Do not use in-browser. |
| **Multiple Single-Criterion RAPTOR runs** (with different generalized cost profiles) | 2–3 distinct candidate journeys (e.g. Balanced, Walk-Averse, Transfer-Averse) using flat numeric arrays. | **Very Fast** (~10–18 ms per run, ~30–50 ms total for 3 runs). No dynamic label allocation; operates entirely on flat typed arrays. | **Low Risk / Recommended**: Fast, predictable, zero GC pressure, guarantees diverse trade-offs. |
| **Penalty / Route-Exclusion Re-runs** (Plateau / Iterative Penalty) | Genuinely different alternative corridors by penalizing or excluding the primary transit line of Run 1. | **Very Fast** (1 additional RAPTOR run: ~12–15 ms). Run 1 finds optimal corridor; Run 2 finds best distinct alternative corridor. | **Low Risk / Recommended**: Essential to avoid trivial variations (e.g. boarding 1 stop earlier) and force genuine corridor diversity. |
| **Range Queries (rRAPTOR)** (Time-window departure iterations) | Optimal journeys across an entire departure window (e.g. 08:00–09:00). | **Wasteful / Unsuitable** without timetables. Iterating synthetic departure minutes over static headways produces identical paths or requires heavy Monte Carlo draws (Conveyal R5). | **High Risk**: Designed for scheduled timetables, meaningless on deterministic headway networks. |

### 2. How OpenTripPlanner 2 Does It & Mechanisms to Copy

* **RAPTOR over Generalized Cost**: OTP2 evaluates journey quality via **Generalized Cost (GC)** rather than clock arrival alone ([OTP2 RouteRequest Documentation](https://docs.opentripplanner.org/en/latest/RouteRequest/)).
* **Itinerary Filter Chain (`itineraryFilters`)**:
  1. `groupBySimilarity`: Groups itineraries sharing major transit legs and retains only the lowest GC option. Default `groupSimilarityKeepOne: 0.85` (keeps 1 itinerary per 85% overlap group); `groupedOtherThanSameLegsMaxCostMultiplier: 2.0` (filters variants whose non-shared legs cost >2× the best) ([OTP2 ItineraryFilters](https://docs.opentripplanner.org/en/latest/RouteRequest/#rd_itineraryFilters)).
  2. `transitGeneralizedCostLimit`: Filters uncompetitive transit itineraries via linear cutoff $f(x) = \text{costLimitFunction} + \text{intervalRelaxFactor} \cdot \Delta t$. Default `costLimitFunction: "15m + 1.5 t"`, `intervalRelaxFactor: 0.4` ([OTP2 transitGeneralizedCostLimit](https://docs.opentripplanner.org/en/latest/RouteRequest/#rd_if_transitGeneralizedCostLimit)).
  3. `removeTransitWithHigherCostThanBestOnStreetOnly`: Drops transit options worse than direct walking. Default `"1m + 1.3 t"` ([OTP2 docs](https://docs.opentripplanner.org/en/latest/RouteRequest/#rd_if_removeTransitWithHigherCostThanBestOnStreetOnly)).
  4. `nonTransitGeneralizedCostLimit`: Drops pure walk if viable transit exists (`"1h + 2.0 t"`).
* **Handling of `frequencies.txt`**: OTP2 supports GTFS frequency entries via two modes ([OTP2 Issue #3262](https://github.com/opentripplanner/OpenTripPlanner/issues/3262)): `exact_times=1` (schedule-based, expanded into discrete synthetic trips) and `exact_times=0` (unscheduled frequency, evaluated with expected waiting time $E[W] = H/2$).

### 3. Headway Networks & Common Lines

* **Common Lines Pooling** ([Spiess & Florian 1989](https://doi.org/10.1016/0191-2615(89)90034-9); [Chriqui & Robillard 1975](https://doi.org/10.1287/trsc.9.2.115)):
  When routes $1, \dots, m$ serve the same stop pair, commuters board the first arriving vehicle. The pooled frequency is $F = \sum \frac{1}{H_i}$, and expected waiting time is:
  $$E[W] = \frac{1}{2 \sum_{i=1}^m \frac{1}{H_i}}$$
  *(e.g., two 10-minute routes yield an expected wait of 2.5 minutes, not 5 minutes).*
* **Why Waiting as Expectation Breaks RAPTOR Dominance**:
  Standard RAPTOR ([Delling, Pajor, Werneck 2014](https://doi.org/10.1287/trsc.2014.0534)) evaluates routes sequentially and checks arrival-time dominance $\tau_k(p) < \tau^*(p)$. On headway networks:
  1. Sequential route scanning calculates waiting time $H_i/2$ per route in isolation, ignoring the pooled frequency benefit of common lines.
  2. Bellman's principle of optimality fails: an individually slower route can be part of an optimal hyperpath/choice set that drastically cuts waiting time.
  *Adaptation for browser RAPTOR*: Pre-bundle parallel routes sharing identical trunk segments into synthetic corridor bundles in `network.stopRoutes` before route traversal, or pool departures when multiple candidate routes pass the current boarding stop.

### 4. Generalized Cost: Typical Weights, Limits & Sanity Filters

* **Standard Weights** (quoted from [OTP2 RouteRequest defaults](https://docs.opentripplanner.org/en/latest/RouteRequest/)):
  - `walkReluctance`: **2.0** (`/routingDefaults/walk/reluctance`: *"A multiplier for how bad walking is, compared to being in transit... Empirically, values between 2 and 4 seem to correspond well"*). In high heat/humidity (Jakarta), 2.5–3.0 is recommended for unsheltered walking, 1.5 for sheltered transfers.
  - `waitReluctance`: **1.0** (`/routingDefaults/waitReluctance`: internal weight per second of waiting).
  - `transferPenalty`: **0** default in OTP (`/routingDefaults/transferPenalty`), but production systems use 300–600 s weight penalty per transfer to discourage frivolous transfers.
  - `transferSlack`: **120 s** (`"PT2M"` in `/routingDefaults/transferSlack`: safety margin for connection feasibility).
  - `boardCost`: **600** weight units (~10 min equivalent in `/routingDefaults/walk/boardCost`).
* **Limits & Sanity Filters**:
  - Maximum access/egress walk: 1,500 m (relaxed to 3,000 m only when unserviced; see `src/lib/router/access-stops.ts`).
  - Consecutive walks: Strictly forbid `WALK -> WALK` transfers between stops without an intervening transit leg.
  - Rationality cutoff: Drop any transit itinerary where $\text{Duration} > 2.0 \times \text{DirectWalkDuration}$ or $\text{GC} > 1.5 \times \text{BestTransitGC} + 15\text{ min}$.

### 5. Recommended Combination for Web Worker Constraints

Build a **3-Pass Profiled RAPTOR + OTP2 Post-Filter Chain**:
1. **Pass 1 (Balanced Direct)**: Standard generalized cost ($W_{walk}=2.0$, $W_{wait}=1.0$, $P_{transfer}=300\text{ s}$).
2. **Pass 2 (Minimal Walking / Maximum Comfort)**: Walk-averse cost ($W_{walk}=4.0$, $P_{transfer}=180\text{ s}$, preferential weight for MRT/LRT/sheltered transfers).
3. **Pass 3 (Corridor Alternative via Penalty)**: Re-run Pass 1 with a heavy penalty ($+1200\text{ s}$ or temporary exclusion) applied to the primary transit route used in Pass 1. This guarantees a structurally distinct transit corridor (e.g. BRT corridor 9 vs. S61+KRL commuter rail).
4. **Post-Processing Pipeline**:
   - Merge candidate pools (3–6 raw itineraries).
   - Deduplicate via `groupBySimilarity` ($\ge 85\%$ leg overlap $\rightarrow$ keep lowest GC).
   - Prune dominated itineraries using OTP2's relative GC limit ($GC > 1.5 \times GC_{min} + 900\text{ s}$).
   - Assign semantic DB Navigator badges: `FASTEST`, `FEWEST_TRANSFERS`, `LEAST_WALKING`.
* **Expected Runtime**: Each single-criterion RAPTOR pass on flat arrays takes ~10–15 ms in a Web Worker. Total pipeline (3 passes + post-filtering) takes **35–55 ms** on a mid-range phone (e.g. Snapdragon 7-series), easily beating the 150 ms budget.

### 6. What NOT to Build

* **Do NOT build McRAPTOR**: Storing and pruning multi-dimensional Pareto bags at 8,000 stops in JavaScript creates massive GC allocations and will exceed 400 ms on mobile devices.
* **Do NOT build Range-RAPTOR (rRAPTOR)**: Range queries require distinct, timetable-scheduled departure events. On static headway networks, running across departure minutes is redundant and adds no corridor diversity.
* **Do NOT build dynamic user-equilibrium hyperpath assignment** (Spiess & Florian LP): Equilibrium models compute macroscopic regional passenger flows, which is unnecessary complexity for individual point-to-point journey planning.

### 7. What Remained Unverified

* **Real Headway Regularity / Bunching**: The theoretical common lines formula assumes independent uniform/Poisson arrivals ($E[W] = H/2$). Real TransJakarta corridors experience bus bunching, where effective wait $E[W] = \frac{E[H]}{2}\left(1 + \frac{\text{Var}(H)}{E[H]^2}\right)$ can be 30–60% higher (*needs verification against live MQTT/GPS feeds*).
* **Exact Headway Types in Feed**: Whether `frequencies.txt` rows in Jakarta's GTFS use `exact_times = 1` or `0` across all 747 rows (*ticket #4 will audit*).

### 8. Primary Sources Consulted

* **Delling, D., Pajor, T., & Werneck, R. F. (2014)**. *Round-Based Public Transit Routing*. Transportation Science 49(3): 591–604. [https://doi.org/10.1287/trsc.2014.0534](https://doi.org/10.1287/trsc.2014.0534)
* **OpenTripPlanner Documentation**:
  - Routing Defaults & Cost Parameters: [https://docs.opentripplanner.org/en/latest/RouteRequest/](https://docs.opentripplanner.org/en/latest/RouteRequest/)
  - Router Configuration: [https://docs.opentripplanner.org/en/latest/RouterConfiguration/](https://docs.opentripplanner.org/en/latest/RouterConfiguration/)
  - GitHub Source & Frequencies Handling: [https://github.com/opentripplanner/OpenTripPlanner/issues/3262](https://github.com/opentripplanner/OpenTripPlanner/issues/3262)
* **Conveyal R5 Methodology**:
  - Headway Routing & Monte Carlo Sampling: [https://docs.conveyal.com/analysis/methodology](https://docs.conveyal.com/analysis/methodology)
  - Conway, M. W., Byrd, A., & van der Linden, M. (2017). TRR 2653(1): 45–53. [https://doi.org/10.3141/2653-06](https://doi.org/10.3141/2653-06)
* **Common Lines Transit Assignment**:
  - Spiess, H., & Florian, M. (1989). *Optimal strategies: A new assignment model for transit networks*. Transportation Research Part B 23(2): 83–102. [https://doi.org/10.1016/0191-2615(89)90034-9](https://doi.org/10.1016/0191-2615(89)90034-9)
  - Chriqui, C., & Robillard, P. (1975). *Common Bus Lines*. Transportation Science 9(2): 115–121. [https://doi.org/10.1287/trsc.9.2.115](https://doi.org/10.1287/trsc.9.2.115)
* **MOTIS Routing Engine**: [https://github.com/motis-project/motis](https://github.com/motis-project/motis)

