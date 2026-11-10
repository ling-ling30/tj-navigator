---
id: 7
title: Offline PWA Service Worker & IndexedDB caching strategy
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: Antigravity
blocked_by: []
blocks: [8]
map: ../map.md
---

# #7 Offline PWA Service Worker & IndexedDB caching strategy

**Type:** research · **Mode:** AFK · **Blocked by:** — · **Blocks:** #8

## Question

How should the PWA cache the web shell, transit network graph, and map tiles to deliver an instantaneous, 100% offline commuter experience in underground MRT stations?

## Context

- The compiled graph (`jakarta-transit-network.json`) is ~1.5 MB (or ~350 KB for Phase 1).
- Commuters in underground stations (e.g. MRT Istora Mandiri, Dukuh Atas, Bundaran HI) frequently lose cellular connection or encounter "Lie-Fi" dead signal traps.
- We need:
  1. A Service Worker strategy (e.g. Workbox / Vite PWA plugin) that caches HTML/JS/CSS assets with cache-first strategy.
  2. An IndexedDB data loader (`lib/storage/transit-db.ts`) storing the parsed graph arrays so subsequent app loads skip JSON parsing overhead.
  3. Offline vector map tile caching for Greater Jakarta bounding box with arterial orientation underlays.

## Resolved when

A research document specifies:
1. PWA manifest & ServiceWorker caching rules.
2. IndexedDB versioning and hash-based invalidation schema.
3. Offline map tile fallback strategy.

## Resolution

- **Four Real-World Underground Refinements**:
  1. *Lie-Fi Timeout Detection*: 2.5s raster tile timeout + 15s MQTT heartbeat watchdog to instantly switch to offline vector mode without waiting for OS disconnect events.
  2. *Background Graph Versioning*: `graphVersion` hash stored in IndexedDB; background Web Worker updates schema without blocking $<20\text{ ms}$ startup.
  3. *Active Journey Persistence*: Local storage saves active navigation legs and recent traffic multipliers ($M_{\text{traffic}}$), surviving mid-tunnel phone locks or refreshes.
  4. *Offline Arterial Orientation Layer*: Bundles a compressed 40 KB GeoJSON underlay of primary Jakarta arterials (Sudirman-Thamrin, Gatot Subroto, Rasuna Said) on `#0A0E17`.
- **Full Specification**: [docs/PWA-OFFLINE-STORAGE-SPEC.md](../../docs/PWA-OFFLINE-STORAGE-SPEC.md).
