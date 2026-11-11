---
id: 4
title: What a web app can do to alert a traveller during a trip
labels: [wayfinder:research]
mode: AFK
status: open
assignee:
blocked_by: []
blocks: [8]
map: ../map.md
---

# #4 What a web app can do to alert a traveller during a trip

## Question

The owner wants people to subscribe to a ride and be told what to do: transit ahead, destination near. The app is a static PWA with no server. What can it really do on a phone that is in a pocket?

## Cover (current browser documentation, 2025 to 2026; link each)

- Location while the screen is off or the app is in the background: Android Chrome and iOS Safari, installed PWA and browser tab.
- Notifications without a push server (service worker showNotification), with a push server (Web Push), vibration, sound, Screen Wake Lock.
- What breaks when the operating system suspends the page.
- Ways out: Trusted Web Activity, Capacitor or another native wrapper with background location; cost and effort of each.

## Resolved when

A table of what works where, and a recommended path in two steps (web first, native wrapper if needed) with the trade-off of each.
