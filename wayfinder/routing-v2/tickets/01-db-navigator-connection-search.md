---
id: 1
title: How DB Navigator lets a traveller search and choose connections
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [6, 8, 11]
map: ../map.md
---

# #1 How DB Navigator lets a traveller search and choose connections

## Question

What exactly does DB Navigator (and bahn.de, same engine) offer when searching and choosing a connection, and which of it should a headway-based Jakarta planner copy, adapt or skip?

## Cover (from live sources you actually open; link each)

- Search inputs: origin/destination types, depart-at vs arrive-by, via stops.
- Transport-mode selection ("Verkehrsmittel"): which toggles exist, multi-select behaviour, presets such as local transport only.
- Options: direct connections only, maximum transfers, transfer time, walking speed/distance, accessibility.
- The connection list: what each row shows, default ordering, "earlier" and "later", how many rows, how alternatives that differ only slightly are handled, labels such as fastest.
- What happens when the chosen modes or options give no connection.
- What is publicly documented about the engine behind it (HAFAS): multi-criteria search, criteria used.

## Resolved when

A behaviour sheet under `## Resolution` (≤ 200 lines): each behaviour with its source link, then a copy / adapt / skip table for Jakarta. Anything not confirmed from a source is marked "needs verification".

## Resolution

### 1. Verified Behaviours in DB Navigator & HAFAS

- **Search inputs & via stops:**
  - Origin and destination accept stations, stops, addresses, and user GPS location ("Nearby"). Address entries automatically compute pedestrian routing to the nearest transit stop ([DB Navigator Information](https://int.bahn.de/en/booking-information/db-navigator)).
  - Supports searching by departure time ("Abfahrt") or arrival time ("Ankunft") ([DB Travel Information Service](https://int.bahn.de/en/booking-information/travel-information)).
  - Via stops (stopovers / *Zwischenhalte*) allow specifying intermediate stations with an optional minimum dwell duration ([DB Travel Information Service](https://int.bahn.de/en/booking-information/travel-information)).
- **Transport-mode selection ("Verkehrsmittel"):**
  - Toggles support multi-select across train categories (ICE, IC/EC, regional/local RE/RB/S-Bahn), metro (U-Bahn), tram, bus, and micro-mobility rentals (Call a Bike, Dott) ([DB Navigator Information](https://int.bahn.de/en/booking-information/db-navigator)).
  - Presets exist for "All transport modes" and "D-Ticket services only" (local/regional transit only). Activating "D-Ticket services only" automatically deactivates individual transport-mode checkboxes ([DB Navigator Information](https://int.bahn.de/en/booking-information/db-navigator)).
- **Options:**
  - **Direct connections only:** Restricts results to zero-transfer journeys ([DB Travel Information Service](https://int.bahn.de/en/booking-information/travel-information)).
  - **Transfer time buffer (*Umstiegszeit*):** Users can increase default station transfer time to a minimum buffer (10, 15, 20, 30, 45 min) for baggage, bikes, or accessibility ([DB Navigator Information](https://int.bahn.de/en/booking-information/db-navigator)).
  - **Maximum transfers:** Not exposed as an integer slider in consumer DB Navigator UI (*needs verification* for backend HAFAS API support).
  - **Walking speed & distance:** No slow/fast speed slider exists in DB Navigator; travellers needing extra time are guided to raise the minimum transfer buffer or add via stopovers (*needs verification* whether HAFAS engine exposes walk-speed coefficients).
  - **Accessibility:** Platform step-free access and boarding lifts are managed via Mobility Service Centre (MSZ) and bahnhof.de; native app provides VoiceOver, Large Text, and high contrast ([DB Accessible Travel](https://int.bahn.de/en/booking-information/accessible-travel); [DB Navigator iOS App Store](https://apps.apple.com/app/db-navigator/id343555245)).
- **Connection list:**
  - **Row layout:** Displays departure/arrival timestamps, real-time delay diff (green/red), total travel time, transfer count (e.g. "0 Umst."), transport mode/line badges (ICE, RE, Bus), occupancy/demand forecast indicators, fare/best-price, and disruption warnings ([DB Navigator Information](https://int.bahn.de/en/booking-information/db-navigator); [DB Travel Information Service](https://int.bahn.de/en/booking-information/travel-information)).
  - **Ordering & "Show fastest connections":** Results sort chronologically. With "Show fastest connections" enabled, DB Navigator displays only the fastest trip for the requested time and subsequent fastest departures, plus occasional routes with fewer transfers even if slightly slower. Disabling the toggle reveals all matching timetable options ([DB Travel Information Service](https://int.bahn.de/en/booking-information/travel-information)).
  - **Temporal pagination:** "Earlier" and "Later" buttons query and append preceding or succeeding departures ([DB Travel Information Service](https://int.bahn.de/en/booking-information/travel-information)).
  - **Result count & alternative handling:** Typically displays 4–6 initial journeys. Near-duplicate journeys are filtered via Pareto dominance. During disruptions, alternative connections are displayed up to 72 hours forward ([DB Travel Information Service](https://int.bahn.de/en/booking-information/travel-information)).
- **No-connection behaviour:**
  - When filters yield no valid connection, the system alerts the user that no connection was found and prompts relaxing constraints (such as direct-only or mode restrictions) (*needs verification* for verbatim error strings and automated relax suggestions).
- **HAFAS engine public documentation:**
  - Core engine is HaCon / Siemens Mobility **HAFAS.engine**, processing ~100M connections/day ([HaCon Information & Ticketing Systems](https://www.hacon.de/en/portfolio/information-ticketing/)).
  - Employs a **Pareto-optimal trip search** evaluating multi-criteria tradeoffs simultaneously: earliest arrival time, latest departure time, fewest transfers, total travel duration (fastest), vehicle occupancy, arrival reliability, cheapest fare, and carbon footprint ([HaCon Information & Ticketing Systems](https://www.hacon.de/en/portfolio/information-ticketing/)).

### 2. Copy / Adapt / Skip for Jakarta (Headway Buses + Timetabled Rail)

| Feature | DB Navigator / HAFAS Behaviour | Jakarta Strategy (TransJakarta Headways + Rail Timetables) | Decision |
| :--- | :--- | :--- | :--- |
| **Multi-mode selection** | Multi-select toggles (ICE, Regional, U-Bahn, Tram, Bus) + local-only preset | Commuter picks modes via multi-select chips: BRT Corridor, Non-BRT Feeder, Mikrotrans, KRL Commuter, MRT, LRT. Mode must be passed to the router (currently disconnected) | **Copy** |
| **Direct connections only** | Filters out any connection requiring a transfer | Critical for Jakarta commuters avoiding complex pedestrian transfers between crowded corridors or skybridges | **Copy** |
| **Transfer time buffer** | Minimum transfer buffer (10–45 min) added to station transfer time | For headway bus lines, transfer time = walk time + expected headway wait time ($H/2$). Allow user buffer for slow walking or congested skybridges | **Adapt** |
| **Multi-criteria Pareto search** | HAFAS evaluates Pareto frontier (duration, transfers, reliability, cost) | Replace single-criterion router with bicriteria or tricriteria Pareto search: minimize (total expected time, transfer count, walk distance) | **Copy** |
| **"Show fastest" vs alternatives** | Prunes dominated routes; keeps fastest plus fewer-transfer variants | Return 3–5 genuinely diverse options (e.g. fastest BRT+KRL, direct BRT with 0 transfers, minimal walk) instead of single earliest arrival | **Adapt** |
| **Connection list card content** | Departure/arrival times, duration, transfer count, mode badges, occupancy | Show expected duration range, transfer count, line badge/corridor color, and headway frequency (e.g. "Every 3–5 min") instead of synthetic departure minutes for buses | **Adapt** |
| **Earlier / Later paging** | Queries earlier/later fixed timetable schedules | For rail legs (KRL, MRT, LRT), query earlier/later train timetables; for BRT/Mikrotrans headway legs, shift the query window or show recurring frequency windows | **Adapt** |
| **Via / Stopovers** | Allows routing via intermediate station with min dwell time | Enable transit riders to force routing through major interchange hubs (e.g. Harmoni, CSW / ASEAN, Manggarai) | **Adapt** |
| **Long-distance seat / check-in** | Seat reservation and Komfort Check-in | Irrelevant for urban commuter network with unreserved seating | **Skip** |

### 3. Unverified Items

1. *Exact consumer UI error copy and automated filter relaxation prompt:* DB documentation describes adjusting filters when no trips are found, but exact localized UI recovery dialogue copy needs verification.
2. *Exposed max-transfer integer in consumer UI:* HAFAS mathematically supports transfer count bounds, but whether consumer DB Navigator has an integer stepper beyond the binary "direct only" toggle needs verification.
3. *Walking speed coefficient in consumer UI:* DB Navigator does not expose a slow/medium/fast walking speed slider in its consumer settings; whether HAFAS supports custom walking speed coefficients per user needs verification.
4. *Mathematical Pareto pruning threshold:* The exact dominance margin (epsilon-dominance or heuristic score) used by HAFAS to discard slightly slower connections under "Show fastest connections" is proprietary and unverified.

