# ADR 0004: Real-Time MQTT Telemetry Stream, Stop-Hop ETA Engine, and Staleness Decay

## Status
Accepted

## Context
Transjakarta broadcasts live vehicle coordinates for active armada via an anonymous WebSocket MQTT broker (`wss://mqtt.tj.co.id:8084/mqtt`).
However, mobile web browsers face three severe failure modes if real-time transit telemetry is handled naively:
1. **Battery and CPU Exhaustion**: Wildcard subscriptions stream thousands of packets per minute across 240+ routes, flooding the JavaScript event loop and draining mobile phone batteries.
2. **Erratic ETAs from Traffic & Red Lights**: Jakarta buses stop at traffic lights and median intersections; naive speed-over-distance formulas produce jumpy, infinite, or misleading countdowns. In addition, dual-direction median busways cause naive spatial snapping to match buses traveling in the opposite direction.
3. **Retained Message Staleness & Ghost Buses**: MQTT brokers frequently deliver retained messages that are minutes old upon subscription, and buses entering flyovers or tunnels can produce dead-zones.

## Decision

1. **Lazy, Multiplexed Route Subscriptions**:
   - The WebSocket connection connects only on-demand when a user views a route, halte arrival board, or active itinerary leg.
   - Supports **multi-route multiplexing**: subscribes to the union of routes serving a given stop (e.g. Tosari served by routes 1, 1F, 6B, 9C), capped at 6 concurrent topics.
   - Hooks into the browser **Page Visibility API**: immediately un-subscribes / suspends ingestion when `document.hidden === true` to preserve phone battery.
   - **Render Decoupling**: Ingests packets into an in-memory mutable `Map<vehicleId, TelemetryPacket>` and flushes to React/UI state on a throttled **1.5-second ticker**, avoiding UI stutter.

2. **Stop-Hop ETA & Heading-Validated Snapping**:
   - **Directional Bearing Filtering**: When snapping a bus to a route polyline, verify that the vehicle's bearing (or vector from its previous ping) aligns within $\pm 45^\circ$ of the outbound polyline segment tangent. Opposite-direction median buses are strictly excluded.
   - **Stop-Hop Indexing**: Arrival estimation is computed as:
     $$\text{ETA} = \text{Remaining Stops to Halte} \times \text{Avg Corridor Segment Runtime}$$
   - **Landmark Context**: Surfaced in the UI badge as:
     `"Near Halte Polda Metro Jaya · 2 stops away · ~4 min"`

3. **Three-Tier Staleness Decay**:
   - Age is strictly computed against the **payload GPS timestamp** (not client receipt time) to invalidate stale retained MQTT messages.
   - **Tier 1 (Age < 45s - Live)**: High-confidence green badge, 100% opacity, pulsing vehicle halo.
   - **Tier 2 (45s < Age < 90s - Amber/Stale)**: Amber status badge (`"Updating... Last seen 1 min ago"`), marker opacity dimmed to 50%, static ring.
   - **Tier 3 (Age > 90s - Decay to Headway)**: Remove map pin, seamlessly fall back to scheduled headway window (`"Every 5–8 min (Scheduled interval)"`).

## Consequences

### Positive
- Zero UI lag on 60fps mobile screens.
- Zero battery drain when app is in background or phone is locked.
- Realistic, human-aligned countdowns matching commuter expectations.
- Completely immune to opposite-direction snapping on dual median busways.

### Negative / Trade-offs
- Requires lightweight geometric vector projection functions in client utility library.
