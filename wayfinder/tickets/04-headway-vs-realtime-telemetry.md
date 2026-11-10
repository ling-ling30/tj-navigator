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
- **Unified Live Segment Runtime Engine (ADR 0005)**:
  - Discard raw pre-computed API ETAs upon ingestion.
  - Preceding buses serve as live traffic probes measuring actual stop-to-stop hop traversal times.
  - Exponential blend filter:
    $$\text{Recounted Hop Time} = 0.7 \cdot \text{Observed} + 0.3 \cdot \text{Baseline}$$
  - Applied to **both phases** of each bus leg:
    $$\text{Total Bus Leg Duration} = \underbrace{\sum_{k=\text{bus}}^{\text{origin}} \text{LiveSeg}_k}_{\text{Recounted Wait ETA}} + \underbrace{\sum_{m=\text{origin}}^{\text{dest}} (\text{LiveSeg}_m + 25\text{s})}_{\text{Recounted In-Vehicle Travel Time}}$$
- **Three-Tier Payload Decay**: Invalidation based on GPS payload timestamp:
  - `Age < 45s`: Pulsing Green Live badge.
  - `45s < Age < 90s`: Amber status (`"Updating... Last seen 1 min ago"`), marker opacity dimmed to 50% with static ring.
  - `Age > 90s`: Pin removed, seamlessly decays to scheduled headway window (`"Every 5–8 min"`).
- **Formalized in**: [docs/adr/0004-realtime-telemetry-and-eta-engine.md](../../docs/adr/0004-realtime-telemetry-and-eta-engine.md) and [docs/adr/0005-recounted-traffic-aware-eta-engine.md](../../docs/adr/0005-recounted-traffic-aware-eta-engine.md).
