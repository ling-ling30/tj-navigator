---
id: 6
title: What one option is, and how time is modelled
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
blocked_by: [1, 4]
blocks: [7, 10, 11]
map: ../map.md
---

# #6 What one option is, and how time is modelled

## Question

DB Navigator lists timetabled departures: each row is one train at one time. Jakarta buses run on headways. What is one "option" for us, and how do we model riding, waiting and service hours so durations are believable?

## Starting position (charting hypothesis, not a decision)

- **One option = one path** (the ordered legs), not one departure. Its duration is shown as a range: from "the bus comes right away" to "typical wait", for example 52–61 mnt.
- **Riding time** per hop comes from GTFS `stop_times` for that stop pattern, not from a fixed number of seconds per stop.
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
