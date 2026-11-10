# ADR 0003: Physical Transfer Hubs, Directional Skywalks, and Walking Penalty Calibration

## Status
Accepted

## Context
Multi-modal transit in Jakarta relies heavily on dedicated interchange infrastructure:
- High-level elevated skywalks (e.g., Kebayoran Skywalk, 450m long; Velbak to Kebayoran Lama).
- Vertical multi-level transit hubs (e.g., CSW-ASEAN, spanning 5 vertical tiers between BRT Corridor 1 at ground level, MRT ASEAN elevated, and BRT Corridor 13 at +20 meters).
- High-density heavy rail transfer nodes (e.g., Manggarai Central Station).
- Transit-Oriented Developments (e.g., Dukuh Atas TOD connecting KRL, MRT, LRT, and 2 BRT haltes).

Standard transit routing engines that rely on flat straight-line Euclidean distance or static 1.2 m/s walk speeds severely underestimate transfer times in Jakarta, leading to missed connections, commuter fatigue, and routing frustration.

## Decision

1. **Structured Hub Entity Model (`transfer-hubs.json`)**:
   - Define major Jakarta interchanges as first-class parent `TransferHub` entities containing member stops/stations.
   - Inter-station pedestrian connections are modeled as **Directional Edges** (`fromStopId -> toStopId`), acknowledging physical asymmetry (e.g. ascending escalators/stairs to Corridor 13 at CSW takes longer than descending; directional turnstile gates at Sudirman).

2. **Edge Metadata Schema**:
   Every transfer edge records:
   - `fromStopId` & `toStopId`: Namespaced station IDs.
   - `distanceMeters`: Measured walking path distance.
   - `baseDurationSeconds`: Physical walk time calibrated at $1.0\text{ m/s}$.
   - `pathwayType`: `SKYWALK` | `UNDERGROUND_CONCOURSE` | `STAIRS_ESCALATOR` | `STREET_WALK`.
   - `isPaidAreaTransfer`: `true` (within paid turnstile area, 0 gate delay, 0 re-tap) or `false` (exit turnstile required).
   - `gateBufferSeconds`: `0s` (paid area), `45s` (single gate / street bus board), `75–90s` (two separate operator gates).
   - `peakPenaltySeconds`: Additional congestion buffer applied during rush hours (06:30–09:00 and 16:30–19:30 WIB).
   - `isSheltered`: `boolean` (covered from Jakarta rain and tropical sun).
   - `isStepFree`: `boolean` (accessible via functional elevator / ramp).

3. **Effective Transfer Duration Formula**:
   $$\text{Transfer Duration} = \text{baseDurationSeconds} + \text{gateBufferSeconds} + \mathbb{I}_{\text{peak}} \times \text{peakPenaltySeconds}$$

4. **Curated Prioritized Hubs for Phase 1**:
   - `hub:dukuh-atas` (KRL Sudirman, MRT Dukuh Atas BNI, LRT Dukuh Atas, TJ Halte Dukuh Atas 1 & 2, BNI City Airport Rail)
   - `hub:csw-asean` (TJ Corridor 13 CSW, TJ Corridor 1 CSW 1, MRT ASEAN, TJ Non-BRT Kejaksaan Agung)
   - `hub:kebayoran` (KRL Kebayoran, TJ Corridor 13 Velbak, TJ Corridor 8 Pasar Kebayoran Lama via 450m Skywalk)
   - `hub:manggarai` (KRL Bogor Line elevated platforms 10–13 $\leftrightarrow$ Cikarang Line ground platforms 6–8)
   - `hub:rawamangun` (LRT Jakarta Velodrome $\leftrightarrow$ TJ Corridor 4 Pemuda Rawamangun Skybridge)

## Consequences

### Positive
- Realistic journey durations: Eliminates impossible 1-minute transfer recommendations.
- Commuter clarity: UI can clearly badge "Covered Skywalk", "Step-Free / Elevator", and "Inside Station Transfer (Do Not Tap Out)".
- Accurate fare triggers: Fare engine cleanly differentiates between free within-station transfers and gate-exit multi-modal transfers.

### Negative / Trade-offs
- Requires maintaining the curated JSON seed file for Jakarta's top transfer hubs (mitigated by starting with the 5 core hubs that represent >80% of multi-modal transfers).
