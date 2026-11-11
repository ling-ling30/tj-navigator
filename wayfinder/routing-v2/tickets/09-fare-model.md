---
id: 9
title: Fare model
labels: [wayfinder:grilling]
mode: HITL
status: closed
assignee: claude (delegated by owner)
blocked_by: [3]
blocks: [12]
map: ../map.md
---

# #9 Fare model

## Question

How is the price of an option computed, so that the price shown and the "cheapest" option are right?

## Starting position (charting hypothesis, not a decision)

- Each line gets its fare class from GTFS `fare_rules` (regular Rp 3.500, premium classes, free routes), not from a guess per mode.
- Transfer and integrated-tariff rules are applied only as confirmed by the fare research; anything unconfirmed is shown as an estimate ("perkiraan tarif").
- Suspected defect today: two and three consecutive Transjakarta legs are charged Rp 7.000 and Rp 10.500.

## Resolved when

The fare rules to implement are decided, each traced to a source in the fare research ticket.

## Resolution (decided by Claude under the owner's delegation, 2026-11-11)

Evidence: [Official fare rules for every operator](03-official-fare-rules.md). Confidence note: the rule values match the raw GTFS fare table and are consistent across the research, but most source links there are operator home pages, and the regulation numbers were not opened by the decider. The regulation names are therefore not quoted in the app.

**Rules to implement**

| Service | Rule | Confidence |
|---|---|---|
| Transjakarta regular (GTFS `FP`, `FP2`), incl. Transjabodetabek regular | Rp 3.500 per tap-in; Rp 2.000 for a BRT tap-in 05:00–07:00 | high |
| Change inside a paid area (same halte, or a transfer flagged paid) | free | high |
| Mikrotrans, Bus Wisata (`GR`) | Rp 0 | high |
| Royaltrans (`PP`) | Rp 20.000; S14 (`PP3`) Rp 35.000; SH2 Rp 15.000 | high (from the feed) |
| KRL | Rp 3.000 for the first 25 km, then Rp 1.000 per 10 km; changes inside the rail network free | high |
| MRT | station-pair table, Rp 3.000 to Rp 14.000 | high |
| LRT Jakarta | flat Rp 5.000 | high |
| LRT Jabodebek | Rp 5.000 first km, then Rp 700 per km; cap Rp 20.000 peak, Rp 10.000 off-peak | medium |
| JakLingko integrated tariff | trips that combine Transjakarta, MRT, LRT Jakarta within 3 hours: Rp 2.500 + Rp 250 per km, at most Rp 10.000; the lower of this and the separate fares is shown. KRL and LRT Jabodebek are outside it | medium |

**How.** Each line carries its fare class from GTFS `fare_rules` (variants such as S14R inherit from S14). LRT Jakarta and LRT Jabodebek become separate fare classes. The fare function receives the departure time. A change at the same stop between two BRT lines counts as inside the paid area.

**Disputed rule, isolated behind one named switch.** Leaving a halte to the street and tapping in again on another Transjakarta service: the research says a new Rp 3.500; the feed's `FP` says unlimited transfers within 3 hours. Default: charge again (the higher, safer estimate). The owner's own commute (S61 then corridor 9 at Kota Bambu) can settle it from experience.

**Display.** Every price is labelled "perkiraan". Premium legs show their price on the leg. "Termurah" is the lowest estimated fare among the options shown.

**Trade-off.** An estimate that may be Rp 3.500 too high on street transfers, in exchange for never promising a price the gate will not honour.

**Also fix.** The code and `docs/FARE-ENGINE-SPEC.md` cite a regulation the research could not find ("Pergub DKI 133/2021"); remove the citation rather than replace it with another unverified one.
