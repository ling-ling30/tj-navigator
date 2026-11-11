# Build brief: screens for Routing v2 (slice 5)

The engine, store and data are done. This slice only changes what the traveller sees. Decisions: tickets [Mode choice and travel options](tickets/08-modes-and-travel-options.md) and [Results list like DB Navigator](tickets/11-results-list-like-db-navigator.md).

## Boundaries

- **Edit only:** `src/features/**`, `src/hooks/**`, `src/components/**`, `src/i18n/**`, `src/styles/**`, and the `SCENARIOS` object in `scripts/routing-v2/screens.mjs`.
- **Do not edit:** `src/lib/**`, `src/types/**`, `src/workers/**`, `scripts/graph-v2/**`, `scripts/routing-v2/bench.ts`, `public/data/**`. If the store lacks something, say so in the notes file; do not work around it in a component.
- Owner's code rules: small focused files (about 150 lines), reuse the existing `src/components/ui` primitives, tokens only (no hex, no px literals, no magic numbers), every string in **both** `src/i18n/id.ts` and `src/i18n/en.ts`, sentence case, minimum 12 px text, 48 px touch targets, no gradients, glass or resting shadows, no emoji.
- Do not commit.

## What the store now gives you (`src/lib/store/transit-store.ts`)

| Field or action | Meaning |
|---|---|
| `selectedModes: number[]` | Mode groups switched on. `ModeGroup` in `src/types/network-v2.ts`: BRT 0, BUS 1, MIKROTRANS 2, KRL 3, MRT 4, LRT 5 |
| `toggleMode(group)`, `setSelectedModes(groups)` | Change modes; the search runs again by itself. At least one mode stays on |
| `travelOptions` and `setTravelOptions(partial)` | `{ maxTransfers: 0 to 3, walking: 'sedikit' or 'normal' or 'jauh', transferTime: 'normal' or 'longgar', includePremium: boolean }` |
| `departAtMs`, `setDepartAt(ms or null)` | Departure time; `null` means now |
| `suggestion` | `{ modeGroups, savesMinutes, itinerary }` when a switched-off mode would be clearly faster, else `null` |
| `applySuggestion()` | Switches those modes on and searches again |
| `modesGaveNothing` | The chosen modes gave nothing; the options shown ignore the mode choice |
| `answerKind`, `routingStatus`, `itineraries` | As before. The order of `itineraries` is "best overall first" |

New optional fields on `Itinerary` and `Leg` (`src/types/transit.ts`): `durationMinMinutes`, `durationMaxMinutes`, `walkMeters`, `badgeKeys` (`fastest`, `fewest_transfers`, `cheapest`, `least_walking`), `fareIsIntegrated`; on a ride leg `lineNames` (all interchangeable lines, main one first), `waitSeconds`, `headwaySeconds` (pooled), `isInfrequent`, `modeGroup`, `premiumFareClass`. `standardFareIdr` and `integratedFareIdr` are now the same single estimate. `badges` (strings) is empty: use `badgeKeys`.

## Screens

### Search (home)

1. **Mode chips**: `ModeFilterBar` becomes multi-select and reads the store. Chips: Semua, BRT, Bus, Mikrotrans, KRL, MRT, LRT. "Semua" is on when all six are on and resets to all. A chip shows on or off clearly (not colour alone).
2. **Departure time**: the existing time picker calls `setDepartAt`. "Sekarang" calls `setDepartAt(null)`.
3. **Opsi perjalanan**: a plain button opening the options sheet (below).

### Options sheet ("Opsi perjalanan")

Reuse `ConnectionFilterSheet` or replace it. Four settings, each a row of choice chips bound to `travelOptions`:

- Transit maksimal: Langsung saja (0), 1, 2, Bebas (3)
- Jalan kaki: Sedikit, Normal, Jauh
- Waktu transit: Normal, Longgar
- Bus premium: a switch, with the note "Royaltrans dan bus bandara, mulai Rp 15.000"

### Results

1. The same mode chips under the header; a change searches again in place.
2. Banners, one at a time, plain text on a tone-step surface:
   - `modesGaveNothing`: "Tidak ada rute dengan moda pilihan Anda. Ini rute dengan moda lain."
   - `answerKind === 'relaxed'`: "Tidak ada halte dekat. Rute ini perlu jalan kaki lebih jauh."
   - closest approach and walk only: keep the existing copy.
3. Sort control: Terbaik (default, the engine's order), Tercepat, Transit paling sedikit, Termurah, Jalan paling sedikit. Replace the `sortBy` in `useTransitSearch` accordingly. Remove the client-side "max transfers" filter: it is now a travel option.
4. Each row (`ConnectionCard`), three lines:
   - Times `07:05 → 08:32`, the typical duration in bold (`87 mnt`), and the range beside it in secondary text (`80–94 mnt`) when min and max differ by 3 minutes or more.
   - The leg chain: walk chips (`Jalan 4 mnt`) and line badges. A ride with several lines shows the main badge and the others as text: `9 · 9A · 9E`, at most three names, then `+2`.
   - Facts: `Langsung` or `1 kali transit`; `Jalan 400 m` (use km from 1.000 m); `Perkiraan Rp 7.000` (or `Gratis`); the first ride's frequency `tiap 5 mnt`, or `jarang, tiap 60 mnt` when `isInfrequent`.
   - Badges from `badgeKeys` as small plain labels: Tercepat, Transit paling sedikit, Termurah, Jalan paling sedikit.
5. Suggestion row under the list when `suggestion` is set: "Lebih cepat {n} mnt dengan {KRL}" and a button "Tambahkan {KRL}" calling `applySuggestion()`. Mode names from the mode group.

### Journey detail

- Header: typical duration, the range, `Perkiraan Rp X`, and "tarif integrasi" when `fareIsIntegrated`.
- Ride leg: "Naik 9, 9A atau 9E" from `lineNames` (join with commas and "atau" before the last; English "or"); "tiap {n} mnt" from `headwaySeconds`; "Tunggu sekitar {n} mnt" from `waitSeconds`; the existing collapsible stop list; a warning line when `isInfrequent`: "Bus ini jarang (tiap {n} mnt). Cek jadwal sebelum berangkat."; "Bus premium" when `premiumFareClass` is set.
- Walk leg: keep the existing layout. When `isPaidAreaTransfer`: "Pindah peron di dalam halte, tanpa tap ulang". Show the sheltered and step-free notes only when the leg's own `isSheltered` / `isStepFree` flags are true; never as fixed text.
- **Remove the Radar entry points** (the "Radar" button and "Pantau keberangkatan radar"). The live feed is not connected yet, and the radar screen shows sample data. Leave the radar files in place, unreachable.

## Checks before you finish

1. `pnpm build` is clean.
2. `npx vite-node scripts/routing-v2/bench.ts` still ends with "ALL GOLDEN TRIPS PASS" (you did not touch the engine, so it must).
3. `node scripts/routing-v2/screens.mjs` walks home → results → journey. Add scenarios that toggle a mode chip, open the options sheet, and show a result with a suggestion (origin `Bekasi` station with only BRT and Bus on). Open the PNG files in `.taste-skill/v2/` and look at them: nothing clipped at 390 px, no overlap, text readable, both themes.
4. Append what you built, what you could not, and anything odd to `wayfinder/routing-v2/BUILD-PROGRESS.md`.
