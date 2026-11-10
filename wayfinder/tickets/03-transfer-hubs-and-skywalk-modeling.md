---
id: 3
title: Physical transfer hubs, skywalks, and walking penalty calibration
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
blocked_by: [1]
blocks: []
map: ../map.md
---

# #3 Physical transfer hubs, skywalks, and walking penalty calibration

**Type:** grilling · **Mode:** HITL · **Blocked by:** #1 · **Blocks:** —

## Question

How do we represent and calibrate physical multi-modal interchanges in Jakarta so that suggested routes never recommend impossible or painful transfers?

## Context

Jakarta has high-profile transfer hubs with distinct pedestrian realities:
- **CSW / ASEAN Interchange**: Connects Transjakarta Corridor 13 (elevated 20m high), Corridor 1, and MRT ASEAN via multiple escalators and bridges. Real transfer time: 5–7 minutes.
- **Dukuh Atas Transit Oriented Development (TOD)**: Connects KRL Sudirman, MRT Dukuh Atas BNI, LRT Jabodebek Dukuh Atas, Transjakarta Halte Dukuh Atas 1 & 2, and Airport Rail (BNI City). Real transfer time: 4–8 minutes depending on line.
- **Kebayoran Skywalk**: Connects KRL Stasiun Kebayoran with Transjakarta Halte Kebayoran Lama (Corridor 8) and Halte Velbak (Corridor 13). Real transfer time: 6–9 minutes (long 450m skywalk).
- **Manggarai Central Station**: Multi-level heavy rail interchange between Bogor Line and Cikarang Loop Line. Platform transfer time: 3–5 minutes during rush hour.
- **Rawamangun / Velodrome Skywalk**: Connects LRT Jakarta Velodrome with Transjakarta Halte Pemuda Rawamangun (Corridor 4).

If an algorithm assumes generic straight-line walking speed (e.g. 5 km/h) without transfer buffers, it will suggest tight 1-minute transfers that commuters cannot physically make.

## Resolved when

We settle on:
1. The data structure for `TransferHub` and `SkywalkEdge`.
2. Standard transfer buffer defaults (e.g., base transfer penalty + measured distance / stairs factor).
3. The initial list of prioritized Jakarta hubs to hardcode with measured walking buffers.

## Resolution

_(empty — written by the session that claims and closes this ticket)_
