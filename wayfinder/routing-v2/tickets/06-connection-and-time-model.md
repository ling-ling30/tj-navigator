---
id: 6
title: What one option is, and how time is modelled
labels: [wayfinder:grilling]
mode: HITL
status: closed
assignee: claude (delegated by owner)
blocked_by: [1, 4, 13, 14]
blocks: [7, 10, 11]
map: ../map.md
---

# #6 What one option is, and how time is modelled

## Question

DB Navigator lists timetabled departures: each row is one train at one time. Jakarta buses run on headways. What is one "option" for us, and how do we model riding, waiting and service hours so durations are believable?

## Starting position (charting hypothesis, not a decision)

- **One option = one path** (the ordered legs), not one departure. Its duration is shown as a range: from "the bus comes right away" to "typical wait", for example 52–61 mnt.
- **Riding time** per hop = distance along the route ÷ a speed for that kind of service and road (busway, mixed traffic, toll, Mikrotrans, rail), calibrated on real evidence. Not from GTFS `stop_times`: those are a constant-speed template (see the GTFS audit ticket).
- **Waiting** = half the headway of the current time window from `frequencies.txt`, with a cap. No service outside first and last departure.
- **Common lines:** lines that serve the same boarding and alighting stop in the same order are one leg: "Naik 9, 9A atau 9E", with their frequencies combined. This removes fake variety and gives a truer wait.
- **Rail** (KRL, MRT, LRT) uses the same headway model until a real timetable source is adopted; times are labelled as estimates.
- **All stop patterns** of a route are kept, loop routes are handled by position, and invented duplicate routes are removed.

## Open points to grill

- Is a duration range clearer than one number for a commuter?
- Peak versus off-peak riding time if the feed does not vary it.
- "Arrive by" search now or later.

## Resolved when

The model is decided, new terms are in `GLOSSARY.md`, and an ADR is offered if the choice is hard to reverse.

## Decision so far (Claude, 2026-11-11; the ticket stays open until the speed tickets report)

Built as described in the starting position, with these facts added:

- One option is one path; duration is a typical figure with a range (no waiting … a full headway at every boarding).
- Riding time = distance along the GTFS shape ÷ speed of the hop class. 98,6 % of hops are measured along a shape.
- Waiting = half the pooled headway of the current window, capped at 15 minutes; a pattern with no window at that time does not run; headways of 30 minutes or more are flagged as infrequent.
- A chosen stop is a named place: the traveller is at it, and may also walk to stops around it.
- Open: the speed table in `src/lib/router/v2/time-model.ts` is provisional.

## Resolution (decided by Claude under the owner's delegation, 2026-11-11)

The model above stands, and the speed table is now calibrated (km/h, off-peak / peak): busway 22 / 19, street 18 / 13, Mikrotrans 16 / 13, toll 35 / 27, KRL 39 / 35, MRT 31, LRT Jakarta 27, LRT Jabodebek 40. Basis and fit: the speed references ticket.

**Trade-off.** Speeds are averages per kind of service, so a single route can be off by about a quarter, most of all express routes on toll roads. That is why a duration is shown as a typical figure with a range, and why the table sits in one file that live data can refine later.
