---
id: 9
title: Fare model
labels: [wayfinder:grilling]
mode: HITL
status: open
assignee:
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
