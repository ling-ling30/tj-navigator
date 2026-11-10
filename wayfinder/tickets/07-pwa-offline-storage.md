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
- Commuters in underground stations (e.g. MRT Istora Mandiri, Dukuh Atas, Bundaran HI) frequently lose cellular connection.
- We need:
  1. A Service Worker strategy (e.g. Workbox / Vite PWA plugin) that caches HTML/JS/CSS assets with cache-first strategy.
  2. An IndexedDB data loader (`lib/storage/transit-db.ts`) storing the parsed graph arrays so subsequent app loads skip JSON parsing overhead.
  3. Offline vector map tile caching for Greater Jakarta bounding box.

## Resolved when

A research document specifies:
1. PWA manifest & ServiceWorker caching rules.
2. IndexedDB versioning and hash-based invalidation schema.
3. Offline map tile fallback strategy.

## Resolution

- **Service Worker Policies**: Cache-first for app shell, fonts, and assets; Stale-While-Revalidate for `/data/jakarta-transit-network.json`; bounded tile cache for Jakarta center.
- **IndexedDB Storage (`tj_navigator_store`)**: Direct structured object stores for `stops`, `routes`, `stopRoutes`, `transfers`, and `shapes` to eliminate 150ms JSON parsing latency on mobile app launches.
- **Offline Vector Fallback**: Renders route polylines and station pins as pure client vector overlays over a dark canvas when raster/satellite tiles are unavailable in subway tunnels.
- **Full Specification**: [docs/PWA-OFFLINE-STORAGE-SPEC.md](../../docs/PWA-OFFLINE-STORAGE-SPEC.md).
