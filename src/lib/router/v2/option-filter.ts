/** The filter chain: from all candidates to the few options worth showing. docs/ROUTING-V2-SPEC.md, section 4. */
import type { PlanOption, RideLeg } from './option';

export const MAX_OPTIONS = 5;
/** Two options that share this much of their riding on the same lines are the same option to a traveller. */
const SIMILARITY_KEEP_ONE = 0.85;
/** An option costlier than `best × ratio + slack` is not worth showing (OpenTripPlanner's default limit). */
const COST_LIMIT_RATIO = 1.5;
const COST_LIMIT_SLACK_SEC = 15 * 60;
/** Differences smaller than these do not count when deciding that one option beats another on everything. */
const TIME_TOLERANCE_SEC = 60;
const WALK_TOLERANCE_M = 50;
const LEAST_WALKING_MIN_GAIN_M = 100;
/** An option with this much more walking than another must be at least this much faster to stay. */
const EXCESS_WALK_M = 800;
const EXCESS_WALK_TIME_GAIN_SEC = 5 * 60;

export const Badge = {
  FASTEST: 'fastest',
  FEWEST_TRANSFERS: 'fewest_transfers',
  CHEAPEST: 'cheapest',
  LEAST_WALKING: 'least_walking'
} as const;

const ridesOf = (o: PlanOption) => o.legs.filter((l): l is RideLeg => l.kind === 'ride');

/** Share of the longer option's riding distance that both options cover on a common line. */
export function similarity(a: PlanOption, b: PlanOption): number {
  const longest = Math.max(a.rideMeters, b.rideMeters);
  if (longest === 0) return 1;
  const used = new Set<RideLeg>();
  let shared = 0;
  for (const ra of ridesOf(a)) {
    const match = ridesOf(b).find(rb => !used.has(rb) && rb.lines.some(line => ra.lines.includes(line)));
    if (!match) continue;
    used.add(match);
    shared += Math.min(ra.meters, match.meters);
  }
  return shared / longest;
}

/** True when `a` is at least as good as `b` on time, transfers, walking and fare, and clearly better on one. */
function dominates(a: PlanOption, b: PlanOption): boolean {
  const time = a.typicalSec - b.typicalSec;
  const walk = a.walkMeters - b.walkMeters;
  const noWorse = time <= TIME_TOLERANCE_SEC && a.transfers <= b.transfers && walk <= WALK_TOLERANCE_M && a.fareIdr <= b.fareIdr;
  const better = time < -TIME_TOLERANCE_SEC || a.transfers < b.transfers || walk < -WALK_TOLERANCE_M || a.fareIdr < b.fareIdr;
  return noWorse && better;
}

/**
 * True when `a` makes the traveller walk far more than `b` without being meaningfully faster.
 * Saving a change or a few thousand rupiah is not worth a twenty-minute walk to most people.
 */
function walksMuchMoreForNothing(a: PlanOption, b: PlanOption): boolean {
  return a.walkMeters - b.walkMeters >= EXCESS_WALK_M && b.typicalSec <= a.typicalSec + EXCESS_WALK_TIME_GAIN_SEC;
}

export function filterOptions(candidates: PlanOption[]): PlanOption[] {
  const bySignature = new Map<string, PlanOption>();
  for (const c of candidates) {
    const known = bySignature.get(c.signature);
    if (!known || c.cost < known.cost) bySignature.set(c.signature, c);
  }
  const sorted = [...bySignature.values()].sort((a, b) => a.cost - b.cost);
  if (sorted.length === 0) return [];

  const limit = sorted[0].cost * COST_LIMIT_RATIO + COST_LIMIT_SLACK_SEC;
  const distinct: PlanOption[] = [];
  for (const c of sorted) {
    if (c.cost > limit) break;
    if (!distinct.some(kept => similarity(kept, c) >= SIMILARITY_KEEP_ONE)) distinct.push(c);
  }
  const sensible = distinct.filter(c => !distinct.some(other => other !== c && walksMuchMoreForNothing(c, other)));
  const kept = sensible.filter(c => !sensible.some(other => other !== c && dominates(other, c))).slice(0, MAX_OPTIONS);
  assignBadges(kept);
  return kept;
}

function assignBadges(options: PlanOption[]): void {
  for (const o of options) o.badges = [];
  if (options.length < 2) return;
  const lowest = (value: (o: PlanOption) => number) => options.reduce((best, o) => (value(o) < value(best) ? o : best));
  const spread = (value: (o: PlanOption) => number) =>
    Math.max(...options.map(value)) - Math.min(...options.map(value));

  lowest(o => o.typicalSec).badges.push(Badge.FASTEST);
  if (spread(o => o.transfers) > 0) lowest(o => o.transfers).badges.push(Badge.FEWEST_TRANSFERS);
  if (spread(o => o.fareIdr) > 0) lowest(o => o.fareIdr).badges.push(Badge.CHEAPEST);
  if (spread(o => o.walkMeters) >= LEAST_WALKING_MIN_GAIN_M) lowest(o => o.walkMeters).badges.push(Badge.LEAST_WALKING);
}
