/** The filter chain: from all candidates to the options worth showing. docs/ROUTING-V2-SPEC.md, section 4. */
import type { PlanOption, RideLeg } from './option';

/** The traveller asked for a real choice: show this many whenever the network offers them. */
export const MIN_OPTIONS = 5;
export const MAX_OPTIONS = 6;
/** An option costlier than `best × ratio + slack` is not worth showing. */
const COST_LIMIT_RATIO = 2;
const COST_LIMIT_SLACK_SEC = 30 * 60;
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

/**
 * Two options look the same to a traveller when they ride the same lines in the same order,
 * whichever stops they change at. Only the better one is kept.
 */
export function sameLines(a: PlanOption, b: PlanOption): boolean {
  const ra = ridesOf(a);
  const rb = ridesOf(b);
  return ra.length === rb.length && ra.every((leg, i) => leg.lines.some(line => rb[i].lines.includes(line)));
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
    if (!distinct.some(kept => sameLines(kept, c))) distinct.push(c);
  }
  const kept = distinct.filter(c => !distinct.some(other => other !== c && walksMuchMoreForNothing(c, other)));

  // Options that another one beats on everything are clutter, but only once the traveller has enough to choose from
  for (let i = kept.length - 1; i >= 0 && kept.length > MIN_OPTIONS; i--) {
    if (kept.some(other => other !== kept[i] && dominates(other, kept[i]))) kept.splice(i, 1);
  }
  const shown = kept.slice(0, MAX_OPTIONS);
  assignBadges(shown);
  return shown;
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
