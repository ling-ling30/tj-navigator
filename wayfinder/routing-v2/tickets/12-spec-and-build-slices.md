---
id: 12
title: Spec, ADR and build slices
labels: [wayfinder:task]
mode: AFK
status: open
assignee:
blocked_by: [7, 8, 9, 10, 11]
blocks: []
map: ../map.md
---

# #12 Spec, ADR and build slices

## Question

Nothing left to decide: write the decisions down as one spec and cut the build into ordered, independently testable slices.

## Resolved when

`docs/ROUTING-V2-SPEC.md` and `docs/adr/0006-routing-v2.md` exist; the slices are listed in order (data pipeline, engine, fare, mode options, results list), each with its test against the golden commutes; `GLOSSARY.md` is current.
