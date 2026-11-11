# wayfinder:map — TJ-Navigator UX Recovery (UI, logic audit, map decision)

> Index, not a store. Each decision lives in its ticket; this map only gists and links.
> Rule: claim a ticket by setting `assignee:` in its front matter before working.
> Supersedes nothing: the first map (`../map.md`) stays as the architecture record.

## Destination

TJ-Navigator is easy to read and use for a real Jakarta commuter on a phone, in daylight, one-handed. Reached when: the UI is rebuilt on a shared design system (light default, Bahasa Indonesia default, DB Navigator as the main reference), the engine logic is audited against real trips with defects fixed, and the map question is decided and implemented.

## Notes

- **Execution is in scope** (overrides wayfinder's plan-only default): the owner is asleep and will review the finished app in the morning. Decisions made unattended are marked `decided-unattended` and listed for review.
- Users: real Jakarta commuters, phone first, outdoors, in a hurry. Desktop is a bonus.
- UI language: Bahasa Indonesia default, English toggle. Theme: light default, dark follows system.
- Main reference: **DB Navigator** (flat, high-contrast, text-first connection list, one primary action per screen).
- Skill for all UI work: `design-taste-frontend` in app-screen mode (`references/app-screens.md`, `inspect.mjs --app`). Its house rules apply: no glass, no gradients, no resting shadows, no tiny uppercase labels.
- Standing code rules (owner): follow best practices; split code into small files; reuse components and hooks; one shared typography scale; one shared spacing scale; no magic numbers or hard-coded hex in components (tokens only).
- Tracker: local markdown in `wayfinder/ux-recovery/`. Keep `blocked_by` and `blocks` in sync.
- Do not commit or push. The owner reviews the working tree diff.
- Models: Claude Opus 4.6 and Gemini 3.8 Flash via the Antigravity provider.

## Decisions so far

- Destination, audience, language, theme, audit scope and optional-map stance were agreed with the owner in grilling round 1 (all "yes"). (2026-11-10)
- [#1](tickets/01-map-and-osm-suitability.md): Drop street basemap for 0ms offline schematic canvas with 40 KB arterial underlay; fallback to R2 Protomaps if map mandated. (2026-11-10)
- [#2](tickets/02-logic-audit.md): Audited engine against 11 real Jakarta trips; identified 15 systemic defects (8 🔴, 5 🟡, 2 🟢) including corrupted RAPTOR backtracking, fake fallback routes, and 8,143 orphan GTFS stops. (2026-11-10)
- [#3](tickets/03-db-navigator-reference.md): Port DB Navigator high-contrast vertical stepper, card hierarchy, and restrained status colors, adapted for Jakarta headways, cashless tap-ins, and multi-modal hubs. (2026-11-10)
- [#4](tickets/04-map-stance.md): Drop the street basemap and remove maplibre-gl. List/stepper screens only; optional lazy SVG route diagram later. decided-unattended. (2026-11-10)
- [#5](tickets/05-ui-redesign-spec.md): Adopt Achromatic Ledger + Deep Transit Blue token system, DB Navigator card & stepper patterns, Bahasa Indonesia default, and 8-slice rebuild plan in docs/UI-REDESIGN-SPEC.md. decided-unattended. (2026-11-10)

## Tickets

| # | Decision | Type | Mode | Blocked by | Status |
| --- | --- | --- | --- | --- | --- |
| [#1](tickets/01-map-and-osm-suitability.md) | Is OpenStreetMap-based tiling a good solution, and which provider if a map stays? | research | AFK | — | closed |
| [#2](tickets/02-logic-audit.md) | Does the engine logic (routing, transfers, fares, live ETA, store flow) give correct answers on real Jakarta trips? | research | AFK | — | closed |
| [#3](tickets/03-db-navigator-reference.md) | What exactly should we take from DB Navigator, adapted to Jakarta? | research | AFK | — | closed |
| [#4](tickets/04-map-stance.md) | Keep, hide or drop the map? | grilling | decided-unattended | #1, #3 | closed |
| [#5](tickets/05-ui-redesign-spec.md) | Design system and screen spec: tokens, type scale, spacing scale, component architecture, four screens | prototype | decided-unattended | #3, #4 | closed |

## Not yet specified

- Implementation tickets (UI rebuild, i18n, logic fixes, map change): graduate once #1–#5 close.
- UI/UX review round with the inspector and screenshots: after the rebuild.

## Out of scope

- Everything already out of scope in the first map (ride-hailing, ticketing, intercity rail, backend routing servers).
- New transit data sources or new modes.
