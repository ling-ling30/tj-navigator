# Commuter Journey Planner UI/UX Specification

> Visual design system, interaction patterns, and mobile prototype specifications for **TJ-Navigator**.

---

## 1. Visual Prototype Assets (FigCraft)

The core commuter flow has been designed in **FigCraft** and exported directly to the repository:
- **FigCraft File**: [design/tj-navigator.figcraft](file:///c:/Users/Ricky/Documents/tj-navigator/design/tj-navigator.figcraft)
- **Screen 1 (Search & Live Radar)**: [design/screen-01-home.png](file:///c:/Users/Ricky/Documents/tj-navigator/design/screen-01-home.png)
- **Screen 2 (Pareto Itineraries & Map Canvas)**: [design/screen-02-results.png](file:///c:/Users/Ricky/Documents/tj-navigator/design/screen-02-results.png)

---

## 2. Design System & Tokens

### 2.1 Color Palette

| Token | Hex | Usage |
| :--- | :--- | :--- |
| **Canvas Background** | `#0D1117` | Deep obsidian dark-mode background |
| **Surface Card** | `#161B22` | Elevation tier 1 container cards |
| **Surface Elevated** | `#21262D` | Chip buttons, inner list items |
| **Border / Stroke** | `#30363D` | Structural hairline dividers |
| **Transjakarta BRT** | `#0066FF` | Corridor 1–14 badges, bus line polylines |
| **KRL Commuterline** | `#00A859` | Commuter rail routes, station pins |
| **MRT Jakarta** | `#EE3124` | North-South Line red brand color |
| **LRT Jabodebek / Jkt** | `#F58220` | Light rail routes, interchange pins |
| **Mikrotrans / Angkot** | `#00BCD4` | Feeder vans and neighbourhood lines |
| **Live Telemetry Green** | `#00E676` | Pulsing GPS indicator, live countdowns |
| **Amber Warning / Stale** | `#E3B341` | Re-tap gate alerts, 45s–90s stale telemetry |

---

## 3. Screen 1: Mobile Commuter Home & Radar

### Components
1. **Header**:
   - Monospace/Grotesque masthead: `TJ-NAVIGATOR`
   - Status Chip: `● ALL MODES LIVE` (Green pulsing indicator)
2. **Origin & Destination Search Card**:
   - Origin field: Green circular anchor with station code (`krl:TET` - *Stasiun Tebet*)
   - Destination field: Red destination anchor (`tj:1-14` - *Grand Indonesia / Halte Tosari*)
   - Swap button for quick return trip calculation
   - Filter chips: `🕒 Depart Now (22:30)` · `⚡ All Modes (4)`
3. **Live Bus Radar Widget**:
   - Direct MQTT subscriber showing nearest approaching armada
   - Displays: Corridor pill (`CORRIDOR 1 · BLOK M ➔ KOTA`), Live ETA (`~3 MIN`), remaining stops (`2 stops away`), and last-known landmark (`Near Halte Polda Metro Jaya`).
4. **Nearby Departures Board**:
   - Real-time departure board for stations within 300m walking radius.
5. **Fixed Bottom Navigation**:
   - `Route` (active) · `Radar` · `Map` · `Saved`

---

## 4. Screen 2: Pareto Itinerary Comparison Drawer

### 4.1 Layout Structure
- **Top 25%**: Interactive Map Peek Canvas with vector transit paths and station pins.
- **Bottom 75%**: Draggable bottom sheet comparing Pareto-optimal route options.

### 4.2 Itinerary Cards
Each card surfaces key commuter metrics at a glance:
- **Card 1 (Fastest / Recommended)**:
  - `32 MIN` · `Rp 6.500` · `22:35 ➔ 23:07`
  - Flow: `[KRL] St. Tebet ➔ 🚶 [Skywalk 4m] ➔ [MRT] Tosari`
  - Badges: `⚡ FASTEST` · `☂️ COVERED SKYWALK` · `♿ STEP-FREE`
- **Card 2 (Direct / Fewest Transfers)**:
  - `45 MIN` · `Rp 3.500` · `22:38 ➔ 23:23`
  - Flow: `[TJ COR 4C] Tebet Eco Park ➔ Halte Tosari (Direct)`
  - Badges: `0 TRANSFERS` · `🟢 LIVE BUS IN ~3M (POLDA METRO)`
- **Card 3 (Lowest Fare / Inside Station Transfer)**:
  - `41 MIN` · `Rp 3.500` · `22:36 ➔ 23:17`
  - Flow: `[TJ COR 9] ➔ 🔄 [CSW Hub] ➔ [TJ COR 1] Tosari`
  - Badges: `🔄 INSIDE STATION TRANSFER (NO RE-TAP)` · `RP 3.500 FLAT`

---

## 5. Screen 3: Step-by-Step Active Navigation Flow

When an itinerary card is selected, the sheet expands to full height with a step-by-step timeline:
1. **Departure Leg**: Walking route with turn-by-turn distance and compass heading.
2. **Boarding Instruction**:
   - Platform / Bay number (e.g. *"Bay 2 - Towards Kota"*).
   - Live bus countdown with countdown timer.
3. **En-Route Transit**:
   - Collapsible list of intermediate stops passed (e.g. *"Passing 6 stops: Cawang, Pancoran, Kuningan..."*).
4. **Transfer Guidance**:
   - Transfer badge (*"Inside Station Transfer"* vs *"Exit Gate & Re-tap"*).
   - Skywalk walking directions (*"Take escalator up 2 levels to Corridor 13 platform"*).
5. **Arrival Leg**: Alighting announcement and nearest exit guide.
