# ADR 0005: Recounted Traffic-Aware ETA Engine vs. Naive Backend Timers

## Status
Accepted

## Context
Transjakarta's official consumer API and MQTT payloads frequently broadcast arrival countdowns such as `"Arrives in 3 mins"`. In Jakarta street practice, this number is notoriously detached from physical reality:
- The bus may be completely stationary behind multiple traffic lights (e.g. Kuningan Barat or Mampang Prapatan).
- The official backend often computes ETAs by dividing distance by nominal free-flow speed ($40\text{ km/h}$) or reading scheduled timetable offsets without accounting for real-time congestion.
- When an app promises "3 mins" and the commuter waits 14 minutes, trust in the application collapses.
- Crucially, if this false precision is only corrected at the stop level, the **journey planner's total travel time comparison** remains broken (e.g. advertising a "45-minute direct bus" that actually takes 58 minutes due to current traffic).

Because we receive raw GPS coordinates (`latitude`, `longitude`, `speed_kmh`, `timestamp`) directly from the MQTT telemetry broker, we have the complete capability to **recalculate and recount the true arrival ETA** independently, both for bus stop arrival countdowns AND for end-to-end itinerary travel time estimations.

## Decision

1. **Independent Stop Arrival Recount**:
   Never display the raw API arrival minute value directly. Instead, compute an independent **Recounted ETA**:

   $$\text{ETA}_{\text{recounted}} = \sum_{s \in \text{remainingSegments}} \left( \frac{\text{length}(s)}{v_{\text{expected}}(s, t)} \right) + N_{\text{intermediateStops}} \times t_{\text{dwell}} + t_{\text{choke}}$$

   - **Polyline Track Distance**: Project the vehicle coordinate onto the route polyline to find exact remaining track distance (meters).
   - **Rolling Window Progress Velocity ($v_{\text{rolling}}$)**:
     $$\Delta d / \Delta t \quad \text{over the last 60 seconds}$$
     If $v_{\text{rolling}} < 3\text{ km/h}$, the bus is classified as **`HELD_IN_TRAFFIC`**.
   - **Halte Dwell Penalty ($t_{\text{dwell}}$)**: Add $+35\text{ seconds}$ per intermediate halte for passenger board/alight.
   - **Chokepoint Multiplier ($t_{\text{choke}}$)**: Calibrated delays for notoriously congested intersections (e.g., Mampang-Kuningan, Semanggi loop, Harmoni).

2. **Application to End-to-End Itinerary Travel Time Estimation**:
   When evaluating candidate itineraries in the journey planner, total travel duration is dynamically recounted:

   $$\text{Total Duration} = t_{\text{originWalk}} + \text{ETA}_{\text{boardRecounted}} + \sum_{\text{legs}} t_{\text{transitLive}} + \sum_{\text{transfers}} t_{\text{transfer}} + t_{\text{destWalk}}$$

   - **Initial Boarding Delay Integration**: If the first bus is delayed by $+7$ minutes at an intersection, the departure time and total duration shift accordingly (e.g. nominal 45 min becomes **`52 MIN (+7m traffic delay)`**).
   - **En-Route Segment Dilation**: For in-vehicle bus transit legs traversing active chokepoint segments where rolling speed is depressed, leg durations are scaled by the current traffic delay factor.
   - **Dynamic Pareto Re-Ranking**: If traffic congestion causes a bus route to suffer major delays, the routing engine automatically re-ranks alternative routes (e.g. Rail + Skywalk transfers) as the faster recommended choice.

3. **Transparent Commuter UI Presentation (Apple Design)**:
   - **Stop Radar View (Screen 3)**:
     - Shows honest range: **`8–11 MIN`** *(Recounted from live GPS & traffic)*.
     - Explains physical context: `"Bus TJ-204 is stationary at Kuningan West junction (0 km/h for 85s). Remaining 1.4 km has 2 intermediate stops."`
     - Muted note: `(Official API claimed "3 min")`.
   - **Itinerary Card View (Screen 2)**:
     - Total duration explicitly displays the live traffic offset:
       `52 MIN (+7m traffic) · 22:45 ➔ 23:37`
     - Highlights badge: `0 TRANSFERS · ⚠️ +7M TRAFFIC DELAY (KUNINGAN BOTTLENECK)`.

## Consequences

### Positive
- High commuter trust: Accurately sets passenger expectations during rush hours.
- Prevents bad journey recommendations: Commuters aren't steered onto a bus trapped in gridlock when rail is running smoothly.
- Clear mental model: Commuters see *why* an itinerary takes 52 minutes instead of 45 minutes.
- Fully client-side: Executes in milliseconds inside the browser Web Worker without requiring server compute.

### Negative / Trade-offs
- Requires maintaining calibrated choke point parameters for Jakarta's top intersection bottlenecks.
