# Multi-Modal Fare Calculation & JakLingko Tariff Specification

> Technical and mathematical specification for the TJ-Navigator fare calculation engine across Transjakarta, KRL, MRT, LRT, and JakLingko integrated tariffs.

---

## 1. Operator Fare Formulas

### 1.1 Transjakarta (BRT, Feeder, Mikrotrans)

- **Standard BRT & Feeder**:
  - Flat fare: **Rp 3.500** per journey.
  - Early-morning discount (05:00–07:00 WIB): **Rp 2.000** on BRT corridors.
  - Inside-station transfer (`isPaidAreaTransfer: true`): **Rp 0** (e.g. transferring between Corridor 1 and 13 at CSW, or between Corridor 9 and 1 at Semanggi).
- **Mikrotrans (JakLingko Angkot)**:
  - Tariff: **Rp 0** (free service, mandatory card tap for ridership tracking).

### 1.2 KRL Commuterline (KAI Commuter)

- **Distance-Based Progressive Formula**:
  $$\text{Fare}_{\text{KRL}}(d) = 3000 + \max\left(0, \left\lceil \frac{d - 25}{10} \right\rceil\right) \times 1000 \quad [\text{IDR}]$$
  - First $25\text{ km}$: **Rp 3.000**
  - Every additional $10\text{ km}$ (or fraction): **+ Rp 1.000**
- **Interchange**: Free platform transfers inside the rail network (e.g. at Manggarai, Duri, Tanah Abang, Jatinegara). Single tap-in at origin, single tap-out at destination.

### 1.3 MRT Jakarta

- **Station-to-Station Distance Matrix**:
  - Minimum fare (1 station): **Rp 3.000**
  - Incremental fare: ~**Rp 1.000** per station passed.
  - Maximum fare (Lebak Bulus Grab $\leftrightarrow$ Bundaran HI Bank DKI, 13 stations): **Rp 14.000**.

### 1.4 LRT (Jabodebek & Jakarta)

- **LRT Jakarta (Velodrome $\leftrightarrow$ Pegangsaan Dua)**:
  - Flat fare: **Rp 5.000**.
- **LRT Jabodebek (Dukuh Atas $\leftrightarrow$ Harjamukti / Jati Mulya)**:
  - Base: **Rp 3.000** (first $1\text{ km}$) $+ \text{Rp 700 / km}$.
  - Subsidized caps:
    - Peak hours (06:00–09:00, 16:00–19:00 WIB): Max **Rp 20.000**.
    - Off-peak & weekends: Max **Rp 10.000**.

---

## 2. JakLingko Integrated Tariff (Tarif Integrasi 3 Jam)

When a commuter uses a JakLingko-enabled card or app for a multi-modal trip combining **Transjakarta + MRT + LRT**:

1. **Eligibility Conditions**:
   - The transfer between modes must occur within **45 minutes** of tapping out of the previous mode.
   - The total multi-modal journey must conclude (final tap-out) within **180 minutes (3 hours)**.
   - Maximum of **2 transfers** (up to 3 consecutive transit legs).
2. **Formula**:
   $$\text{JakLingkoFare}(d_{\text{total}}) = \min\left(10000, \; 2500 + \lceil d_{\text{total}} \rceil \times 250\right) \quad [\text{IDR}]$$
   - Base boarding fee: **Rp 2.500**
   - Distance rate: **Rp 250 per kilometer**
   - Maximum ceiling cap: **Rp 10.000**
3. **KRL Separation**:
   - KRL Commuterline is operated by PT KAI (Central Government) and is currently **not** part of the DKI Provincial JakLingko Rp 10.000 integrated tariff.
   - For itineraries combining KRL and JakLingko modes:
     $$\text{Total Fare} = \text{Fare}_{\text{KRL}} + \text{JakLingkoFare}(\text{TJ/MRT/LRT})$$

---

## 3. Algorithm Implementation

```typescript
export interface LegFareInput {
  mode: 'BRT' | 'NON_BRT' | 'MIKROTRANS' | 'COMMUTER_RAIL' | 'MRT' | 'LRT';
  originId: string;
  destinationId: string;
  distanceKm: number;
  departureTime: string; // HH:mm
  isPaidAreaTransferFromPrev: boolean;
}

export interface ComputedFare {
  totalStandardFare: number;
  totalIntegratedFare: number;
  isJakLingkoEligible: boolean;
  breakdown: Array<{
    legIndex: number;
    mode: string;
    standardFare: number;
    integratedFare: number;
    notes?: string;
  }>;
}
```

- When evaluating an itinerary, the engine calculates both:
  1. **Standard Separate Fares**: Sum of individual operator cash/card fares (useful for users tapping standard bank e-money cards like Flazz/Brizzi/e-Money without JakLingko integration).
  2. **JakLingko Integrated Fare**: Showing potential savings (*"Save Rp 4.500 with JakLingko Tariff"*).
