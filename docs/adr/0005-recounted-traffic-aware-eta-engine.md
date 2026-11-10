# ADR 0005: Recounted Traffic-Aware ETA Engine vs. Naive Backend Timers

## Status
Accepted

## Context
Transjakarta's official consumer API and MQTT payloads frequently broadcast arrival countdowns such as `"Arrives in 3 mins"`. In Jakarta street practice, this number is notoriously detached from physical reality:
- The bus may be completely stationary behind multiple traffic lights (e.g. Kuningan Barat or Mampang Prapatan).
- The official backend often computes ETAs by dividing distance by nominal free-flow speed ($40\text{ km/h}$) or reading scheduled timetable offsets without accounting for real-time congestion.
- When an app promises "3 mins" and the commuter waits 14 minutes, trust in the application collapses.

Because we receive raw GPS coordinates (`latitude`, `longitude`, `speed_kmh`, `timestamp`) directly from the MQTT telemetry broker, we have the complete capability to **recalculate and recount the true arrival ETA** independently.

## Decision

1. **Independent Recount Algorithm**:
   Never display the raw API arrival minute value directly. Instead, compute an independent **Recounted ETA**:

   $$\text{ETA}_{\text{recounted}} = \sum_{s \in \text{remainingSegments}} \left( \frac{\text{length}(s)}{v_{\text{expected}}(s, t)} \right) + N_{\text{intermediateStops}} \times t_{\text{dwell}} + t_{\text{choke}}$$

   - **Polyline Track Distance**: Project the vehicle coordinate onto the route polyline to find exact remaining track distance (meters).
   - **Rolling Window Progress Velocity ($v_{\text{rolling}}$)**:
     $$\Delta d / \Delta t \quad \text{over the last 60 seconds}$$
     If $v_{\text{rolling}} < 3\text{ km/h}$, the bus is classified as **`HELD_IN_TRAFFIC`**.
   - **Halte Dwell Penalty ($t_{\text{dwell}}$)**: Add $+35\text{ seconds}$ per intermediate halte for passenger board/alight.
   - **Chokepoint Multiplier ($t_{\text{choke}}$)**: Calibrated delays for notoriously congested intersections (e.g., Mampang-Kuningan, Semanggi loop, Harmoni).

2. **Transparent Commuter UI Presentation (Apple Design)**:
   - Show an **honest minute range** rather than a single false minute (e.g., **`8–11 MIN`**).
   - Surface the physical reason with landmark context:
     `"Bus is stationary at Kuningan West junction (0 km/h for 85s). Remaining 1.4 km has 2 intermediate stops."`
   - Explicitly clarify discrepancy: `(Official API claimed "3 min" ⚠️ delayed by intersection traffic)`.

## Consequences

### Positive
- High commuter trust: Accurately sets passenger expectations during rush hours.
- Clear mental model: Commuters see *why* the bus is taking 8 minutes instead of wondering if the app is frozen.
- Fully client-side: Executes in milliseconds inside the browser Web Worker without requiring server compute.

### Negative / Trade-offs
- Requires maintaining calibrated choke point parameters for Jakarta's top intersection bottlenecks.
