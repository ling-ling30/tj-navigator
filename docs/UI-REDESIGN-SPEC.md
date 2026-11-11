# TJ-Navigator UI/UX Redesign Specification
**DB Navigator Pattern System · Mobile-First · Bahasa Indonesia Default**

> Status: **Final Specification**  
> Reference System: **DB Navigator (Deutsche Bahn)** adapted for Jakarta Multi-Modal Transit  
> Design Skill Standard: **`design-taste-frontend` (App-Screen Mode: Achromatic Ledger + Strict Contrast)**  
> Target Devices: Mobile Viewports (Primary: 360×800 and 390×844; Tablet/Desktop responsive)  
> Scope: Pure UI/UX redesign & architecture specification. **Zero street basemap, zero `maplibre-gl`, zero glassmorphism, zero resting shadows, minimum 12px text, sentence case.**

---

## 1. Executive Summary & Design Principles

### 1.1 The Commuter Reality
A Jakarta transit commuter is often standing outdoors in glaring sunlight, holding their phone in one hand while walking through a humid corridor, boarding a crowded TransJakarta bus, or rushing through an interchange hub (e.g. CSW-ASEAN or Dukuh Atas). 

The previous dark, glassy, English-only map interface failed this user:
1. **Low Glare Contrast**: Dark translucent glass is illegible under tropical Jakarta sunlight.
2. **Bandwidth & Lie-Fi Vulnerability**: Heavy street tile downloads freeze or fail inside underground MRT stations or crowded BRT stations.
3. **Cognitive Overhead**: Commuters need fast, decisive answers—*"Which vehicle arrives first? Where do I transfer? How much does it cost?"*—not map pans and decorative animations.

### 1.2 Core Design Pillars
1. **DB Navigator High-Contrast Functionalism**: Flat, high-contrast, text-first hierarchy. One unambiguous primary action per screen.
2. **Radical Visual Restraint (`design-taste-frontend` App Mode)**:
   - **No gradients**, **no frosted glass (`backdrop-filter`)**, **no resting box-shadows**.
   - Separation via clean 1px hairline borders (`var(--border)`) and subtle surface tonal shifts (`var(--surface)` vs `var(--ground)`).
   - Minimum font size: **12px** (no microscopic illegible subtext).
   - Sentence case typography throughout (banned: tracked all-caps labels).
   - Single primary action colour: **Deep Transit Blue (`#004B87`)** for primary buttons and selection indicators.
   - Status colours (**Red, Green, Amber**) are strictly reserved for operational state (delays, live active GPS tracking, tight transfer risk).
3. **Bahasa Indonesia Default**: Everyday transit terminology native to Jakarta commuters (*Asal, Tujuan, Cari Rute, Transit, Peron, Pintu Masuk, Tepat Waktu*), with an instant English toggle.
4. **Zero-Basemap Architecture**: As decided in Ticket #4, `maplibre-gl` is completely removed. Transit navigation is handled through scannable cards and a vertical stepper timeline.

---

## 2. Design Tokens & Styling System

All styling must be driven by strict design tokens. Component files must contain **zero hardcoded hex values** and **zero arbitrary magic pixel values**.

### 2.1 CSS Custom Properties (`src/styles/tokens.css`)

```css
/* ==========================================================================
   TJ-NAVIGATOR DESIGN SYSTEM TOKENS
   Achromatic Ledger Base + Transit Accent System
   ========================================================================== */

:root {
  /* --- Surfaces & Canvas (Light Mode Default) --- */
  --ground: #F8FAFC;            /* Page canvas background (cool crisp neutral) */
  --surface: #FFFFFF;           /* Card, sheet, and container backgrounds */
  --surface-raised: #F1F5F9;    /* Inset blocks, list hover, input backgrounds */
  --surface-active: #E2E8F0;    /* Pressed row, active chip background */

  /* --- Dividers & Borders --- */
  --border: #E2E8F0;            /* Standard 1px container and card hairline */
  --border-strong: #CBD5E1;     /* Input border, focused control border */
  --rule: #F1F5F9;              /* Sub-item hairline list dividers */

  /* --- Text & Ink --- */
  --text-primary: #0F172A;      /* Primary headings, titles, timestamps (high contrast) */
  --text-secondary: #475569;    /* Subtitles, secondary metadata, walking instructions */
  --text-muted: #64748B;        /* Placeholders, disabled states, inactive labels */
  --text-inverse: #FFFFFF;      /* Text on dark buttons or badges */

  /* --- Single Primary Action Colour --- */
  --action-primary: #004B87;    /* Deep Transit Blue: primary buttons, selected tabs */
  --action-primary-hover: #003865;
  --action-primary-active: #002B4E;
  --action-primary-surface: #EBF4FC; /* Subtle background for selected chips/states */

  /* --- Semantic Status Colours (STRICT: State Only) --- */
  --status-on-time: #16A34A;    /* Green: On-time transit, active vehicle GPS */
  --status-on-time-surface: #DCFCE7;
  --status-on-time-text: #14532D;

  --status-delayed: #DC2626;    /* Red: Delays, cancelled routes, missed transfers */
  --status-delayed-surface: #FEE2E2;
  --status-delayed-text: #7F1D1D;

  --status-warning: #D97706;    /* Amber: Tight transfers (<3m), traffic congestion */
  --status-warning-surface: #FEF3C7;
  --status-warning-text: #78350F;

  /* --- Transit Line Identification Colours (Official Badges Only) --- */
  --line-tj: #0055A5;           /* TransJakarta BRT Blue */
  --line-krl: #C8102E;          /* KRL Commuter Line Red */
  --line-mrt: #002F6C;          /* MRT Jakarta Deep Blue */
  --line-lrt: #F58220;          /* LRT Jabodebek / Jakarta Orange */
  --line-mikro: #00A3E0;        /* Mikrotrans Light Blue */
  --line-walk: #64748B;         /* Walking transfer Slate */

  /* --- Radius (Bimodal Rule: 6px controls, 8px cards, 16px sheets) --- */
  --radius-badge: 4px;
  --radius-control: 6px;        /* Buttons, inputs, chips */
  --radius-card: 8px;           /* Cards, dialogs */
  --radius-sheet: 16px;         /* Bottom sheets top corners */

  /* --- Typography Scale --- */
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;

  --text-title: 20px;           /* Screen titles, modal headings */
  --text-title-lh: 28px;
  
  --text-section: 16px;         /* Stop names, card titles, hero times */
  --text-section-lh: 24px;
  
  --text-body: 14px;            /* Standard body, durations, descriptions */
  --text-body-lh: 20px;
  
  --text-small: 12px;           /* Badges, meta tags, timestamps (MINIMUM ALLOWED) */
  --text-small-lh: 16px;

  /* --- Touch Targets & Sizing --- */
  --touch-target-min: 48px;     /* Minimum interactive dimension */
  --control-height: 48px;       /* Primary input & button height */
  --button-compact-height: 36px;/* Secondary compact button height */
  --badge-height: 24px;

  /* --- Spacing Scale (4px Strict Modular Grid) --- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;              /* Standard screen horizontal gutter */
  --space-5: 20px;
  --space-6: 24px;              /* Section gap */
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* --- Elevation & Shadows (No resting shadow; elevation on floating items only) --- */
  --shadow-none: none;
  --shadow-floating: 0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04);
  --shadow-sheet: 0 -4px 20px -2px rgba(15, 23, 42, 0.12);

  /* --- Z-Index Hierarchy --- */
  --z-base: 0;
  --z-sticky: 10;
  --z-dropdown: 20;
  --z-backdrop: 30;
  --z-sheet: 40;
  --z-toast: 50;

  /* --- Motion --- */
  --duration-snappy: 150ms;
  --duration-sheet: 250ms;
  --ease-out-snappy: cubic-bezier(0.16, 1, 0.3, 1);
}

/* --- Dark Theme (Follows System Preferences) --- */
@media (prefers-color-scheme: dark) {
  :root {
    --ground: #090D16;
    --surface: #131A29;
    --surface-raised: #1C2638;
    --surface-active: #28354D;

    --border: #242F44;
    --border-strong: #374663;
    --rule: #1E283A;

    --text-primary: #F8FAFC;
    --text-secondary: #94A3B8;
    --text-muted: #64748B;
    --text-inverse: #0F172A;

    --action-primary: #38BDF8;    /* Lighter blue for dark background contrast */
    --action-primary-hover: #7DD3FC;
    --action-primary-active: #BAE6FD;
    --action-primary-surface: #0C4A6E;

    --status-on-time: #4ADE80;
    --status-on-time-surface: #064E3B;
    --status-on-time-text: #D1FAE5;

    --status-delayed: #F87171;
    --status-delayed-surface: #7F1D1D;
    --status-delayed-text: #FEE2E2;

    --status-warning: #FBBF24;
    --status-warning-surface: #78350F;
    --status-warning-text: #FEF3C7;

    --shadow-floating: 0 4px 12px -2px rgba(0, 0, 0, 0.4);
    --shadow-sheet: 0 -4px 20px -2px rgba(0, 0, 0, 0.5);
  }
}
```

### 2.2 Tailwind v4 `@theme` Configuration (`src/styles/index.css`)

In Tailwind v4, `@theme` maps custom properties directly to utility classes without a JavaScript config file:

```css
@import "tailwindcss";
@import "./tokens.css";

@theme {
  --color-ground: var(--ground);
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-surface-active: var(--surface-active);

  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-rule: var(--rule);

  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-text-inverse: var(--text-inverse);

  --color-action: var(--action-primary);
  --color-action-hover: var(--action-primary-hover);
  --color-action-surface: var(--action-primary-surface);

  --color-status-ontime: var(--status-on-time);
  --color-status-ontime-surface: var(--status-on-time-surface);
  --color-status-ontime-text: var(--status-on-time-text);

  --color-status-delayed: var(--status-delayed);
  --color-status-delayed-surface: var(--status-delayed-surface);
  --color-status-delayed-text: var(--status-delayed-text);

  --color-status-warning: var(--status-warning);
  --color-status-warning-surface: var(--status-warning-surface);
  --color-status-warning-text: var(--status-warning-text);

  --color-line-tj: var(--line-tj);
  --color-line-krl: var(--line-krl);
  --color-line-mrt: var(--line-mrt);
  --color-line-lrt: var(--line-lrt);
  --color-line-mikro: var(--line-mikro);
  --color-line-walk: var(--line-walk);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);

  --radius-badge: var(--radius-badge);
  --radius-control: var(--radius-control);
  --radius-card: var(--radius-card);
  --radius-sheet: var(--radius-sheet);
}

/* Global resetting rules */
html, body {
  background-color: var(--ground);
  color: var(--text-primary);
  font-family: var(--font-sans);
  min-height: 100dvh;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

/* Tabular figures utility for all timing, pricing and countdowns */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

---

## 3. Component Inventory & Folder Architecture

### 3.1 Architectural Rules
1. **File Size Limit**: No component or file over **~150 lines**. Any file reaching 140 lines must be split into logical sub-components.
2. **Strict Separation of Concerns**: Presentational primitives in `src/components/ui/` do not access Zustand stores, router workers, or telemetry sockets. State integration occurs strictly within `src/features/*` containers or custom hooks.
3. **Zero Hardcoded Values**: All paddings, sizes, colours, and radiuses derive strictly from token utilities (e.g. `p-4`, `rounded-card`, `bg-surface`, `border-border`, `text-text-primary`).

### 3.2 Folder Structure

```
src/
├── components/
│   └── ui/                     # Pure reusable presentational primitives (≤ 150 lines each)
│       ├── Button.tsx          # Primary, secondary, subtle variants (min 48px height)
│       ├── IconButton.tsx      # Icon-only tap targets (min 48×48px)
│       ├── Card.tsx            # Bordered flat card container (8px radius)
│       ├── Chip.tsx            # Filter & toggle pills with active state
│       ├── LineBadge.tsx       # Transit mode & corridor badges (TJ, KRL, MRT, LRT)
│       ├── ListRow.tsx         # Structured two-line list row with tabular meta
│       ├── Sheet.tsx           # Accessible bottom sheet / modal with backdrop
│       ├── Stepper.tsx         # Vertical rail stepper timeline for journey legs
│       ├── EmptyState.tsx      # Honest zero-state with explanation & action
│       ├── ErrorState.tsx      # Alert box with retry affordance
│       ├── Skeleton.tsx        # Flat pulse loading placeholder
│       └── Field.tsx           # Text input with label, prefix icon & clear button
├── features/
│   ├── search/                 # Screen 1: Origin/Destination & Filter logic
│   │   ├── SearchScreen.tsx    # Primary container
│   │   ├── ModeFilterBar.tsx   # Transit mode selector pills
│   │   ├── TimePickerModal.tsx # "Berangkat Sekarang" / Custom time modal
│   │   └── RecentSearches.tsx  # Quick-tap past journeys
│   ├── results/                # Screen 2: Candidate connections
│   │   ├── ResultsScreen.tsx   # Connection list view
│   │   ├── ConnectionCard.tsx  # Single itinerary summary card
│   │   └── RouteLegPreview.tsx # Inline progression sequence ([TJ 1] -> [M1])
│   ├── journey/                # Screen 3: Active journey itinerary stepper
│   │   ├── JourneyDetailScreen.tsx
│   │   ├── JourneyHeader.tsx   # Origin -> Destination hero card with fare & duration
│   │   ├── TransferCard.tsx    # Walk step & contactless card tap instruction
│   │   └── IntermediateStops.tsx # Collapsible accordion ("Lihat 4 halte antara")
│   ├── radar/                  # Screen 4: Real-time stop departure board
│   │   ├── LiveRadarScreen.tsx
│   │   ├── DepartureBoard.tsx  # Approaching vehicle departures table
│   │   └── TelemetryCard.tsx   # Recounted traffic ETA & congestion indicator
│   └── stop-picker/            # Autocomplete modal for origin/destination
│       ├── StopPickerModal.tsx # Full-screen sheet with search field
│       ├── StopSearchResults.tsx # Mode-badged stop matches
│       └── NearbyStopsList.tsx # Geolocation-suggested nearby halts
├── hooks/
│   ├── useT.ts                 # Tiny type-safe translation hook
│   ├── useTransitSearch.ts     # Connects search form to RAPTOR router worker
│   ├── useLiveRadar.ts         # Subscribes to vehicle telemetry/MQTT updates
│   └── useStopAutocomplete.ts  # Fast prefix filtering for stations/hubs
├── i18n/
│   ├── id.ts                   # Primary Bahasa Indonesia dictionary
│   ├── en.ts                   # English fallback dictionary
│   ├── types.ts                # Strict TypeScript keys
│   └── index.ts                # Store & toggle helpers
└── styles/
    ├── tokens.css              # Custom properties
    └── index.css               # Tailwind v4 @theme directives
```

---

## 4. Per-Screen Specifications & Wireframes

All screens are designed for outdoor mobile utility at **360×800** and **390×844** viewports.

---

### Screen 1: Home / Search Screen (`/`)

#### Purpose
Instant trip origin and destination entry with mode filters and quick-action recent stops.

#### Layout Specification
- **Top Bar (48px)**:
  - Left: App brand mark `"TJ-Navigator"` (`16px font-semibold`).
  - Right: Language switch button (`ID | EN`, `12px font-medium`, min 48×48px target).
- **Hero Card (Flat, 8px radius, 1px border)**:
  - Stacked Origin and Destination input fields.
  - Right side: Circular swap button (`⇄`, 48×48px touch target).
  - Tapping either input opens the **Stop Picker Sheet**.
- **Context Row**:
  - Time chip: default `"Berangkat: Sekarang"` (Depart: Now) with clock icon. Tapping opens time selector.
- **Mode Filters (Horizontal Scroll)**:
  - Filter chips: `Semua` (All), `TransJakarta`, `KRL`, `MRT`, `LRT`, `Mikrotrans`.
- **Recent Searches**:
  - Up to 3 past trips shown as one-tap chips (e.g. `"Tebet → Bundaran HI"`).
- **Single Primary Action**:
  - Sticky bottom container with full-width primary button: **`Cari Rute`** (Search Route) in `--action-primary` (`#004B87`), 48px height, 16px semibold text.
- **Hidden on Mobile**:
  - Map background (removed), complex advance booking options, seat selection, class selectors.

#### ASCII Wireframe (Mobile 360×800)
```
+------------------------------------------+
|  TJ-NAVIGATOR                    [ID|EN] | 48px Top Bar
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  | [o] Halte Asal                     |  | Input 1 (48px)
|  |     Stasiun Tebet                  |  |
|  |------------------------------[ ⇄ ]-|  | Swap Button (48px)
|  | [*] Halte Tujuan                   |  |
|  |     Pilih halte atau stasiun...    |  | Input 2 (48px)
|  +------------------------------------+  |
|                                          |
|  [ 🕒 Berangkat: Sekarang ▾ ]            | Time Filter Chip
|                                          |
|  MODA TRANSPORTASI                       | 12px Section Header
|  [✓ Semua] [TransJakarta] [KRL] [MRT]    | Mode Chips (36px)
|                                          |
|  PENCARIAN TERAKHIR                      | 12px Section Header
|  [ ↺ Tebet → Tosari                ]     | Recent Chip
|  [ ↺ Blok M → Kota                 ]     | Recent Chip
|                                          |
|                                          |
|                                          |
|  +------------------------------------+  |
|  |              Cari Rute             |  | Primary CTA (48px)
|  +------------------------------------+  | Sticky Bottom Bar
+------------------------------------------+
```

---

### Screen 2: Connection Results Screen (`/results`)

#### Purpose
Present candidate transit itineraries ranked by Pareto optimality (speed, transfer count, and fare), allowing instant scannable comparison.

#### Layout Specification
- **Top Bar (48px)**:
  - Left: Back icon button (`‹`, min 48×48px).
  - Center: Summary text (`Tebet → Tosari`, `14px font-medium`).
  - Right: Filter icon button (`⚙`, opens filter sheet for max transfers).
- **Result Status Bar (32px)**:
  - Active time and result count: e.g. `"Berangkat 07:15 · 3 pilihan rute"`.
- **Connection Cards List**:
  - Vertical list of candidate cards, separated by 12px gaps.
  - **Card Anatomy**:
    - **Header Row**: Departure and arrival timestamps in bold tabular numerals (`07:15 ➔ 07:48`), centered total duration (`33 mnt`), transfer count on right (`1 transit`).
    - **Transit Sequence Row**: Distinct mode badges connected by minimal arrows: `[KRL Red] ➔ 🚶 4m ➔ [M1 MRT]`.
    - **Footer Row**: Total integrated fare (`Rp 6.500`) on left; live reliability/headway tag on right (`Tepat waktu` or `Tiap 4 mnt`).
    - Entire card is an active tap target linking to Journey Detail.
- **Single Primary Action**:
  - Selecting any connection card navigates to Journey Detail.

#### ASCII Wireframe (Mobile 360×800)
```
+------------------------------------------+
|  [‹]  Tebet → Tosari               [ ⚙ ] | 48px Top Bar
+------------------------------------------+
|  Berangkat 07:15 · 3 pilihan rute        | Meta info
|                                          |
|  +------------------------------------+  | Card 1 (Fastest)
|  | 07:15 ➔ 07:48   33 mnt   1 transit |  |
|  | ---------------------------------- |  |
|  | [KRL Cikarang] ➔ 🚶 4m ➔ [M1 MRT]  |  | Leg sequence
|  | ---------------------------------- |  |
|  | Rp 6.500           ● Tepat waktu › |  | Fare + Status
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  | Card 2 (Direct BRT)
|  | 07:20 ➔ 08:08   48 mnt   0 transit |  |
|  | ---------------------------------- |  |
|  | [TJ 4C Koridor 4C]                 |  |
|  | ---------------------------------- |  |
|  | Rp 3.500         ⚠️ Macet +8 mnt › |  | Live Congestion
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  | Card 3 (Lowest Fare)
|  | 07:18 ➔ 08:02   44 mnt   1 transit |  |
|  | ---------------------------------- |  |
|  | [TJ 9] ➔ 🔄 CSW Hub ➔ [TJ 1]       |  |
|  | ---------------------------------- |  |
|  | Rp 3.500 (Gratis transit)        › |  |
|  +------------------------------------+  |
+------------------------------------------+
```

---

### Screen 3: Journey Detail Screen (`/journey/:id`)

#### Purpose
Turn-by-turn itinerary stepper guiding the commuter through every leg, platform gate, walking transfer, and fare tap.

#### Layout Specification
- **Top Bar (48px)**:
  - Left: Back icon button (`‹`).
  - Center: `"Detail Perjalanan"` (`16px font-semibold`).
  - Right: Live radar button (`📡 Radar`, navigates to stop radar).
- **Summary Header Card**:
  - Departure and arrival overview: `07:15 → 07:48 (33 mnt)`.
  - Fare and transfer summary: `Rp 6.500 · 1 transit`.
- **Vertical Stepper Timeline (DB Navigator Rail)**:
  - **Departure Station Node**: Solid mode-coloured dot, departure time `07:15`, Station Name: `Stasiun Tebet`, Platform info: `Peron 2 · Arah Manggarai`.
  - **Transit Leg Block**:
    - Solid Line Badge: `[KRL Cikarang Line]`.
    - Vehicle ETA/Headway: `Armada KRL LF-102 · Tepat waktu`.
    - Intermediate stops disclosure: Text accordion button `"▼ 2 stasiun (Cikini, Manggarai)"`.
  - **Transfer Card (Inset Surface)**:
    - Walking icon, walking distance and time: `🚶 Jalan kaki 300 m (4 mnt)`.
    - Clear skywalk / interchange gate instruction: `Gunakan JPO/Skybridge ke Stasiun MRT Sudirman`.
    - Tap instruction: `Tap-in kartu multi-trip / JakLingko di gate MRT`.
  - **Second Leg Node**:
    - `07:28 Stasiun MRT Dukuh Atas · Peron 1 · Arah Bundaran HI`.
    - Transit Leg Badge: `[MRT Jakarta M1]`.
  - **Arrival Node**:
    - `07:48 Stasiun Bundaran HI · Pintu Keluar Barat`.
- **Single Primary Action**:
  - Sticky bottom button: **`Pantau Bus / Kereta Langsung`** (Track Live Radar).

#### ASCII Wireframe (Mobile 360×800)
```
+------------------------------------------+
|  [‹]  Detail Perjalanan       [📡 Radar] | 48px Top Bar
+------------------------------------------+
|  +------------------------------------+  |
|  | 07:15 ➔ 07:48   33 mnt   Rp 6.500  |  | Summary Card
|  +------------------------------------+  |
|                                          |
|  ● 07:15  Stasiun Tebet                  | Origin Node
|  |        Peron 2 · Arah Manggarai       |
|  |                                       |
|  |  [KRL Cikarang Line]                  | Leg Badge
|  |  ▶ Tepat waktu (Armada 104)           | Live Telemetry
|  |  [▼ 2 stasiun antara]                 | Collapsible
|  |                                       |
|  ○ 07:24  Stasiun Sudirman               | Transfer Node
|  |                                       |
|  |  +---------------------------------+  |
|  |  | 🚶 Jalan kaki 300 m (4 mnt)     |  | Transfer Box
|  |  | Lewati Skybridge Dukuh Atas     |  | Step Instruction
|  |  | 💳 Tap-in di gate masuk MRT     |  | Tap Direction
|  |  +---------------------------------+  |
|  |                                       |
|  ● 07:28  Stasiun MRT Dukuh Atas         | Boarding Node
|  |        Peron 1 · Arah Bundaran HI     |
|  |  [M1 MRT Jakarta]                     |
|  |                                       |
|  ■ 07:48  Stasiun Bundaran HI            | Destination Node
|           Pintu Keluar B (Plaza Indo)    | Exit Gate
|                                          |
|  +------------------------------------+  |
|  |     Pantau Keberangkatan Radar     |  | Primary Action (48px)
|  +------------------------------------+  |
+------------------------------------------+
```

---

### Screen 4: Live Radar Screen (`/radar/:stopId`)

#### Purpose
Real-time departure board (*Abfahrtstafel*) for a station or hub, presenting accurate incoming vehicle countdowns and honest traffic bottleneck indicators.

#### Layout Specification
- **Top Bar (48px)**:
  - Left: Back icon button (`‹`).
  - Center: Station name (`Halte Tosari`, `16px font-semibold`).
  - Right: Refresh button (`↻`, with last-updated timestamp).
- **Stop Overview Card**:
  - Station name, corridor badges served (`Koridor 1, 4C, 6B`), hub interchange links (`MRT Dukuh Atas, KRL Sudirman`).
- **Live Departure Table (No zebra striping, hairline dividers)**:
  - **Column 1**: Line badge and destination (`[1] Blok M`).
  - **Column 2**: Gate/door number (`Pintu 2`).
  - **Column 3**: Right-aligned arrival countdown (`3 mnt lagi` or `07:32`).
- **Recounted Bottleneck Diagnostic Card (Displayed if vehicle is delayed)**:
  - Warning card (Amber/Red hairline):
  - Headline: `Peringatan Kepadatan Lalu Lintas` (Traffic Congestion Alert).
  - Diagnostic reason: `Bus TJ-204 tertahan di persimpangan Kuningan (0 km/h selama 90 detik). Sisa jarak 1,4 km.`
  - Honest revised ETA: `Estimasi tiba: 8–11 mnt (Jadwal normal: 3 mnt)`.
- **Single Primary Action**:
  - Sticky button: **`Pilih Rute dari Halte Ini`** (Plan Journey from this Stop).

#### ASCII Wireframe (Mobile 360×800)
```
+------------------------------------------+
|  [‹]  Halte Tosari (Koridor 1)     [ ↻ ] | 48px Top Bar
+------------------------------------------+
|  Terakhir diperbarui: Baru saja          | Stale Data Monitor
|                                          |
|  JADWAL KEBERANGKATAN                    | 12px Section Header
|  +------------------------------------+  |
|  | [1 TJ] Blok M                      |  | Row 1
|  | Pintu 3                 3 mnt lagi |  | Tabular Countdown
|  |------------------------------------|  |
|  | [M1] Lebak Bulus                   |  | Row 2
|  | Peron 2                 7 mnt lagi |  |
|  |------------------------------------|  |
|  | [4C] TU Gas                        |  | Row 3
|  | Pintu 1           ⚠️ 14 mnt (Macet)|  | Recounted Delay
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  | ⚠️ DIAGNOSTIK KETERLAMBATAN         |  | Traffic Alert Card
|  | Bus Koridor 4C melambat di Kuningan|  |
|  | Kecepatan 0 km/h (lampu merah).    |  | Honest Telemetry
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |       Pilih Rute dari Halte Ini    |  | Primary Action (48px)
|  +------------------------------------+  |
+------------------------------------------+
```

---

### Screen 5: Stop Picker Screen (Modal / Sheet)

#### Purpose
Rapid autocomplete search allowing commuters to find any station, bus stop, or multi-modal interchange in Jakarta within 2 keystrokes.

#### Layout Specification
- **Top Search Bar (48px)**:
  - Input with auto-focus: `"Cari halte, stasiun, atau rute..."`.
  - Prefix search icon, clear button (`✕`, min 48×48px), and text button `"Batal"` (Cancel).
- **Filter Chips**:
  - `Semua`, `TransJakarta`, `KRL`, `MRT`, `LRT`.
- **Search Results List**:
  - Two-line rows with minimum 48px row height.
  - Left: Mode badge (`[MRT]`, `[TJ]`, `[KRL]`).
  - Center: Station name with matched substring bolded (`Halte **Dukuh Atas** 1`).
  - Subline: Mode description and interchange links (`Koridor 1, 4, 6 · Terhubung ke MRT`).
  - Right: Distance if location enabled (`350 m`).
- **Single Primary Action**:
  - Tapping any row selects the stop and closes the sheet immediately.

#### ASCII Wireframe (Mobile 360×800)
```
+------------------------------------------+
| [🔍] Dukuh Atas                    [✕][Batal]
+------------------------------------------+
| [✓ Semua] [TransJakarta] [KRL] [MRT]     | Mode Filters
|                                          |
| HASIL PENCARIAN (4)                      | 12px Header
| +--------------------------------------+ |
| | [TJ] Halte Dukuh Atas 1              | | Match 1
| |      Koridor 1 · Terhubung MRT Sud.  | | 48px Row
| |--------------------------------------| |
| | [MRT] Stasiun MRT Dukuh Atas BNI     | | Match 2
| |       Jalur Utara-Selatan · 300 m    | |
| |--------------------------------------| |
| | [KRL] Stasiun Sudirman               | | Match 3
| |       Commuter Line Cikarang         | |
| |--------------------------------------| |
| | [LRT] Stasiun LRT Dukuh Atas         | | Match 4
| |       LRT Jabodebek Lintas Cibubur   | |
| +--------------------------------------+ |
+------------------------------------------+
```

---

## 5. Bahasa Indonesia Copy Deck & English Equivalents

Every user-facing string must be referenced via the `useT` hook. Hardcoded strings in TSX are strictly banned.

### 5.1 General & Navigation
| Key | Bahasa Indonesia (`id`) | English (`en`) |
| :--- | :--- | :--- |
| `app.title` | TJ-Navigator | TJ-Navigator |
| `nav.back` | Kembali | Back |
| `nav.cancel` | Batal | Cancel |
| `nav.close` | Tutup | Close |
| `nav.refresh` | Perbarui | Refresh |
| `lang.toggle` | EN | ID |

### 5.2 Search Screen
| Key | Bahasa Indonesia (`id`) | English (`en`) |
| :--- | :--- | :--- |
| `search.origin_label` | Halte Asal | Origin Stop |
| `search.origin_placeholder` | Pilih halte keberangkatan... | Choose departure stop... |
| `search.dest_label` | Halte Tujuan | Destination Stop |
| `search.dest_placeholder` | Pilih halte tujuan... | Choose destination stop... |
| `search.swap_stops` | Tukar posisi asal dan tujuan | Swap origin and destination |
| `search.depart_now` | Berangkat: Sekarang | Depart: Now |
| `search.depart_time` | Berangkat pada {time} | Depart at {time} |
| `search.arrive_by` | Tiba sebelum {time} | Arrive by {time} |
| `search.modes_header` | Moda Transportasi | Transit Modes |
| `search.mode_all` | Semua | All |
| `search.mode_tj` | TransJakarta | TransJakarta |
| `search.mode_krl` | KRL Commuter | KRL Commuter |
| `search.mode_mrt` | MRT Jakarta | MRT Jakarta |
| `search.mode_lrt` | LRT | LRT |
| `search.mode_mikro` | Mikrotrans | Mikrotrans |
| `search.recents_header` | Pencarian Terakhir | Recent Searches |
| `search.cta_button` | Cari Rute | Search Route |

### 5.3 Results & Itineraries
| Key | Bahasa Indonesia (`id`) | English (`en`) |
| :--- | :--- | :--- |
| `results.title` | Pilihan Rute | Route Options |
| `results.count` | {count} rute ditemukan | {count} routes found |
| `results.direct` | Langsung (0 transit) | Direct (0 transfers) |
| `results.transfers` | {count} transit | {count} transfers |
| `results.duration` | {minutes} mnt | {minutes} min |
| `results.fare_free` | Gratis | Free |
| `results.fare_integrated` | Rp {amount} (Tarif Integrasi) | Rp {amount} (Integrated Fare) |
| `results.fastest_badge` | Tercepat | Fastest |
| `results.least_transfers` | Paling Sedikit Transit | Fewest Transfers |
| `results.status_ontime` | Tepat waktu | On time |
| `results.status_delayed` | Terlambat +{minutes} mnt | Delayed +{minutes} min |
| `results.status_headway` | Setiap {range} mnt | Every {range} min |

### 5.4 Journey Detail & Stepper
| Key | Bahasa Indonesia (`id`) | English (`en`) |
| :--- | :--- | :--- |
| `journey.title` | Detail Perjalanan | Journey Detail |
| `journey.platform` | Peron {number} | Platform {number} |
| `journey.door` | Pintu {number} | Gate {number} |
| `journey.direction` | Arah {destination} | Towards {destination} |
| `journey.walk_distance` | Jalan kaki {distance} ({minutes} mnt) | Walk {distance} ({minutes} min) |
| `journey.intermediate_stops` | {count} halte antara | {count} intermediate stops |
| `journey.intermediate_hide` | Sembunyikan halte antara | Hide intermediate stops |
| `journey.tap_instruction` | Tap kartu di gate masuk | Tap card at entrance gate |
| `journey.tap_transfer_free` | Pindah jalur tanpa tap ulang | Transfer inside station (no re-tap) |
| `journey.radar_cta` | Pantau Keberangkatan Radar | Track Live Departure Radar |

### 5.5 Live Radar
| Key | Bahasa Indonesia (`id`) | English (`en`) |
| :--- | :--- | :--- |
| `radar.title` | Radar Halte | Stop Radar |
| `radar.board_header` | Jadwal Keberangkatan | Departures Board |
| `radar.due_now` | Tiba sekarang | Due now |
| `radar.minutes_away` | {minutes} mnt lagi | in {minutes} min |
| `radar.crowd_low` | Kursi tersedia | Seats available |
| `radar.crowd_medium` | Berdiri longgar | Standing room |
| `radar.crowd_high` | Bus padat | Crowded |
| `radar.bottleneck_title` | Peringatan Kepadatan Lalu Lintas | Traffic Congestion Alert |
| `radar.bottleneck_desc` | Bus melambat karena kemacetan di {location}. | Bus delayed due to congestion at {location}. |
| `radar.plan_from_here` | Pilih Rute dari Halte Ini | Plan Journey from this Stop |

### 5.6 System States & Edge Cases
| State Key | Bahasa Indonesia (`id`) | English (`en`) |
| :--- | :--- | :--- |
| `state.loading` | Mencari rute terbaik... | Searching for best routes... |
| `state.empty_title` | Rute Tidak Ditemukan | No Route Found |
| `state.empty_desc` | Tidak ada rute langsung untuk pilihan moda ini. Coba aktifkan semua moda atau periksa halte terdekat. | No direct route found for these transit modes. Try enabling all modes or checking nearby stops. |
| `state.same_stop_title` | Halte Asal & Tujuan Sama | Origin & Destination Are Identical |
| `state.same_stop_desc` | Silakan pilih halte tujuan yang berbeda dari halte keberangkatan. | Please choose a destination stop different from your departure stop. |
| `state.offline_banner` | Mode Offline: Menggunakan jadwal dan rute tersimpan | Offline Mode: Using saved routes and schedules |
| `state.error_title` | Gagal Memuat Data | Failed to Load Transit Data |
| `state.error_retry` | Coba Lagi | Try Again |
| `state.stale_data` | Data GPS diperbarui {minutes} mnt lalu | GPS telemetry updated {minutes} min ago |

---

## 6. Implementation Slices

Each slice is self-contained, independently buildable, and verified by `pnpm build`. No slice leaves broken imports or TypeScript compile errors.

---

### Slice 1: Foundation (Design Tokens, i18n Core, UI Primitives, Drop MapLibre)
- **Goal**: Establish the DB Navigator / Achromatic Ledger token foundation, build pure presentational primitives, set up the bilingual dictionary, and remove `maplibre-gl` from the repository.
- **Files Created/Modified**:
  - Create: `src/styles/tokens.css`
  - Modify: `src/styles/index.css` (Tailwind v4 `@theme` mappings)
  - Create: `src/i18n/types.ts`, `src/i18n/id.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`
  - Create: `src/hooks/useT.ts`
  - Create UI Primitives: `src/components/ui/Button.tsx`, `src/components/ui/IconButton.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Chip.tsx`, `src/components/ui/LineBadge.tsx`, `src/components/ui/ListRow.tsx`, `src/components/ui/Sheet.tsx`, `src/components/ui/Stepper.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/ErrorState.tsx`, `src/components/ui/Skeleton.tsx`, `src/components/ui/Field.tsx`
  - Remove / Deprecate: `src/components/MapCanvas.tsx`, remove `maplibre-gl` from `package.json`.
- **Done-Check**:
  - `pnpm remove maplibre-gl @types/maplibre-gl` succeeds.
  - `pnpm build` completes with 0 errors.
  - UI primitives render in a test mount with no missing styles.

---

### Slice 2: Stop Picker Autocomplete & Search Feature
- **Goal**: Rebuild the stop picker autocomplete modal and the Home search input interface using tokens and the `useT` hook.
- **Files Created/Modified**:
  - Create: `src/features/stop-picker/StopPickerModal.tsx`
  - Create: `src/features/stop-picker/StopSearchResults.tsx`
  - Create: `src/features/stop-picker/NearbyStopsList.tsx`
  - Create: `src/hooks/useStopAutocomplete.ts`
  - Create: `src/features/search/SearchScreen.tsx`
  - Create: `src/features/search/ModeFilterBar.tsx`
  - Create: `src/features/search/TimePickerModal.tsx`
  - Create: `src/features/search/RecentSearches.tsx`
  - Deprecate: `src/components/SearchCard.tsx`, `src/components/StopSearchModal.tsx`
- **Done-Check**:
  - Commuter can search `"Dukuh Atas"` and view grouped mode badges (TJ, MRT, KRL).
  - Stop swap (`⇄`) toggles origin and destination smoothly.
  - `pnpm build` passes cleanly.

---

### Slice 3: Connection Results (Connection List & Filter Sheet)
- **Goal**: Implement the connection results list showing Pareto-ranked transit itineraries with departure/arrival times, durations, mode progression badges, and fares.
- **Files Created/Modified**:
  - Create: `src/features/results/ResultsScreen.tsx`
  - Create: `src/features/results/ConnectionCard.tsx`
  - Create: `src/features/results/RouteLegPreview.tsx`
  - Create: `src/features/results/ConnectionFilterSheet.tsx`
  - Create: `src/hooks/useTransitSearch.ts`
- **Done-Check**:
  - Candidate itineraries render with high-contrast tabular numerals (`07:15 ➔ 07:48`).
  - Integrated JakLingko fares and live delays display with semantic tokens.
  - `pnpm build` passes with 0 errors.

---

### Slice 4: Journey Detail Screen & Stepper Rail
- **Goal**: Build the turn-by-turn vertical stepper timeline displaying nodes, platforms, walk steps, contactless tap-in guidance, and collapsible intermediate stops.
- **Files Created/Modified**:
  - Create: `src/features/journey/JourneyDetailScreen.tsx`
  - Create: `src/features/journey/JourneyHeader.tsx`
  - Create: `src/features/journey/TransferCard.tsx`
  - Create: `src/features/journey/IntermediateStops.tsx`
  - Deprecate: `src/components/ItineraryDrawer.tsx`
- **Done-Check**:
  - Stepper displays solid transit line badges (`[TJ 1]`, `[M1 MRT]`).
  - Intermediate stops accordion expands and collapses cleanly without layout shifts.
  - Transfer card provides explicit tap-in instructions.
  - `pnpm build` completes cleanly.

---

### Slice 5: Live Radar Departure Board & Telemetry
- **Goal**: Replace the map-based radar sheet with a high-contrast station departure board (*Abfahrtstafel*) and honest traffic bottleneck diagnostics.
- **Files Created/Modified**:
  - Create: `src/features/radar/LiveRadarScreen.tsx`
  - Create: `src/features/radar/DepartureBoard.tsx`
  - Create: `src/features/radar/TelemetryCard.tsx`
  - Create: `src/hooks/useLiveRadar.ts`
  - Deprecate: `src/components/LiveRadarSheet.tsx`
- **Done-Check**:
  - Departure board displays real-time tabular countdowns (`3 mnt lagi`).
  - Delayed vehicles display honest bottleneck diagnostic cards.
  - `pnpm build` passes cleanly.

---

### Slice 6: App Shell, Top Navigation & Bilingual Switching
- **Goal**: Integrate all feature screens into the primary application shell (`App.tsx`), implement view state transitions, persistent bilingual toggle (`ID` / `EN`), and offline status indicator.
- **Files Created/Modified**:
  - Modify: `src/App.tsx`
  - Create: `src/components/AppHeader.tsx`
  - Create: `src/components/OfflineBanner.tsx`
  - Deprecate: `src/components/HeaderBar.tsx`
- **Done-Check**:
  - Seamless navigation across Home → Results → Journey Detail → Live Radar.
  - Toggling `ID | EN` immediately updates every visible text string across all screens.
  - `pnpm build` passes cleanly.

---

### Slice 7: Visual Verification, Responsive Audit & Design Skill Gate
- **Goal**: Run automated visual and layout inspection across mobile (360px, 390px), tablet (768px), and desktop (1440px) using the design skill's inspection tooling.
- **Execution Command**:
  ```bash
  node C:\Users\Ricky\.claude-work\skills\design-taste-frontend\scripts\inspect.mjs http://localhost:5173 --app --out .taste-skill/after
  ```
- **Audit Checklist**:
  - [x] Zero text below 12px.
  - [x] Zero gradients, glows, or glassmorphism.
  - [x] Zero resting card drop-shadows.
  - [x] All interactive touch targets ≥ 48×48px.
  - [x] High-contrast outdoor readability verified in both Light and Dark modes.
- **Done-Check**:
  - Inspector confirms compliance with house rules; no flagged contrast or touch target violations.
  - `pnpm build` passes with 0 warnings.

---

### Slice 8: Logic Audit Fixes Integration
- **Goal**: Incorporate the defect fixes identified in `wayfinder/ux-recovery/tickets/02-logic-audit.md` once that ticket is closed.
- **Target Areas**:
  - Correct RAPTOR transfer penalty calculations in `src/lib/router/raptor.ts`.
  - Fix fare capping logic in `src/lib/fare/fare-engine.ts`.
  - Handle edge cases: same origin/destination validation, orphan stops handling, stale vehicle MQTT telemetry fallback.
- **Done-Check**:
  - All test trips in `scripts/audit-trips.ts` produce verified itineraries, durations, and fares matching real-world published schedules.
  - `pnpm build` passes.

---

## Engine State Contract

> Added as part of Priority 3 resolution from Logic Audit Ticket #02. Documenting the additive state fields exposed by `useTransitStore` for UI consumption.

### Store State Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `routingStatus` | `'idle' \| 'computing' \| 'success' \| 'no-route' \| 'same-place' \| 'error'` | Explicit lifecycle status of route calculation. |
| `answerKind` | `'direct' \| 'relaxed' \| 'closest-approach' \| 'walk-only' \| 'same-place' \| null` | Graceful-degradation ladder level result indicating how the route was resolved. |
| `isComputingRoute` | `boolean` | Retained for backwards compatibility (`true` while calculation is in progress). |
| `error` | `string \| null` | Set to the specific error message when `routingStatus === 'error'`, otherwise `null`. |
| `itineraries` | `Itinerary[]` | Array of Pareto-optimal itineraries. Guaranteed empty (`[]`) only when `routingStatus` is `'error'` or `'same-place'`. Never empty on routing failure due to graceful ladder. |
| `selectedItinerary` | `Itinerary \| null` | The currently focused itinerary for detail view, or `null` if unselected. |

### Graceful Degradation Ladder (`answerKind`)

The journey planner implements an automatic ladder so users always receive a helpful answer, never a dead-end "no route":
1. `'direct'`: Standard transit search within 1.5 km access/egress walk radius, <= 3 transfers.
2. `'relaxed'`: Expanded walk radius (3 km -> 5 km) and transfers (up to 5). Displayed with a clear "Rute dengan jalan kaki lebih jauh" / "Route with longer walk" banner.
3. `'closest-approach'`: Disconnected transit components. Returns best partial transit route to closest reachable stop, plus explicit uncovered distance/time, ride-hailing suggestion, and Google Maps deep link (`https://www.google.com/maps/dir/?api=1&origin=...&destination=...`).
4. `'walk-only'`: Origin and destination are within ~1.5 km of each other with walking time and distance.
5. `'same-place'`: Origin equals destination (< 25 m or same stop), showing "Anda sudah di tujuan" / "Already at destination".
6. Engine/data errors: Alert state with retry button. Mock itineraries remain permanently deleted.
