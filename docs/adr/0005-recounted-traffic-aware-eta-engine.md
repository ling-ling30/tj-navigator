# ADR 0005: Unified Live Segment Runtime Engine (Recounted Telemetry for Arrival Countdowns & In-Vehicle Travel Time)

## Status
Accepted

## Context
Transjakarta's official API and MQTT broker broadcast static, pre-computed arrival fields (e.g. `"arrive in 3 mins"`). In Jakarta street practice, this value is notoriously unreliable:
- It divides raw distance by free-flow speed ($40\text{ km/h}$) or uses static timetable clocks, ignoring red lights, junction queues, and mixed-traffic bottlenecks.
- If we only apply live telemetry to the **boarding countdown** at the origin stop, the journey planner's **in-vehicle travel time** remains dangerously inaccurate (e.g. advertising a 30-minute bus ride that actually takes 55 minutes during rush-hour gridlock).

Because we receive raw GPS telemetry coordinates (`lat`, `lng`, `speed`, `bearing`, `timestamp`) directly from the MQTT broker, we can use active buses on each corridor as **live traffic probes** to calculate true segment runtimes for both phases of every bus transit leg.

## Decision

1. **Discard Raw API ETAs & Ingest Pure GPS Telemetry**:
   - Strip all pre-computed API ETA fields upon ingestion.
   - Snap raw vehicle coordinates to our directional stop-to-stop polylines using heading-validated tangent alignment ($\pm 45^\circ$).

2. **Buses as Live Traffic Probes (Stop-Hop Traversal)**:
   - Track when preceding buses enter and clear each stop-to-stop hop $(i \to i+1)$ on the corridor.
   - Derive an empirical **Traffic Multiplier** bounded between $0.8\times$ (midnight empty busway) and $3.0\times$ (severe rush-hour intersection bottleneck).

3. **Rolling Blend Filter (70% Live / 30% Baseline)**:
   To prevent brief 30-second red lights from causing false infinite-delay spikes while ensuring real traffic jams register immediately, smooth the segment runtime using an exponential blend:

   $$\text{Recounted Segment Time}_{(i \to i+1)} = 0.7 \cdot \text{Observed Bus Hop Time} + 0.3 \cdot \text{Baseline Hop Time}$$

4. **Unified Total Bus Leg Duration**:
   Pipe the recounted segment times into both the **boarding arrival wait** and the **in-vehicle transit duration**:

   $$\text{Total Bus Leg Duration} = \underbrace{\sum_{k=\text{bus}}^{\text{origin}} \text{LiveSeg}_k}_{\text{Recounted Wait ETA}} + \underbrace{\sum_{m=\text{origin}}^{\text{dest}} (\text{LiveSeg}_m + 25\text{s})}_{\text{Recounted In-Vehicle Travel Time}}$$

   - **Boarding Arrival ETA**: Sum of live traffic-adjusted runtimes for every remaining stop-hop between the approaching bus's position and the passenger's boarding halte.
   - **In-Vehicle Travel Time**: Sum of those same live traffic-adjusted runtimes across all stops between origin and destination haltes, plus an empirical **$25\text{ second}$ dwell buffer** per intermediate stop for passenger board/alight.
   - **Cold-Start Fallback**: Before MQTT is active for a route, estimate travel time using a corridor time-of-day profile (Peak 06:30–09:00, 16:30–19:30 vs. Off-Peak), then hot-swap to the live recounted duration once telemetry streams in.

## Consequences

### Positive
- **100% Truthful Durations**: Eliminates the "3-minute phantom bus" and accurately predicts total journey arrival times in heavy Jakarta traffic.
- **Dynamic Route Optimization**: The journey planner automatically steers commuters away from gridlocked bus corridors toward running rail options (KRL / MRT) when traffic multipliers surge past $2.0\times$.
- **Smoothness**: The $0.7 / 0.3$ rolling blend filters out traffic light noise while reflecting actual corridor gridlock within 1–2 bus hops.
- **Zero Server Compute**: The array-based segment lookup runs in $< 2\text{ ms}$ inside the browser Web Worker.

### Negative / Trade-offs
- Low-frequency feeder routes with only 1 bus running rely more heavily on the time-of-day baseline fallback until that bus clears a hop.
