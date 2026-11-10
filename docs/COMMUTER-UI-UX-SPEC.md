# Commuter Journey Planner UI/UX Specification (Apple Fluid Design System)

> Visual design system, interaction patterns, and mobile prototype specifications for **TJ-Navigator**, built following Apple Design principles (WWDC fluid interfaces, translucency, springs, and direct manipulation).

---

## 1. Visual Prototype Assets (FigCraft)

The prototype screens are authored in **FigCraft** and exported to the repository:
- **FigCraft File**: [design/tj-navigator.figcraft](file:///c:/Users/Ricky/Documents/tj-navigator/design/tj-navigator.figcraft)
- **Screen 1 (Search & Live Radar)**: [design/screen-01-home.png](file:///c:/Users/Ricky/Documents/tj-navigator/design/screen-01-home.png)
- **Screen 2 (Pareto Itineraries & Map Canvas)**: [design/screen-02-results.png](file:///c:/Users/Ricky/Documents/tj-navigator/design/screen-02-results.png)
- **Screen 3 (Apple Fluid Live Radar & Recounted Traffic ETA)**: [design/screen-03-apple-radar.png](file:///c:/Users/Ricky/Documents/tj-navigator/design/screen-03-apple-radar.png)

---

## 2. Apple Design Foundations Translated to Web

Following the `/apple-design` skill:

### 2.1 Physics & Springs
- **Drawer / Sheet Drag**: Critically damped spring (`damping: 1.0`, `response: 0.35s`).
- **Momentum Flick**: Under-damped spring with slight bounce (`damping: ~0.8`) using exponential decay projection (`project(v) = (v / 1000) * d / (1 - d)` with $d \approx 0.998$).
- **Direct Manipulation**: 1:1 pointer tracking with Pointer Events and `setPointerCapture`.
- **Interruptibility**: Animations start from the presentation/current transform value, never locking out user input.

### 2.2 Materials, Depth, & Translucency
- **Floating Sheets**: Translucent dark material (`background: rgba(28, 28, 30, 0.85)` with `backdrop-filter: blur(25px) saturate(180%)`).
- **Light Edge Catch**: Hairline border `1px solid rgba(255, 255, 255, 0.15)` on sheet tops and cards representing physical light catching the edge of the glass.
- **Corner Radii**: Generous Apple-style squircle radii (`32px` on bottom sheets, `16px` on inner cards, `12px` on chips).

### 2.3 Optical Typography
- **Headings**: Negative tracking (`letterSpacing: -0.02em` to `-0.03em`), tight leading (`1.05`–`1.15`).
- **Data / Metrics**: Monospace and numeric tabular figures for countdowns and fares.

---

## 3. Screen 3: Apple Fluid Live Radar & Recounted ETA

### 3.1 The "Why the Bus is Delayed" Solution
When the official API claims *"Arrives in 3 mins"*, commuters are often misled by traffic jams. Screen 3 implements our **Recounted Traffic-Aware ETA Engine**:
1. **Dynamic Island / Top Bar**:
   - `HALTE TOSARI (CORRIDOR 1)` with glass circular back button (`‹`) and info button.
2. **Interactive Map Canvas**:
   - Glowing blue corridor polyline track (`#007AFF`).
   - Pulsing bus indicator puck with directional chevron and tag: `🚌 TJ-204 · 0 km/h (Stopped)`.
   - Green commuter pin at `📍 Halte Tosari (You)`.
3. **Floating Glass Sheet**:
   - Route badge: `CORRIDOR 1`.
   - Traffic Alert Pill: `⚠️ TRAFFIC BOTTLENECK DETECTED`.
   - **Honest Recounted Countdown**:
     - Large display: **`8–11 MIN`**
     - Muted discrepancy note: `(Official API claimed "3 min")`
   - **Diagnostic Reasoning Card**:
     - *"Bus TJ-204 is stationary at Kuningan West junction (0 km/h for 85s). Remaining 1.4 km has 2 halte stops + 1 red light."*
   - **Milestone Progress Bar**:
     - `✓ Mampang` ➔ `🚌 Kuningan (0 km/h)` ➔ `📍 Tosari (You)`.
   - **Apple Spring Button**: `Track Bus on Live Map`.
