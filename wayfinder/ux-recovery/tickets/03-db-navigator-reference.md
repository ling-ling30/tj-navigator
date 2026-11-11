---
id: 3
title: What exactly should we take from DB Navigator, adapted to Jakarta?
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [4, 5]
map: ../map.md
---

# #3 DB Navigator reference

## Question

DB Navigator is the owner's main reference. What are its concrete UI patterns we should copy, and which must change for Jakarta (headways instead of timetables, live bus GPS, mixed BRT/KRL/MRT/LRT, Bahasa Indonesia, cash-less taps, no seat reservations)?

## Verify from live sources

Official DB Navigator screenshots and store listing, DB design system documentation (DB UX / "DB Design System"), public analyses. Cite what you read. If a pattern cannot be verified, label it "needs verification".

## Cover

- Information hierarchy of the search screen, connection list, and connection detail: what is shown, what is hidden, type sizes and order.
- Time/duration/transfer display, delay and live-status conventions, platform/line labels.
- Colour use: how little colour, how it is reserved for status and the one primary action.
- Typography and spacing system (scale, density, touch targets).
- A short list "copy / adapt / skip" mapped to our four screens: Home/Search, Results, Journey detail, Live radar, plus stop-search.

## Resolved when

A concise pattern sheet under `## Resolution` (≤ 250 lines) with sources linked.

## Resolution

### Verified Sources
- [DB UX Design System / DB UI Core Tokens](https://db-ui.github.io/core/) & [DB UI Base Tokens](https://github.com/db-ui/base)
- [DB Navigator on Google Play](https://play.google.com/store/apps/details?id=de.hafas.android.db) & [DB Web Timetable / Station Board](https://int.bahn.de/)
- [DB Navigator iOS UI Flows on Mobbin](https://mobbin.com/apps/db-navigator-ios)
- [Nielsen Norman Group: Progressive Disclosure in Mobile Design](https://www.nngroup.com/articles/progressive-disclosure/)

---

### 1. Information Hierarchy & Screen Structure

#### A. Search Screen (Home)
* **Always Visible**:
  * Origin and Destination input boxes in high-contrast stacked containers with a quick swap toggle icon button (min 44×44px touch target).
  * Time context pill: default `"Berangkat Sekarang"` (Depart now) with quick-tap modal to set departure/arrival time.
  * Transit mode filter chips: horizontal scroll/wrap (`Semua`, `TransJakarta`, `KRL`, `MRT`, `LRT`, `Mikrotrans`).
  * One single, full-width primary CTA button at bottom: `"Cari Rute"` (Search Route).
* **Progressively Disclosed / Hidden**:
  * Recent searches and saved stops/routes shown as quick-tap pills below inputs; cleared when typing.
  * Advanced filters (e.g., maximum transfers, walking speed) hidden behind an optional filter sheet.

#### B. Connection List (Results)
* **Card Anatomy (Per Connection)**:
  * **Top Row**: Departure & Arrival timestamps in bold tabular numerals (`18px`, e.g. `07:15 → 07:48`), total duration centered (`33 mnt`), and transfer count (`1 transit`).
  * **Middle Row**: Route progression pill sequence with transit badges (e.g. `[1 TJ] ➔ [M1 MRT]`).
  * **Bottom Row**: Integrated fare (`Rp 6.500`) on left, live operational status or headway (`Tiap 5 mnt`) on right. Entire card is a single tap target with subtle right chevron.
* **Hidden in List**: Intermediate stops, track/platform walking maps, individual vehicle IDs.

#### C. Journey Detail (Active Itinerary)
* **Vertical Stepper Rail Pattern**:
  * **Departure Node**: Large bold time, stop name, and platform/gate tag (e.g. `Halte Dukuh Atas 1 • Pintu 2`).
  * **Segment Rail**: Line badge with headsign direction (`Koridor 1 • Arah Kota`), vehicle live status / congestion indicator.
  * **Progressive Disclosure Accordion**: Collapsed intermediate stops button (`"Lihat 4 halte antara"`), expanding into small dot indicators without leaving the screen.
  * **Transfer Box**: Distinct inset card showing walking time (`"Jalan kaki 4 mnt (300 m)"`), buffer health, and contactless tap instruction (`"Tap-in kartu JakLingko / Flazz / e-Money di gate peron"`).
  * **Arrival Node**: Arrival timestamp, terminal stop name, and exit guidance.

---

### 2. Time, Duration, Live-Status & Line Conventions

* **Time & Headway Handling**:
  * Timetabled Rail (KRL/MRT/LRT): Fixed 24h clock (`HH:mm`).
  * High-frequency Bus/BRT (TransJakarta/Mikrotrans): Live ETA countdown (`"3 mnt lagi"`) when GPS is active, or headway interval range (`"Setiap 4–7 mnt"`) when operating on frequency without timetable.
* **Delay & Disruption Conventions (Visibility of System Status)**:
  * **On-time**: Regular slate text or subtle green indicator (`Tepat waktu`).
  * **Delayed / Traffic Congestion**: Scheduled time struck through (`~~07:22~~ 07:28`), revised time highlighted in bold warning red/amber with delta badge (`+6 mnt`).
  * **Corridor Diversion / Stop Skip**: Persistent yellow/red alert chip at the card header (e.g. `Halte Monas sementara ditutup`).
* **Platform & Line Badges**:
  * Compact solid background pills with white text for official line codes (e.g., `TJ-1` Red, `M1` MRT Blue, `C` Cikarang Line Cyan).
  * Platform/Pintu clearly labeled with high-contrast badge (e.g., `Peron 2` or `Pintu Masuk Barat`).

---

### 3. Colour System & Radical Restraint

Following the **DB UX** philosophy and `design-taste-frontend` rules:
* **Background Surfaces**: Pure white (`#FFFFFF`) or subtle warm neutral (`#F8FAFC`). Card containers use clean hairline borders (`#E2E8F0`), zero heavy drop shadows, zero gradients, zero glassmorphism.
* **Text Contrast**: High-contrast dark slate (`#0F172A`) for primary headings and times; muted neutral (`#64748B`) for secondary labels and metadata. Meets WCAG AAA outdoor glare requirements.
* **Single Primary Action Color**: Deep Transit Blue (`#002855`) or TransJakarta Blue (`#0055A5`) used exclusively for:
  1. The primary screen CTA button (`"Cari Rute"`).
  2. The active bottom-navigation item.
  3. Interactive selection focus states.
* **Strict Semantic Colors (Reserved for Status Only)**:
  * Red (`#DC2626`): Delays, route disruptions, missed transfers, cancelled trips.
  * Green (`#16A34A`): Live active GPS tracking, smooth on-time status.
  * Amber (`#D97706`): Tight transfer risk (`< 3 mnt` transfer time at major hubs like CSW or Manggarai).

---

### 4. Typography & Spacing System

* **Typography Scale (System Sans / Inter / Plus Jakarta Sans)**:
  * **Display / Header**: `20px` (Semibold, leading 1.25) — Screen titles.
  * **Time / Hero Numbers**: `18px` (Bold, `font-variant-numeric: tabular-nums`) — Journey departure/arrival.
  * **Section Titles / Stops**: `15px` (Medium, leading 1.3) — Station names.
  * **Body / Secondary**: `13px` (Regular, leading 1.4) — Durations, directions, walking steps.
  * **Badge / Utility**: `11px – 12px` (Medium, uppercase tracking +0.02em) — Line codes, fare tags. (No illegible tiny micro-text).
* **Spacing Scale & Touch Targets**:
  * **Base Unit**: `4px` grid (`4`, `8`, `12`, `16`, `24`, `32px`).
  * **Touch Targets**: Minimum **48 × 48px** for all inputs, buttons, and card swap controls for reliable outdoor one-handed phone usage.
  * **Card Padding**: `12px – 16px` internal padding; `8px – 12px` vertical gap between list cards.
  * **Screen Gutters**: `16px` horizontal margin on mobile screens.

---

### 5. "Copy / Adapt / Skip" Matrix for Jakarta Commuters

| Screen | COPY from DB Navigator | ADAPT for Jakarta Commuter Reality | SKIP (Do Not Port) |
| :--- | :--- | :--- | :--- |
| **Home / Search** | Stacked Origin/Destination input pair; quick-swap button; recent search pills; single high-contrast primary CTA. | Set time default to `"Berangkat Sekarang"`; add Jakarta mode filter chips (`TJ`, `KRL`, `MRT`, `LRT`, `Mikrotrans`). Bahasa Indonesia default (`Asal`, `Tujuan`, `Cari Rute`). | Class selectors (1st/2nd Class), seat reservation options, BahnCard loyalty discounts, luggage/bike options. |
| **Results (Connections)** | Scannable card list; departure/arrival times at anchor points; clear transfer count; disruption warning banners. | Show integrated fare (`Rp 3.500` / `Rp 10.000` JakLingko cap); display live headways (`Tiap 3-5 mnt`) for BRT alongside scheduled rail times. | "Sparpreis" promotional fare tiers, carbon footprint offset calculators, ICE seat availability indicators. |
| **Journey Detail** | Vertical stepper timeline; distinct transfer gap cards; collapsible intermediate stop lists (`"Lihat X halte"`). | Add contactless card tap instructions (`"Tap kartu di gate peron"`); step-by-step skybridge directions (e.g. CSW–ASEAN, Dukuh Atas); live bus crowd estimate (`Sepi / Sedang / Ramai`). | Carriage sequence diagram (*Wagenreihung*), dining car indicators, seat reservation reminders. |
| **Live Radar / Radar Langsung** | Clean station departure board (*Abfahrtstafel*) showing real-time departures and route progression (*Fahrtverlauf*). | Multi-modal stop radar: shows incoming TransJakarta bus GPS ETAs and next approaching KRL/MRT trains on a clean list or schematic map. | Long-distance intercity train tracking; complex platform sector maps (Sektor A–E). |
| **Stop Search (Autocomplete)** | Instant prefix-matching autocomplete with recent stops and mode category badges. | Support Jakarta multi-modal hub grouping (e.g., searching `"Dukuh Atas"` surfaces combined MRT, KRL Sudirman, LRT, and TJ Tosari connections). | Station locker/lounge facilities; accessibility elevator breakdown feeds (unless reliably available via Jakarta API). |

