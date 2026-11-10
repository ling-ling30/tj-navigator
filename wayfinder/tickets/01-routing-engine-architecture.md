---
id: 1
title: Routing Engine: In-memory RAPTOR vs Multi-Criteria Dijkstra on Edge / Browser?
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
blocked_by: []
blocks: [3, 4, 5]
map: ../map.md
---

# #1 Routing Engine: In-memory RAPTOR vs Multi-Criteria Dijkstra on Edge / Browser?

**Type:** grilling · **Mode:** HITL · **Blocked by:** — · **Blocks:** #3, #4, #5

## Question

Which algorithmic approach and execution target should power the multi-modal journey search:
1. **RAPTOR (Round-Based Public Transit Routing)** running in an edge server/worker (or client Web Worker), optimizing rounds for transfer counts and journey durations.
2. **Multi-Criteria Dijkstra / A*** running on an edge server with custom weights (duration, transfers, walking distance, fare).
3. **Hybrid Engine**: Core rail and BRT timetabled routing via RAPTOR, supplemented by spatial walking buffers via KD-tree / spatial index.

Also: Should the search engine run **client-side in the browser** (offline-capable, zero server costs), **server-side on the edge/API**, or a **hybrid** where server prepares indexed blobs and the client caches them?

## Context

Jakarta's transit network contains ~8,330 nodes (mostly bus stops) and ~250 routes.
- RAPTOR is the industry standard for timetabled/frequency public transit (used by OpenTripPlanner and major transit apps) because it avoids priority queue overhead and naturally explores Pareto-optimal trade-offs (e.g. 1 transfer in 35 min vs. 0 transfers in 45 min).
- The network data when serialized as a compact index is only 3–5 MB compressed, which can easily fit in browser IndexedDB or an edge server memory cache (Node/Bun/Cloudflare Worker).

## Resolved when

We decide on:
1. Algorithmic model (RAPTOR vs Multi-Criteria Dijkstra).
2. Execution target (Edge Server API vs Client-side Web Worker / WASM vs Hybrid).
3. Query response time budget and memory targets.

## Resolution

_(empty — written by the session that claims and closes this ticket)_
