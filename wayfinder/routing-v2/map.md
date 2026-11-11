# wayfinder:map — Routing v2: connections like DB Navigator, for Jakarta

> Index, not a store. Each decision lives in its ticket; this map only gists and links.
> Claim a ticket by setting `assignee:` in its front matter before working. One ticket per session (research excepted).
> Earlier maps: [architecture](../map.md), [UX recovery](../ux-recovery/map.md).

## Destination

A decided, benchmark-proven design for the routing engine that behaves like DB Navigator for a Jakarta commuter: several genuinely different connections to choose from, transport modes the traveller picks (for example BRT + KRL), sensible direct routes with realistic times, and always an answer.

Reached when `docs/ROUTING-V2-SPEC.md` and an ADR exist, every ticket below is closed, and a prototype passes the golden-commute benchmark. Building the engine is the hand-off (ordered slices in the spec), not part of this map.

## Notes

- **Decision authority (owner, 2026-11-11):** "You take charge of this project, I believe in you with this algorithm and decision." Claude decides every ticket on this map, including the HITL ones, and records each decision with its reason and trade-off so the owner can review later. Tickets may be resolved back to back. **Execution is in scope:** after the spec, the build slices are carried out and verified on the benchmark. Still asked first: commit, push, deploy, deleting data.
- **Charting round 1, taken as decided under that authority:** the map ends at a spec proven on real trips, then the build; one option is a path, not a departure; modes are multi-select and strictly respected; the default order prefers fewer transfers and less walking over raw speed.
- **Reference:** DB Navigator (connection list, transport-mode toggles, options, direct-only, transfer time). Jakarta differs in one basic way: most buses run on headways, not a fixed timetable.
- **Owner's complaints (2026-11-11):** too few routes to choose from, no variation, cannot choose modes (BRT + KRL), the route found is indirect. Real commute used as test 1: walk to Flavor Bliss (`tj:B08106P`) → S61 → Kota Bambu or Taman Anggrek → corridor 9 → Penjaringan → walk.
- **Facts read from the code and the raw feed at charting (2026-11-11), not yet measured at scale:**
  - In-vehicle time = number of stops × a fixed 140–180 s (`src/lib/router/raptor.ts`). Distance and timetable are ignored.
  - The raw GTFS has per-stop times (`stop_times.txt`), headway windows (`frequencies.txt`, 747 rows), service days (`calendar.txt`: HK, HL, HM, SH), and fare classes (`fare_attributes.txt`: Rp 3.500, Rp 20.000, Rp 25.000, Rp 35.000, Rp 15.000, free). `scripts/build-graph.ts` reads only the stop order. Headways are hard-coded (180 s BRT, 360 s other).
  - The search optimises one criterion (earliest arrival), so it yields at most one path per transfer count. `paretoFilter` only removes duplicates.
  - The mode chips on the home screen are local UI state, never passed to the search, and single-select.
  - A leg's mode is taken from the boarding stop, not the route. Loop routes break hop counting (`indexOf`). Only the most frequent stop pattern per route and direction is kept. Hand-written "core corridor" routes duplicate real GTFS routes.
- **Product rules:** always give an answer; never fabricate transit; Bahasa Indonesia default; DB Navigator-style UI (see UX recovery map).
- **Skills:** `grilling` and `domain-modeling` (update `GLOSSARY.md` when a term is settled) for grilling tickets; `prototype` for prototype tickets.
- **Tracker:** local markdown in `wayfinder/routing-v2/`. Research findings are written into the ticket's `## Resolution` with source links. No research branches: the repo has a large uncommitted working tree. Keep `blocked_by` and `blocks` in sync.
- **Agents:** research and build run on the Antigravity provider (Gemini 3.8 Flash). Claude subagents and workflows hit the weekly spend limit on 2026-11-11 (resets 14 Nov 2026, 21:00 Asia/Jakarta).
- **Data:** raw GTFS cached at `tmp_gtfs.zip` (repo root, git-ignored). Measurement scripts go in `scripts/diag/`.
- Do not commit unless the owner asks.

## Decisions so far

<!-- one line per closed ticket -->

## Tickets

| # | Decision | Type | Mode | Blocked by | Status |
| --- | --- | --- | --- | --- | --- |
| [#1](tickets/01-db-navigator-connection-search.md) | How DB Navigator lets a traveller search and choose connections | research | AFK | — | open |
| [#2](tickets/02-alternatives-on-frequency-networks.md) | Which technique gives several different options on a headway network in a browser | research | AFK | — | open |
| [#3](tickets/03-official-fare-rules.md) | Official fare rules for every operator | research | AFK | — | open |
| [#4](tickets/04-gtfs-feed-capability-audit.md) | What the raw GTFS can support, and how wrong today's engine is | task | AFK | — | open |
| [#5](tickets/05-golden-commutes.md) | Golden commutes: real trips the owner knows, as the benchmark | task | HITL | — | open |
| [#6](tickets/06-connection-and-time-model.md) | What one option is, and how time is modelled | grilling | HITL | #1, #4 | open |
| [#7](tickets/07-alternatives-and-cost-model.md) | How alternatives are found, and what makes a route good | grilling | HITL | #2, #4, #6 | open |
| [#8](tickets/08-modes-and-travel-options.md) | Mode choice and travel options | grilling | HITL | #1 | open |
| [#9](tickets/09-fare-model.md) | Fare model | grilling | HITL | #3 | open |
| [#10](tickets/10-engine-prototype-on-golden-commutes.md) | Engine prototype on the golden commutes | prototype | HITL | #5, #6, #7 | open |
| [#11](tickets/11-results-list-like-db-navigator.md) | Results list like DB Navigator | prototype | HITL | #1, #6, #8 | open |
| [#12](tickets/12-spec-and-build-slices.md) | Spec, ADR and build slices | task | AFK | #7, #8, #9, #10, #11 | open |

## Not yet specified

- Real timetables for KRL, MRT and LRT (source, licence, size) and whether rail legs then get "earlier / later" like DB Navigator.
- "Arrive by" search and last-departure warnings: depends on the time model.
- How live bus positions (MQTT) change ranking and waiting time, beyond showing an ETA.
- Step-free and sheltered-route preferences: the data is thin.
- Performance budget on a mid-range phone once the search runs several times per query.

## Out of scope

- Address and place search (geocoding). Today: stops, "Lokasi saya", pasted coordinates. A separate effort.
- A street map display (decided in the UX recovery map).
- Ticket purchase, ride-hailing booking, intercity rail.
