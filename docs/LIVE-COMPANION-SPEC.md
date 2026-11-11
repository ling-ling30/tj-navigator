# Live companion spec

> Status: decided by Claude under the owner's delegation (2026-11-11). Nothing in this file is built yet except the recorder and the evaluator.
> Decisions and their evidence: the tickets of the [Live companion map](../wayfinder/live-companion/map.md). The routing engine it builds on: [ROUTING-V2-SPEC.md](ROUTING-V2-SPEC.md).

## 1. What sets the app apart

1. **Its own bus arrival times**, computed from where the buses are and how fast traffic is moving, not the operator's figure.
2. **A map of the whole trip**, from the traveller's location to a place found by name.
3. **Trip mode**: the app follows the trip and says what to do next.

Trains stay on the operators' timetables: no rail operator offers an open live source.

## 2. Own arrival times (measured)

**Evidence.** A 40-minute recording of the live feed (Wednesday 11 Nov 2026, about 15:00, off-peak): 3.969 buses, 986.000 positions, 281.000 operator ETA snapshots. `npx vite-node scripts/live-eta/evaluate.ts` finds when each bus really reached each stop and scores every estimate against it.

| The bus really arrives in | Operator: typical / bad error | Our traffic model: typical / bad error |
|---|---|---|
| 0–2 min | 0,6 / 8,8 min | 0,3 / 4,8 min |
| 2–5 min | 1,0 / 4,6 min | 0,8 / 2,6 min |
| 5–10 min | 2,3 / 6,2 min | 1,4 / 4,3 min |
| 10–20 min | 4,7 / 10,9 min | 2,4 / 7,3 min |

"Typical" is the median size of the error, "bad" the 90th percentile. The operator's figure is optimistic: at 10–20 minutes out, buses arrive about 4 minutes later than it says.

**Model.**

- Each bus is placed on its route: its distance along the route shape, starting from the stop the feed says is next, then followed forward.
- The road is cut into cells of about 165 m with a heading. Every bus that drives or waits in a cell leaves an observation (metres and seconds). The speed of a cell is metres ÷ seconds over the last ten minutes, so stops and red lights are included. A standstill longer than two minutes is a layover and is ignored.
- Arrival at a stop = the remaining route, stretch by stretch, at each cell's speed; a cell without recent buses uses the calibrated speed of the service class.
- For the last few hundred metres the bus's own speed over the last two minutes is the better guide (it has the lowest error under 2 minutes) and takes over.

**Limits, stated to the traveller as "perkiraan".** One off-peak recording; arrival is derived from positions, not from a door sensor; the feed drops its connection every half minute and must be re-joined.

**Where it shows.** On a result and in the journey detail: the next vehicle of every line that serves the leg ("9 tiba ±4 mnt, 9A ±7 mnt"), the wait and the total duration recomputed from it, and the order of the options updated. In trip mode it drives "bus arriving" and "board now".

## 3. Map and door-to-door

- MapLibre GL with OpenFreeMap vector tiles, loaded only when the map is opened. Terms checked on openfreemap.org: free, commercial use allowed, no key, no request limits, attribution required, no service guarantee. If tiles fail, the route is drawn on a plain background.
- The map shows the traveller's position, the walk to the first stop (dashed), each ride along its real route shape in the line colour, the changes, the walk to the destination, and the live vehicles of the lines in use.
- Walking: a dashed straight line with distance and time, plus a link that opens walking directions in the phone's maps app.
- Place search: an offline index of named places from OpenStreetMap (about 30.000 places, about 380 KB compressed, the research's estimate), searched on the device together with stops.
- First stretch: a long walk shows "Jalan 2 km (30 mnt) atau naik motor sekitar 15 mnt"; the travel option "Naik motor ke halte" plans with a ride to the stop (an estimate, no booking).
- Fastest option first.

## 4. Trip mode

Decided in [Trip mode](../wayfinder/live-companion/tickets/08-trip-mode.md): on the web with the screen on; states per leg; alerts with sound, vibration and speech; re-planning when the traveller leaves the plan. A native wrapper for locked-screen alerts waits for the owner (paid store accounts).

## 5. Data the app needs

| File | Content | Loaded |
|---|---|---|
| `network-v2.json` | graph (exists) | at start |
| `shapes-v2.json` | per pattern: route polyline and the vertex of each stop | when a map or live arrival is first needed |
| `places-v1.json` | named places: name, kind, lat, lon | when the stop picker opens |

## 6. Build slices

1. **Shapes file**: export per-pattern polylines from the graph builder (simplified, stop vertices kept). Check: size, and the owner's S61 leg drawn end to end.
2. **Live feed client**: subscribe to the real topic for the lines of the options on screen only; reconnect quietly; replace the dead telemetry client. Check: replay of the recording gives the same numbers as the evaluator.
3. **Arrival model in the app** (`src/lib/live/`): bus placement, traffic cells, arrival per stop; unit-checked against the recording (the table above must hold).
4. **Live times on results and journey detail**: next vehicles per leg, recomputed wait and total, re-ordering. Rail labelled "sesuai jadwal".
5. **Map view**: MapLibre + OpenFreeMap on demand, route shapes, walks, position, vehicles.
6. **Place search**: build script for the OpenStreetMap index and search in the stop picker.
7. **First stretch by motorbike** and the two-figure walk leg.
8. **Trip mode**: states, alerts, re-planning, saved active trip.
9. **Verification**: evaluator table, headless walk-through with screenshots, benchmark still green.

## 7. Known limits

- Arrival times for trains are scheduled, never live.
- The traffic model has been measured on one off-peak afternoon. A peak-hour recording is needed before trusting it at rush hour.
- Trip alerts stop when the screen locks.
- OpenFreeMap can go away; the fallback is self-hosted tiles.

## 8. Data cost of the live feed (measured 2026-11-11)

- Following one line costs about 44 KB per second (corridor 9: 39 buses, 3,4 KB per message, 13 messages a second), which is 2,6 MB a minute. The whole feed is several megabytes a second. The app must not keep lines open on mobile data.
- The topic carries a grid cell: `/mobile_armada/<lat index>-<lon index>/<route>/<trip>/<bus>`. Measured mapping: lat index ≈ (−6,0254 − lat) ÷ 0,0099 and lon index ≈ (lon − 106,6173) ÷ 0,01004, so a cell is about 1,1 km. The cell in the topic can lag the position by one cell, so neighbouring cells are included.
- **Rule for the app:** listen in short bursts of about 15 seconds, only to the cells along the legs of the option that is open and only to the lines that serve those legs; repeat every two minutes while that option stays open.
- Route shapes for placing buses: `public/data/shapes-v2.json`, 373 KB, 81.496 points for 705 patterns, polyline-encoded, with the vertex of every stop.

## 9. What the first live build does, and what the replay ruled out (2026-11-11)

**Built: the next bus at the first boarding stop.** Opening a result row makes the app listen to the feed for 15 seconds, only around the approach to that stop and only to the lines of that ride. Buses are placed on the route shape; a bus counts as coming when the stop it says is next lies on the approach. Their distance to the stop, at the speed the plan assumes for that road, gives "Bus berikutnya sekitar 4 mnt lagi, lalu 12 mnt". The option's total is recomputed with that real wait. Rail rides say "Sesuai jadwal".

Checked by replaying the 40-minute recording through the app's own code (`npx vite-node scripts/live-eta/replay.ts`, 600 stops):

| The bus really comes in | App, after 15 s: typical / bad error | Operator ETA: typical / bad error |
|---|---|---|
| 0–2 min | 0,5 / 3,3 min | 0,6 / 8,8 min |
| 2–5 min | 1,1 / 3,3 min | 1,0 / 4,6 min |
| 5–10 min | 1,6 / 5,3 min | 2,3 / 6,2 min |
| 10–20 min | 3,7 / 8,7 min | 4,7 / 10,9 min |

In 87 of 600 cases the app saw no bus coming; in 23 of those a bus did arrive within ten minutes.

**Ruled out: riding time from a short listen.** The same replay tested a live riding time taken from the buses on the stretch. It was worse than the planned time at every listening length tried, from 15 seconds (typical error 3,9 minutes against 2,3 for the plan) to 5 minutes (2,8 against 2,1). A few buses over a short time cannot tell a red light from a jam. That figure was removed. Riding time in traffic needs either the ten-minute traffic cells of section 2, which the data budget of section 8 does not allow on a phone, or typical speeds by hour learned from recordings. A rush-hour recording is the next step for that.
