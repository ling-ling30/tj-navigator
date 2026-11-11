# Build Progress — Routing v2 UI Screens (Slice 5)

## Slice 5: Routing v2 Screens Implementation

- **Status**: Completed
- **Build**: `pnpm build` clean (0 errors)
- **Benchmark**: `npx vite-node scripts/routing-v2/bench.ts` passes ("ALL GOLDEN TRIPS PASS")
- **Screens Walkthrough**: `node scripts/routing-v2/screens.mjs` runs 20-step walkthrough; verified PNG outputs across 390px viewport, light and dark themes.

### What Was Built Per Screen

1. **Search (Home) Screen (`src/features/search/`):**
   - **Mode Filter Bar (`ModeFilterBar.tsx`)**: Upgraded to multi-select directly reading and modifying store's `selectedModes` (`toggleMode`, `setSelectedModes`). Added "Semua" chip (resets to all 6 modes), and individual chips for BRT, Bus, Mikrotrans, KRL, MRT, and LRT. Included `showCheckmark` on `Chip` for non-color on/off visual affordance.
   - **Departure Time (`TimePickerModal.tsx`, `SearchScreen.tsx`)**: Bound directly to store's `setDepartAt(epochMs)` and "Sekarang" calling `setDepartAt(null)`. Formatted departure label displayed on the trigger button.
   - **Travel Options Button**: Added "Opsi perjalanan" button opening `ConnectionFilterSheet`.

2. **Options Sheet (`ConnectionFilterSheet.tsx`):**
   - Replaced old filter sheet with 4 travel options bound directly to `travelOptions` and `setTravelOptions`:
     - Max transfers: Langsung saja (0), 1 (1), 2 (2), Bebas (3)
     - Walking: Sedikit, Normal, Jauh
     - Transfer time: Normal, Longgar
     - Premium bus: toggle switch with descriptive pricing note ("Royaltrans dan bus bandara, mulai Rp 15.000").

3. **Results Screen (`src/features/results/`):**
   - **Header Mode Filter**: Mirrored multi-select mode chips directly beneath the results header; toggling re-runs search automatically.
   - **Tone-Step Banners**: Plain-text banners on tone-step surfaces without emoji:
     - `modesGaveNothing`: "Tidak ada rute dengan moda pilihan Anda. Ini rute dengan moda lain."
     - `answerKind === 'relaxed'`: "Tidak ada halte dekat. Rute ini perlu jalan kaki lebih jauh."
     - `closest-approach` and `walk-only` retained existing copy.
   - **Sort Control**: Replaced client-side filter in `useTransitSearch.ts` with 5 sort strategies: Terbaik (default engine order), Tercepat, Transit paling sedikit, Termurah, and Jalan paling sedikit. Removed old max transfers filter (now a travel option).
   - **Connection Card (`ConnectionCard.tsx`)**: Exactly three calm, non-overlapping lines:
     - Line 1: Timestamps (`07:05 → 08:32`), typical duration in bold (`87 mnt`), and range (`80–94 mnt`) when min/max differ by >= 3 min.
     - Line 2: Leg chain with walk chips (`Jalan 4 mnt`) and line badges (`[ 9 ] · 9A · 9C` with interchangeable pooling, max 3 badges then `+N`).
     - Line 3: Small plain badge label (`badgeKeys`: Tercepat, Transit paling sedikit, Termurah, Jalan paling sedikit) followed by facts (`Langsung` / `N kali transit`, `Jalan X m/km`, `Perkiraan Rp X` / `Gratis`, and first ride frequency/infrequent warning).
   - **Mode Suggestion Banner**: When `suggestion` is present, displays "Lebih cepat {n} mnt dengan {modes}" and "Tambahkan {modes}" button calling `applySuggestion()`.

4. **Journey Detail Screen (`src/features/journey/`):**
   - **Header (`JourneyHeader.tsx`)**: Typical duration, range, estimated fare, and "tarif integrasi" tag when `fareIsIntegrated` is true.
   - **Ride Leg (`JourneyDetailScreen.tsx`)**: "Naik {lines}" joined with commas and "atau" / "or", headway ("tiap {n} mnt"), wait time ("Tunggu sekitar {n} mnt"), infrequent bus warning banner, and "Bus premium" label when `premiumFareClass` is present.
   - **Transfer & Walk Legs (`TransferCard.tsx`)**: "Pindah peron di dalam halte, tanpa tap ulang" for paid-area transfers. Sheltered and step-free notes displayed strictly when `isSheltered` / `isStepFree` flags are true on the leg.
   - **Radar Removal**: Removed Radar button from `JourneyTopBar` and sticky bottom CTA from `JourneyDetailScreen`. Radar files left intact but unreachable.

5. **Design System & Theme Integration (`src/styles/tokens.css`, `src/components/AppHeader.tsx`):**
   - Supported light theme by default and dark theme via tokens (`data-theme="dark"` and system preference).
   - No emojis, no glassmorphism, no box shadows, 48px touch targets, minimum 12px font size, sentence case.

### What Could Not Be Built & Store Gaps

- None. All requirements in `UI-SLICE-BRIEF.md` were implemented strictly within specified boundaries (`src/features/**`, `src/hooks/**`, `src/components/**`, `src/i18n/**`, `src/styles/**`, `scripts/routing-v2/screens.mjs`).
- Store observation: `Itinerary.badges` is an empty string array as noted in the brief; `badgeKeys` is used instead. No other missing store properties encountered.
