---
id: 4
title: Real-time MQTT stream integration & ETA estimation model
labels: [wayfinder:grilling]
mode: HITL
status: closed
assignee: Antigravity
blocked_by: []
blocks: []
map: ../map.md
---

# #4 Real-time MQTT stream integration & ETA estimation model

**Type:** grilling · **Mode:** HITL · **Blocked by:** — · **Blocks:** —

## Question

How should the system consume and present live vehicle telemetry from Transjakarta's MQTT broker (`wss://mqtt.tj.co.id:8084/mqtt`) to calculate reliable bus arrival countdowns?

## Context

- Transjakarta broadcasts live vehicle positions via MQTT.
- However, street traffic in Jakarta is notoriously unpredictable; raw distance-over-average-speed calculation frequently produces jittery, inaccurate ETAs.
- Many transit systems solve this with a dual representation:
  1. Static itineraries show **Headway Windows** (*"Every 5–8 minutes"*).
  2. When viewing a specific stop or active itinerary leg, the UI subscribes to the live stream and computes a **Live Vehicle Countdown** (*"Bus TJ-248 arriving in ~4 min (2 stops away)"*).
- We need to decide whether MQTT subscriptions happen directly in the commuter's browser (P2P via WebSocket) or via a centralized backend proxy that aggregates and throttles the feed.

## Resolved when

We decide on:
1. Architecture for MQTT consumption (direct browser WebSocket vs. backend aggregator/caching proxy).
2. The ETA estimation algorithm (stop-hop count vs speed-over-distance vs headway window fallback).
3. Fallback strategy when MQTT stream is disconnected or vehicle telemetry is sparse.

## Resolution

- **On-Demand Multiplexed MQTT Subscriptions**: Browser connects directly to `wss://mqtt.tj.co.id:8084/mqtt` only when viewing active route/halte sheets. Multiplexes union of routes serving a stop (capped at 6 topics, e.g. 1, 1F, 6B, 9C at Tosari). Automatically un-subscribes / suspends via Page Visibility API when `document.hidden === true`. Ingestion is buffered into an in-memory mutable map and flushed to UI state on a 1.5-second throttled ticker.
- **Directional Polyline Snapping & Stop-Hop ETA**: Snapping checks that vehicle heading aligns within $\pm 45^\circ$ of the outbound polyline tangent, strictly excluding opposite-direction median buses. ETA combines remaining stop count with corridor segment runtimes and surfaces landmark context (e.g., `"Near Halte Polda Metro Jaya · 2 stops away · ~4 min"`).
- **Three-Tier Payload Decay**: Invalidation based on GPS payload timestamp (preventing stale retained MQTT false-positives):
  - `Age < 45s`: Pulsing Green Live badge.
  - `45s < Age < 90s`: Amber status (`"Updating... Last seen 1 min ago"`), marker opacity dimmed to 50% with static ring.
  - `Age > 90s`: Pin removed, seamlessly decays to scheduled headway window (`"Every 5–8 min"`).
- **Formalized in**: [docs/adr/0004-realtime-telemetry-and-eta-engine.md](../../docs/adr/0004-realtime-telemetry-and-eta-engine.md).
