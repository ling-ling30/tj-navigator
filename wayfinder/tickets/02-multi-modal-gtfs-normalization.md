---
id: 2
title: How to build the automated multi-modal GTFS ETL pipeline?
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: Antigravity
blocked_by: []
blocks: [6]
map: ../map.md
---

# #2 How to build the automated multi-modal GTFS ETL pipeline?

**Type:** research · **Mode:** AFK · **Blocked by:** — · **Blocks:** #6

## Question

How should the automated ingestion and compilation pipeline assemble Transjakarta GTFS, KRL station/schedule datasets, and MRT/LRT schedules into a unified, versioned transit graph artifact?

## Context

- Transjakarta provides an official GTFS zip file directly at `https://gtfs.transjakarta.co.id/files/file_gtfs.zip` (~2.5 MB).
- KRL Commuterline station dictionaries and timetable patterns are available via open-source datasets (e.g. Comuline API replica, `vyonizr/tarif-krl`, and KAI timetable bulletins).
- MRT Jakarta and LRT have small, fixed topologies (13 and 24 stations) with fixed headway rules.
- We need an automated builder script (e.g. Node/TypeScript) that downloads the TJ GTFS, merges KRL/MRT/LRT data, validates consistency, detects orphan stops, and outputs a single optimized dataset (e.g. `transit-network.json` / binary index).

## Resolved when

A research artifact or script architecture is documented detailing:
1. Exact source datasets and update cadences.
2. The schema for normalized stops, routes, trips, and transfer edges.
3. The automated validation checks (e.g., coordinate bounds within Jabodetabek, connected graph checks).

## Resolution

- **Ingestion Pipeline**: Build-time Node/TypeScript script (`scripts/build-graph.ts`) combining live Transjakarta GTFS with static seed JSONs for KRL (6 lines, 110 stations), MRT (13 stations), LRT (24 stations), and curated transfer hub walking links.
- **Global Namespacing**: Standardized on authority-prefixed IDs (`tj:<id>`, `krl:<code>`, `mrt:<code>`, `lrt:<code>`) preventing stop collisions.
- **Data Layout**: Flat array schema (`stops: [id, name, lat, lon, modeEnum]`, `routes`, `stopRoutes` inverted index, `transfers`, and encoded polylines) designed for sub-8ms in-browser RAPTOR traversal.
- **Validation**: Enforces Jabodetabek bounding box coordinates, connectivity checks, and a $<1.5\text{ MB}$ compressed bundle size budget.
- **Full Specification**: [docs/ETL-TRANSIT-GRAPH-SPEC.md](../../docs/ETL-TRANSIT-GRAPH-SPEC.md).
