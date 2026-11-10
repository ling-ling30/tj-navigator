---
id: 8
title: Slicing the architecture into executable implementation tickets
labels: [wayfinder:task]
mode: HITL
status: closed
assignee: Antigravity
blocked_by: []
blocks: []
map: ../map.md
---

# #8 Slicing the architecture into executable implementation tickets

**Type:** task · **Mode:** HITL · **Blocked by:** — · **Blocks:** —

## Question

How should the settled decisions (RAPTOR in Web Worker, Build-Time ETL, Curated Transfer Hubs, Real-Time MQTT, FigCraft UI design, and Fare Engine) be sequenced into vertical-slice implementation tickets?

## Context

All core architectural decisions are locked. We need a clear, incremental build sequence (e.g. `tickets.md` or GitHub issue milestones) where each slice is immediately testable and delivers working software.

## Resolved when

A `ROADMAP.md` or `tickets.md` is authored with concrete vertical slices:
- Slice 1: Project Scaffolding & Build-Time ETL (`scripts/build-graph.ts` + seeds).
- Slice 2: In-Browser RAPTOR Engine & Web Worker test suite.
- Slice 3: Commuter UI Shell & Station Search Autocomplete.
- Slice 4: Itinerary Pareto Results Drawer & Step-by-Step Leg Views.
- Slice 5: Real-Time MQTT Bus Radar & Staleness Decay Hook.
- Slice 6: JakLingko Fare Calculation Engine.
- Slice 7: PWA Offline Shell & Deployment to Cloudflare Pages.

## Resolution

- **Roadmap Authored**: [ROADMAP.md](../../ROADMAP.md) organizes implementation into 6 test-driven vertical slices:
  1. *Slice 1*: Scaffolding & Multi-Modal GTFS Pipeline (`scripts/build-graph.ts`).
  2. *Slice 2*: In-Browser RAPTOR & Spatial KD-Tree Web Worker.
  3. *Slice 3*: Live MQTT Telemetry & Recounted Segment Runtime Engine (ADR 0004 & ADR 0005).
  4. *Slice 4*: Multi-Modal Fare Calculation Engine.
  5. *Slice 5*: Apple Fluid Commuter UI (FigCraft Screens 1, 2, 3).
  6. *Slice 6*: Offline PWA Shell & Static Cloudflare Pages Deployment.
- **The Wayfinder Map is Complete**: All 8 decision tickets are closed. The route from loose idea to executable build is 100% charted.
