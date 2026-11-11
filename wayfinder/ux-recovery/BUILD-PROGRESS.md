# Build Progress — TJ-Navigator UI Redesign

## Slice 1: Foundation (Tokens, Tailwind Theme, i18n Core, UI Primitives, Drop MapLibre)
- **Status**: Completed
- **Build**: `pnpm build` succeeded (0 errors, JS bundle reduced from 1,711 kB to 639 kB).
- **Files Created**:
  - `src/styles/tokens.css` (Achromatic Ledger + Transit Accent tokens)
  - `src/styles/index.css` (Tailwind v4 `@theme` mappings)
  - `src/i18n/types.ts`
  - `src/i18n/id.ts` (Bahasa Indonesia dictionary)
  - `src/i18n/en.ts` (English dictionary)
  - `src/i18n/index.ts` (i18n store & translation utility)
  - `src/hooks/useT.ts` (Type-safe translation hook)
  - `src/components/ui/Button.tsx`
  - `src/components/ui/IconButton.tsx`
  - `src/components/ui/Card.tsx`
  - `src/components/ui/Chip.tsx`
  - `src/components/ui/LineBadge.tsx`
  - `src/components/ui/ListRow.tsx`
  - `src/components/ui/Sheet.tsx`
  - `src/components/ui/Stepper.tsx`
  - `src/components/ui/EmptyState.tsx`
  - `src/components/ui/ErrorState.tsx`
  - `src/components/ui/Skeleton.tsx`
  - `src/components/ui/Field.tsx`
- **Files Modified / Removed**:
  - `src/index.css` (redirect to `src/styles/index.css`)
  - `src/components/MapCanvas.tsx` (deleted)
  - `src/App.tsx` (removed MapCanvas import and mount)
  - `package.json` (removed `maplibre-gl`)
- **Leftover**: None.

## Slice 2: Stop Picker Autocomplete & Search Feature
- **Status**: Completed
- **Build**: `pnpm build` succeeded (0 errors).
- **Files Created**:
  - `src/hooks/useStopAutocomplete.ts` (Fast prefix/substring search with popular Jakarta hubs)
  - `src/features/stop-picker/NearbyStopsList.tsx`
  - `src/features/stop-picker/StopSearchResults.tsx` (Highlighted query matching, mode badges)
  - `src/features/stop-picker/StopPickerModal.tsx` (Bottom sheet autocomplete with mode filters)
  - `src/features/search/ModeFilterBar.tsx` (Horizontal transit mode selector)
  - `src/features/search/TimePickerModal.tsx` (Departure time picker sheet)
  - `src/features/search/RecentSearches.tsx` (Past journeys quick chips)
  - `src/features/search/SearchScreen.tsx` (Full Screen 1 implementation with DB Navigator layout)
- **Files Modified / Removed**:
  - `src/App.tsx` (Mounted SearchScreen & StopPickerModal, tokenized loading screen)
  - `src/components/SearchCard.tsx` (deleted)
  - `src/components/StopSearchModal.tsx` (deleted)
- **Leftover**: None.

## Slice 3: Connection Results (Connection List & Filter Sheet)
- **Status**: Completed
- **Build**: `pnpm build` succeeded (0 errors).
- **Files Created**:
  - `src/hooks/useTransitSearch.ts` (Filtering by max transfers & sorting by speed/transfers/fare)
  - `src/features/results/RouteLegPreview.tsx` (Inline mode progression badges and walk steps)
  - `src/features/results/ConnectionCard.tsx` (Tabular timestamps, leg badges, fare, and on-time status)
  - `src/features/results/ConnectionFilterSheet.tsx` (Filter by maximum transfers and sort strategy)
  - `src/features/results/ResultsScreen.tsx` (Full Screen 2 implementation with DB Navigator card list)
- **Leftover**: None.

## Slice 4: Journey Detail Screen & Stepper Rail
- **Status**: Completed
- **Build**: `pnpm build` succeeded (0 errors).
- **Files Created**:
  - `src/features/journey/JourneyHeader.tsx` (Origin -> Destination summary card with fare, timestamps, and delay status)
  - `src/features/journey/JourneyTopBar.tsx` (Top navigation with back affordance and Radar shortcut)
  - `src/features/journey/TransferCard.tsx` (Walking time, distance, sheltered skywalk guidance, and contactless tap-in instruction)
  - `src/features/journey/IntermediateStops.tsx` (Collapsible intermediate stops accordion)
  - `src/features/journey/JourneyDetailScreen.tsx` (Full Screen 3 implementation with DB Navigator vertical rail stepper)
- **Files Modified / Removed**:
  - `src/App.tsx` (Seamless navigation across Home -> Results -> Journey Detail, detail view toggle)
  - `src/components/ItineraryDrawer.tsx` (deleted)
- **Leftover**: None.

## Engine Defect Group 1: GTFS ETL & Network Compilation
- **Status**: Completed
- **Defects Fixed**:
  - SYS-08 (Priority 1): `scripts/build-graph.ts` updated to parse GTFS `routes.txt`, `trips.txt`, `stop_times.txt`, and `stops.txt`. Orphan stops eliminated via reachability pruning (0 orphan stops, 0.0%).
  - SYS-10: `data/seeds/transfer-hubs.json` updated with missing reverse transfer edges (Dukuh Atas 1 <-> Sudirman, CSW 13 <-> ASEAN, Manggarai, Kebayoran, and Galunggung TOD skywalk).
  - Accurate railway kilometrage added to `data/seeds/krl-network.json` and `data/seeds/mrt-network.json`. Cumulative route distance metrics compiled into `public/data/jakarta-transit-network.json`.
- **Metrics**: 7,966 stops, 436 routes, 20 transfers. Artifact size: 749.2 KB (0.73 MB, target < 1.5 MB met).

## Slice 5: Live Radar Departure Board & Telemetry
- **Status**: Completed
- **Build**: `pnpm build` succeeded (0 errors, CSS bundle reduced to 34.09 kB).
- **Files Created**:
  - `src/hooks/useLiveRadar.ts` (Real-time departure table query & smoothed arrival calculation)
  - `src/features/radar/DepartureBoard.tsx` (DB Navigator flat departures table with tabular figures & gate info)
  - `src/features/radar/TelemetryCard.tsx` (Bottleneck diagnostics card with revised ETA & fleet telemetry)
  - `src/features/radar/LiveRadarScreen.tsx` (Full Screen 4 implementation with high-contrast DB Navigator board)
- **Files Modified / Removed**:
  - `src/App.tsx` (Replaced LiveRadarSheet with LiveRadarScreen)
  - `src/components/LiveRadarSheet.tsx` (deleted)
- **Leftover**: None.

## Engine Defect Group 2: RAPTOR Router Backtracking & Fare Engine
- **Status**: Completed
- **Defects Fixed**:
  - SYS-01: RAPTOR backtracking fixed. Separated transit and transfer parent tracking so transfer legs within a round do not decrement round index prematurely and truncate journey origins.
  - SYS-02: Round 0 footpaths supported. Direct concourse / skywalk walks now return validated 0-transfer walking itineraries.
  - SYS-03 & SYS-04: Hardcoded leg metrics eliminated. Real stop hops, intermediate stop names, duration seconds, and cumulative track distances calculated dynamically.
  - SYS-06: MRT progressive fare formula fixed: base Rp 3.000 + Rp 1.000 per station traveled, capped at published Rp 14.000 ceiling.
  - SYS-07: JakLingko integrated tariff fixed per Pergub DKI 133/2021: activated only for multi-modal journeys across ≥2 distinct JakLingko modes (TJ + MRT + LRT). Single-mode journeys evaluate to operator standard fare.
  - SYS-11: Paid-area transfer logic implemented in RAPTOR and FareEngine: transfers within BRT paid areas and contiguous KRL rail platform interchanges (e.g. at Manggarai) correctly charged Rp 0 for transfers.
- **Verification**: `node scripts/audit-trips.mjs` runs 11 real Jakarta benchmark trips: **11/11 PASS (100%)**.

## Engine Defect Group 3: Real Store State & Mock Removal
- **Status**: Completed
- **Defects Fixed**:
  - SYS-05 (Priority 3): Fake fallback mock itineraries (`itin-fastest`, `itin-direct`, `itin-cheapest`) completely removed from `src/lib/store/transit-store.ts`.
  - Empty routes (`rawItineraries.length === 0`) and same-place inputs (`originStop.id === destinationStop.id`) produce authentic empty states without spoofed data.
  - SYS-14: Comprehensive error handling added to `calculateJourney` try/catch block with explicit user-facing error message propagation.
  - Additive public store API field added: `routingStatus: 'idle' | 'computing' | 'success' | 'no-route' | 'same-place' | 'error'`.
  - Documented in `docs/UI-REDESIGN-SPEC.md` under new section `## Engine State Contract`.

## Slice 6: App Shell, Top Navigation & Bilingual Switching
- **Status**: Completed
- **Build**: `pnpm build` succeeded (0 errors, CSS bundle reduced to 27.50 kB).
- **Files Created**:
  - `src/components/AppHeader.tsx` (Tokenized header with brand mark, back affordance, and bilingual toggle)
  - `src/components/OfflineBanner.tsx` (Reactive offline state banner with i18n copy)
- **Files Modified / Removed**:
  - `src/i18n/index.ts` (Persisted locale in localStorage with try/catch error handling & document.lang sync)
  - `src/features/search/SearchScreen.tsx` (Replaced custom header with AppHeader, integrated same-stop warning)
  - `src/features/results/ResultsScreen.tsx` (Handled error and same-stop states)
  - `src/hooks/useTransitSearch.ts` (Exposed store error state)
  - `src/App.tsx` (Integrated OfflineBanner across all views)
  - `src/components/HeaderBar.tsx` (deleted)
- **Leftover**: None.

## Engine Defect Group 4: Live Telemetry & Radar Hardening
- **Status**: Completed
- **Defects Fixed**:
  - SYS-09: `src/lib/telemetry/live-segment-engine.ts` ETA calculation decoupled from hardcoded bus identities. Vehicle and route parameters are resolved dynamically with confidence scores scaled to proximity.
  - SYS-09b: `src/lib/telemetry/mqtt-client.ts` updated so broker disconnects and watchdog expirations transition cleanly to `OFFLINE_FALLBACK` without silently launching synthetic moving buses.
  - SYS-12: Added 30-minute TTL expiration (`SEGMENT_TTL_MS`) to `hydrateFromStorage()` in `live-segment-engine.ts` to purge stale traffic congestion multipliers.
- **Verification**: All headless engine tests and build checks pass cleanly.

## Slice 7: Visual Verification, Responsive Audit & Design Skill Gate
- **Status**: Completed
- **Build**: `pnpm build` succeeded (0 errors, 2.17s).
- **Inspection Tooling**: `node C:\Users\Ricky\.claude-work\skills\design-taste-frontend\scripts\inspect.mjs http://localhost:5173 --app --widths 390,768,1440 --out .taste-skill/inspect`
- **Audit Results**:
  - FAIL: **0** (eliminated all emoji unicode characters across all screens and components).
  - WARN: **1** (defensible 1440px desktop negative space; contrast and tiny-text warnings eliminated).
  - Contrast: 100% compliant in both Light Mode and Dark Mode (all text ≥ 4.5:1, primary ink up to 11.7:1).
  - Typography: 12 / 13 / 14 / 16 px hierarchy; data/labels standardized at 13–14px.
  - Touch Targets: All interactive buttons, chips, and list rows maintain ≥ 48px height / tap targets.
  - Zero glassmorphism, zero box-shadows, zero gradients, zero uppercase tracking.
  - Horizontal overflow: 0 across 390px, 768px, and 1440px viewports.
- **Critique (What is still weak)**:
  1. *Desktop Viewport Fill (1440px)*: The desktop first-screen has ~300px (33%) vertical negative space below the 2-column layout before the primary action bar. While intentionally restful and standard for a utility transit planner, a future enhancement could render a lazy SVG arterial schematic diagram in this zone.
  2. *Mode Filter Scroll Affordance*: The horizontal mode chip bar scrolls smoothly without horizontal page overflow, but lacks an edge fade because gradient masks are strictly banned by house rules.

## Reviewer Defect Remediation (Fixes 1–7)
- **Status**: Completed
- **Build**: `pnpm build` succeeded (0 errors, 2.20s). Audit trips: 11/11 PASS (100%).
- **Summary of Fixes**:
  1. **Fake Live Status & Real Recent Searches**: Removed hardcoded transit status and fake hubs; added small `FareTipCard` with verified JakLingko 3-hr Rp 10.000 integrated fare rule. Replaced static mock searches with localStorage-persisted recent searches (`last 5` searches, try/catch protected), automatically hidden when empty.
  2. **Headway vs Live Badges**: Removed ungrounded 'Tepat waktu' green badges. Connection cards and journey header display delay/on-time status only when backed by genuine live vehicle telemetry; otherwise display headway (`Tiap {n} mnt` / `Every {n} min`) or nothing.
  3. **Walk Chip & Duration Sum**: Leg walk chip updated to clear i18n string `Jalan {n} mnt` (`Walk {n} min`) with walk icon. Stepper & route duration rounding normalized to minute resolution (`Math.round(sec / 60) * 60`), ensuring leg intervals add up exactly to total trip duration. Enforced CSS line-color tokens (`var(--line-*)`) across all badges.
  4. **Self-Hosted Offline Typography**: Eliminated external Google Fonts CDN links and JetBrains Mono. Self-hosted Plus Jakarta Sans via `@fontsource-variable/plus-jakarta-sans`, configured Service Worker precaching for `.woff2` files (17 precached entries). Banned `--font-mono` / monospace UI font stacks across the app.
  5. **Mode Chip 390px Viewport Fit**: Mode filter chip list reconfigured with `flex flex-wrap gap-2` (and consistent padding in Stop Picker modal), eliminating right-edge clipping on 390px viewports without disallowed gradient masks.
  6. **Idempotent Initialization & Dev-Only Clean Logs**: Deduplicated network loading and RAPTOR initialization using singleton promises (`loadNetworkPromise`, `initPromise`, and worker version checks). Stripped emoji characters from all console output and guarded logs behind `import.meta.env.DEV`.
  7. **Comprehensive Multi-Screen Visual Audit**: Reviewed Journey Detail, Live Radar, Stop Picker, language toggle (ID/EN), dark/light modes, desktop 1440px, multi-leg journeys, and edge states (same-stop, no-route). Added accessible keyboard roles to interactive cards and accessible tooltip titles for truncated stop names.

## Proximity Footpaths, Coordinate Routing & Graceful Degradation Ladder
- **Status**: Completed
- **Build**: `pnpm build` succeeded (0 errors, 2.17s).
- **Headless Audit**: `node scripts/audit-trips.mjs`:
  - **TRIP-01 to TRIP-16**: **16 / 16 PASS (100.0%)** (all 11 legacy tests + 5 real commute tests pass).
  - **Graceful Ladder**: **5 / 5 PASS (100.0%)** (`same-place`, `walk-only`, `direct`, `relaxed`, `closest-approach`).
  - **300-Pair Sweep**: **0.0% empty answers** (0/300 empty, 100.0% answered).
    - Before: 55 / 300 routed (18.3%), 81.7% empty / unreachable.
    - After: 300 / 300 answered (100.0%): 221 direct (73.7%), 79 degraded (26.3%: 78 relaxed, 1 closest-approach, 0 walk-only, 0 same-place). Avg duration: 117.8 min. Execution time: 13.9 ms/pair.
- **Key Enhancements**:
  1. **Spatial Footpath Transfers (`scripts/build-graph.ts`)**: Built an O(N) spatial grid index (`CELL_SIZE = 0.004` ~440m) connecting adjacent Transjakarta bus stops within 400m straight-line distance (`MAX_PROXIMITY_WALK_METERS = 400`, detour factor 1.3, speed 1.2 m/s, up to 8 nearest neighbours, same-name stops always linked). Curated multi-modal rail hub walkways in `transfer-hubs.json` are strictly preserved. Graph size: 7,966 stops, 436 routes, 52,898 transfers. Uncompressed JSON: 2,265.5 KB (2.21 MB, below 2.5 MB cap). Workbox cache limit set to 4 MB.
  2. **Coordinate Origin/Destination & Access/Egress Legs (`src/lib/router/access-stops.ts` & `raptor.ts`)**: Origin and destination can be exact coordinates or stops. Nearby access and egress stops within 1.5 km (up to 8 stops per side) are resolved, and initial/final walking legs are computed with distance, duration, and minute-level precision.
  3. **Graceful-Degradation Ladder (`src/lib/router/journey-planner.ts`)**:
     - Level 1 (`direct`): Standard transit search within 1.5 km walk, <= 3 transfers.
     - Level 2 (`relaxed`): Auto-relax to 3 km / 5 km walk and up to 5 transfers with clear banner.
     - Level 3 (`closest-approach`): Partial transit to closest reachable stop + uncovered walking leg + online taxi/ride suggestion + Google Maps deep link (`https://www.google.com/maps/dir/?api=1&origin=...&destination=...`).
     - Level 4 (`walk-only`): Direct walking journey for points within ~1.5 km.
     - Level 5 (`same-place`): Immediate "Anda sudah di tujuan" / "Already at destination" feedback (< 25m).
  4. **Stop Search & Autocomplete Upgrades (`src/hooks/useStopAutocomplete.ts` & UI)**:
     - Word-order independent matching, diacritics stripping (`normalize('NFD')`), and synonym mapping (e.g., "summarecon serpong" -> "gading serpong").
     - Direct coordinate & Google Maps URL parsing (`-6.244, 106.650`, `@lat,lon`, `?q=lat,lon`, `destination=lat,lon`).
     - Route code badges rendered directly in autocomplete results (e.g., `S61`, `7R`, `1`).
     - Geolocation "Lokasi Saya" with 5 explicit states (`idle`, `asking`, `denied`, `unavailable`, `timeout`).
     - Custom point card with "Rumah" / "Kantor" preset pills and localStorage favorites (`tj_favorite_places`).
  5. **UI Banners & Uncovered Cards (`src/features/results/ResultsScreen.tsx`, `TransferCard.tsx`, `JourneyDetailScreen.tsx`)**:
     - Results and Journey Detail render honest warning banners for relaxed, closest-approach, and walk-only answers.
     - TransferCard formats km (`1,4 km`) and renders uncovered legs with ride-hailing suggestions and Google Maps button.

## Known limits
1. **Curated Footpath Scope**: Generic 400m street walks are restricted to Transjakarta bus stops (`tj:*`) to avoid corrupting curated railway interchange pathways (KRL/MRT/LRT) which have specific fare gate and surveyed concourse buffers.
2. **GTFS Stop Naming Variants**: Unofficial landmarks without nearby Transjakarta stops depend on coordinate input or closest-approach routing to reach destination.
3. **Suburban Walk Detour**: Straight-line distance multiplied by 1.3 provides realistic pedestrian travel time across urban Jakarta, but complex elevated highway barriers may require pedestrian overpasses.
