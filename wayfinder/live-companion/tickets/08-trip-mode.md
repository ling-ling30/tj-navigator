---
id: 8
title: Trip mode: telling the traveller what to do next
labels: [wayfinder:grilling]
mode: HITL
status: closed
assignee: claude (delegated by owner)
blocked_by: [4]
blocks: [9]
map: ../map.md
---

# #8 Trip mode: telling the traveller what to do next

## Question

What does "subscribe to a ride" do, step by step, and on which platform path?

## Starting position (charting hypothesis, not a decision)

- The traveller taps "Mulai perjalanan" on an option. The app follows the trip with the phone's location and the live arrival times.
- Alerts: bus arriving, board now, two stops before the change, get off now, walk to the next stop, destination near, and "you missed the change, here is the new plan".
- Step one on the web: screen kept on, voice or sound and vibration, notifications while the page is alive. Step two only if needed: a native wrapper for alerts with the screen locked.

## Resolved when

The alert list, the wording, and the platform path are decided.

## Resolution (decided by Claude under the owner's delegation, 2026-11-11)

Evidence: [What a web app can do to alert a traveller during a trip](04-trip-alerts-on-the-web.md). With the screen off, a web app cannot follow location, run timers, vibrate or play sound. Only Web Push works, and that needs a server.

**Step one, built now: trip mode on the web, screen on.**

- The traveller taps "Mulai perjalanan" on an option. The app asks for location, keeps the screen awake, and says so plainly: "Biarkan layar menyala. Peringatan berhenti saat layar terkunci."
- The trip is a sequence of states, one per leg: walk to the stop, wait, ride, get ready to get off, get off, then the next leg, until the destination.
- While waiting it shows the live arrival of every line that serves the leg. While riding it counts down the stops from the phone's position.
- Alerts, each as a large card with sound, vibration and spoken text (Bahasa Indonesia or English): bus arriving; board now; two stops before the change; get off at the next stop; walk to the next stop with the distance; destination near (300 m).
- Off the plan: when the traveller is 300 m away from the planned ride for a minute, or rode past the stop, the app says so and plans again from where they are.
- The active trip is saved on the device, so a reload continues it.
- No server. A system notification is shown when the page is hidden but still alive, as a bonus that cannot be relied on.

**Step two, not started: a native wrapper for alerts with the phone locked.** Capacitor with background location and on-device notifications. It needs store accounts (about USD 25 once for Google Play, USD 99 a year for Apple), so it waits for the owner's word.

**Trade-off.** Step one only helps a traveller who keeps the phone in hand or on a holder, and it uses battery. It costs nothing, ships with the web app, and its logic (states, alerts, re-planning) is exactly what a wrapper would reuse.
