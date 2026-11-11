---
id: 8
title: Mode choice and travel options
labels: [wayfinder:grilling]
mode: HITL
status: closed
assignee: claude (delegated by owner)
blocked_by: [1]
blocks: [11, 12]
map: ../map.md
---

# #8 Mode choice and travel options

## Question

Which modes can the traveller choose, which other options exist, and what happens when the choice gives no good route?

## Starting position (charting hypothesis, not a decision)

- **Mode chips, multi-select, all on by default:** BRT (koridor), Bus non-BRT (feeder, Transjabodetabek), Mikrotrans, KRL, MRT, LRT. Any combination, for example BRT + KRL.
- **A hard filter inside the search**, not a filter on the results afterwards.
- **Never silently ignore the choice.** If the chosen modes give nothing, or something much worse, show what exists with the chosen modes (or the closest approach) and one clearly labelled suggestion with other modes: "Lebih cepat 25 mnt dengan KRL".
- **Options sheet** (DB Navigator "Optionen"): maximum transfers (langsung saja / 1 / 2 / bebas), walking (sedikit / normal / jauh), transfer time (normal / longgar), avoid premium buses. Remembered between visits.

## Open points to grill

- Is "Bus non-BRT" one group or split (feeder, Transjabodetabek, premium)?
- Should a preference be soft (prefer rail) as well as hard (only rail)?
- Where the chips live: home screen, results screen, or both.

## Resolved when

Mode groups, options, defaults and the fallback rule are decided, with the Bahasa Indonesia wording.

## Resolution (decided by Claude under the owner's delegation, 2026-11-11)

**Mode groups.** Six multi-select chips, all on by default, any combination allowed. The group comes from the line (GTFS `route_desc`), never from the stop:

| Chip | Lines |
|---|---|
| BRT | Transjakarta corridors (`BRT`) |
| Bus | all other Transjakarta buses: Angkutan Umum Integrasi, Rusun, Transjabodetabek, Royaltrans, Bus Wisata |
| Mikrotrans | Mikrotrans |
| KRL | KRL Commuterline |
| MRT | MRT Jakarta |
| LRT | LRT Jakarta, LRT Jabodebek |

Walking is always allowed. A "Semua" chip resets to all.

**Strict filter.** A line whose group is off is not scanned by the search. No filtering of results afterwards.

**Never ignore the choice, always answer.** The search runs twice: with the chosen modes, and unrestricted.

- Chosen modes give options: show them. If the unrestricted best is faster by at least 15 minutes or 25 %, add one suggestion row under the list: "Lebih cepat N mnt dengan KRL". Tapping it adds that mode and searches again.
- Chosen modes give nothing: banner "Tidak ada rute dengan moda pilihan Anda", then the unrestricted options under the heading "Dengan moda lain".

**Travel options** (sheet "Opsi perjalanan", remembered on the device):

- Transit maksimal: langsung saja / 1 / 2 / bebas (default bebas, which means up to 3).
- Jalan kaki: sedikit / normal / jauh (default normal; the metres are set in the cost-model ticket).
- Waktu transit: normal / longgar (default normal; DB Navigator's transfer-time option).
- Bus premium: on by default, premium legs always show their price; the switch excludes premium fare classes.

**Where.** Chips on the search screen and again at the top of the results, where a change searches again in place.

**Why.** It is DB Navigator's transport-mode selection and options, verified in the DB Navigator ticket, reduced to what a headway city needs.

**Trade-offs.** No soft preference such as "prefer rail": chips are hard filters and the sort buttons cover preference, which keeps the model simple but means "rail if reasonable" needs two taps. One "Bus" chip hides the difference between a Rp 3.500 feeder and a premium bus; the price badge and the premium switch carry that instead. "Tiba sebelum" is not in this version.
