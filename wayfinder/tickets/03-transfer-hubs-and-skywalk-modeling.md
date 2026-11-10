---
id: 3
title: Physical transfer hubs, skywalks, and walking penalty calibration
labels: [wayfinder:grilling]
mode: HITL
status: closed
assignee: Antigravity
blocked_by: []
blocks: []
map: ../map.md
---

# #3 Physical transfer hubs, skywalks, and walking penalty calibration

**Type:** grilling · **Mode:** HITL · **Blocked by:** — · **Blocks:** —

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

- **Structured Hub Entity Model**: Implemented in `data/seeds/transfer-hubs.json` grouping stations into parent hubs with **directional pedestrian edges** (`fromStopId -> toStopId`) to capture vertical ascent/descent asymmetry (e.g. CSW Corridor 1 to 13 takes 240s up vs 180s down) and one-way turnstile corridors.
- **Calibrated Formula & Buffers**:
  $$\text{Transfer Duration} = \text{baseDurationSeconds} (1.0\text{ m/s}) + \text{gateBufferSeconds} + \mathbb{I}_{\text{peak}} \times \text{peakPenaltySeconds}$$
  - `gateBufferSeconds`: `0s` (inside paid area), `45s` (single gate/street bus), `75–90s` (crossing two separate operator gates).
  - `peakPenaltySeconds`: Additional congestion buffer during morning (06:30–09:00 WIB) and evening (16:30–19:30 WIB) rush hours (e.g. Manggarai platforms 6/7 to 10/11 stairs).
- **Commuter Experience Flags**:
  - `isPaidAreaTransfer`: Triggers green "Inside Station Transfer (No Re-tap)" vs amber "Exit Gate & Re-tap" UI badges.
  - `isSheltered`: Highlights covered skywalks for tropical rain and afternoon heat.
  - `isStepFree`: Identifies elevator/ramp accessible routes.
- **Initial Curated Hubs**: Dukuh Atas TOD, CSW-ASEAN, Kebayoran Skywalk, Manggarai Central, and Rawamangun-Velodrome.
- **Formalized in**: [docs/adr/0003-transfer-hubs-and-skywalk-modeling.md](../../docs/adr/0003-transfer-hubs-and-skywalk-modeling.md).
