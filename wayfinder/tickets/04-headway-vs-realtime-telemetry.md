---
id: 4
title: Real-time MQTT stream integration & ETA estimation model
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
blocked_by: [1]
blocks: []
map: ../map.md
---

# #4 Real-time MQTT stream integration & ETA estimation model

**Type:** grilling · **Mode:** HITL · **Blocked by:** #1 · **Blocks:** —

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

_(empty — written by the session that claims and closes this ticket)_
