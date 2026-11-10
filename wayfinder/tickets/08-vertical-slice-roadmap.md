---
id: 8
title: Slicing the architecture into executable implementation tickets
labels: [wayfinder:task]
mode: HITL
status: open
assignee:
blocked_by: [7]
blocks: []
map: ../map.md
---

# #8 Slicing the architecture into executable implementation tickets

**Type:** task · **Mode:** HITL · **Blocked by:** #7 · **Blocks:** —

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

_(empty — written by the session that claims and closes this ticket)_
