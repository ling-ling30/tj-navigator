# wayfinder:map — Live companion: own arrival times, a map, and trip alerts

> Index, not a store. Each decision lives in its ticket; this map only gists and links.
> Earlier maps: [architecture](../map.md), [UX recovery](../ux-recovery/map.md), [Routing v2](../routing-v2/map.md).

## Destination

TJ-Navigator does three things a general planner such as Moovit does not do well for Jakarta: it computes its own arrival times from where the vehicles really are; it shows the whole door-to-door trip on a map, from the traveller's location to a named place; and it follows a trip and tells the traveller what to do next.

Reached when `docs/LIVE-COMPANION-SPEC.md` is decided and built in slices, and the app's own bus arrival times are measurably better than the operator's on a recorded session.

## Notes

- **Owner, 2026-11-11:** "I just see Moovit basically do the same. I want the calculation to recalculate the actual arriving time of the buses and train based on their position, not just consume the API. I want a map, use a free map option, to illustrate where to walk (I can use my current location and set the destination like Citywalk Sudirman) and it will show a route like 2 km walk/ride to first transit (30 min / 15 min), take buses or KRL (estimated arrival time), then walk / mikro to destination, all ranked by time. I want people to subscribe to the ride and be notified what to do (destination is near, transit, etc)."
- **Decision authority and execution:** as in the Routing v2 map. Claude decides and builds the complex parts itself; Antigravity agents get research and tightly specified tasks, and their output is checked. Still asked first: push, deploy, deleting data, and anything that costs money or needs an account.
- **Facts already established (Routing v2 map):** the live bus feed is real (`/mobile_armada/#`, about 3.800 vehicles, with route, trip, position, next halte and the operator's ETA); the app's telemetry client listens on a topic that never publishes; the GTFS has shapes for every trip; the engine and graph v2 are built; rail data is thin (three KRL lines, approximate stations).
- **This reverses one earlier decision:** the street map was dropped in the UX recovery map. The owner now wants it back.
- **Assumptions to correct if wrong:** "ride" on the first stretch means ojek or the traveller's own motorbike, shown as a time estimate with no booking; the app stays free to run (no paid map, geocoder or server) unless the owner says otherwise.
- Tracker: local markdown in `wayfinder/live-companion/`. Research findings go in the ticket's `## Resolution` with source links.
- Local commits on the working branch are allowed; no push.

## Decisions so far

- [Where real arrival times for KRL, MRT and LRT can come from](tickets/01-rail-live-or-timetable.md): no rail operator offers an open live source (the KRL partner API is private and not allowed); rail arrival times come from the operators' timetables. (2026-11-11)
- [A free map and walking paths for a public app](tickets/02-free-map-and-walking-paths.md): OpenFreeMap tiles (free, commercial use allowed, no key, no limits, no guarantee; terms checked by the decider); free walking-route services are too limited, so a dashed line plus a maps link. (2026-11-11)
- [Finding a place by name without a paid service](tickets/03-place-search.md): an offline index of about 30.000 named places from OpenStreetMap, about 380 KB compressed; public geocoders forbid search-as-you-type. (2026-11-11)
- [The map and the door-to-door trip](tickets/07-map-and-door-to-door.md): MapLibre with OpenFreeMap loaded on demand; real route shapes; offline place search; long first stretch shown as walk and ride times; fastest first. Decided by Claude. (2026-11-11)
- [What the live bus feed gives, and how good the operator ETA is](tickets/05-bus-feed-and-operator-eta-accuracy.md): 40-minute recording of 3.969 buses; the operator ETA is off by a typical 4,7 minutes at 10–20 minutes out and runs optimistic. (2026-11-11)
- [How the app computes its own arrival times](tickets/06-own-arrival-time-model.md): buses placed on their route, road speed from the buses that just drove each stretch; beats the operator at every horizon on the recording (2,4 against 4,7 minutes at 10–20 minutes out). Trains stay on timetables. Decided by Claude. (2026-11-11)
- [Spec and build slices for the live companion](tickets/09-spec-and-build-slices.md): `docs/LIVE-COMPANION-SPEC.md`, nine slices, none built yet. (2026-11-11)
- [What a web app can do to alert a traveller during a trip](tickets/04-trip-alerts-on-the-web.md): with the screen off a web app cannot follow location or alert; only Web Push works, and it needs a server. (2026-11-11)
- [Trip mode: telling the traveller what to do next](tickets/08-trip-mode.md): web trip mode with the screen on (states per leg, sound, vibration, spoken alerts, re-planning); a native wrapper for locked-screen alerts waits for the owner because it needs paid store accounts. Decided by Claude. (2026-11-11)

## Tickets

| # | Decision | Type | Mode | Blocked by | Status |
| --- | --- | --- | --- | --- | --- |
| [#1](tickets/01-rail-live-or-timetable.md) | Where real arrival times for KRL, MRT and LRT can come from | research | AFK | — | closed |
| [#2](tickets/02-free-map-and-walking-paths.md) | A free map and walking paths for a public app | research | AFK | — | closed |
| [#3](tickets/03-place-search.md) | Finding a place by name without a paid service | research | AFK | — | closed |
| [#4](tickets/04-trip-alerts-on-the-web.md) | What a web app can do to alert a traveller during a trip | research | AFK | — | closed |
| [#5](tickets/05-bus-feed-and-operator-eta-accuracy.md) | What the live bus feed gives, and how good the operator ETA is | task | AFK | — | closed |
| [#6](tickets/06-own-arrival-time-model.md) | How the app computes its own arrival times | grilling | HITL | #1, #5 | closed |
| [#7](tickets/07-map-and-door-to-door.md) | The map and the door-to-door trip | grilling | HITL | #2, #3 | closed |
| [#8](tickets/08-trip-mode.md) | Trip mode: telling the traveller what to do next | grilling | HITL | #4 | closed |
| [#9](tickets/09-spec-and-build-slices.md) | Spec and build slices for the live companion | task | AFK | #6, #7, #8 | closed |

## Not yet specified

- Rail data good enough for BRT + KRL trips with real times (also open on the Routing v2 map).
- Re-ranking on live disruption (a corridor closed, a long gap between buses).
- Saving a regular commute and being told before leaving home when to go.

## Out of scope

- Booking or paying for ojek, taxis or tickets.
- A paid map, geocoder or routing service.
