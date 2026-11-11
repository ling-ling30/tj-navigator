/**
 * The planner: runs the search profiles, keeps the options worth showing, respects the traveller's modes,
 * and always returns an answer. docs/ROUTING-V2-SPEC.md, sections 2, 4 and 5.
 */
import type { NetworkV2 } from '../../../types/network-v2';
import { makeContext, type QueryContext } from './context';
import {
  BALANCED, DEFAULT_TRAVEL_OPTIONS, DIVERSITY_RERUNS, RELAXED_RADII_M, SAME_PLACE_M, SEARCH_PROFILES,
  MAX_SHOWN_LINE_RIDE_WEIGHT, SHOWN_LINE_RIDE_WEIGHT, TRANSFER_BUFFER_SEC, WALK_ONLY_MAX_M, WALKING,
  type CostProfile, type TravelOptions
} from './cost-profiles';
import { haversineMeters, WALK_DETOUR, WALK_SPEED_MPS } from './footpaths';
import { ENDPOINT, LineScanner, MAX_RIDES, type AccessPoint, type RawPath, type ScanParams } from './line-scan';
import { NetworkIndex } from './network-index';
import { buildOption, type PlanOption } from './option';
import { filterOptions, MIN_OPTIONS } from './option-filter';

export interface PlaceInput { lat: number; lon: number; name?: string; stopIndex?: number }

export interface PlanQuery {
  origin: PlaceInput;
  destination: PlaceInput;
  departAt: Date;
  /** Mode groups switched on; null or all six means no restriction. */
  modes?: number[] | null;
  options?: Partial<TravelOptions>;
}

export type AnswerKind = 'direct' | 'relaxed' | 'closest-approach' | 'walk-only' | 'same-place';

export interface ModeSuggestion { modeGroups: number[]; savesSec: number; option: PlanOption }

export interface PlanResult {
  options: PlanOption[];
  answerKind: AnswerKind;
  /** A switched-off mode would be clearly faster. */
  suggestion?: ModeSuggestion;
  /** The chosen modes gave nothing; the options shown ignore the mode choice. */
  modesGaveNothing?: boolean;
}

const ALL_MODE_GROUPS = 6;
const SUGGESTION_MIN_GAIN_SEC = 15 * 60;
const SUGGESTION_MIN_GAIN_RATIO = 0.25;
/** A closest-approach answer must bring the traveller at least this much nearer, or it is not worth riding. */
const CLOSEST_APPROACH_MIN_GAIN = 0.2;

export class Planner {
  readonly ix: NetworkIndex;
  private readonly scanner: LineScanner;
  private readonly unitWeights: Float32Array;

  constructor(net: NetworkV2) {
    this.ix = new NetworkIndex(net);
    this.scanner = new LineScanner(this.ix);
    this.unitWeights = new Float32Array(this.ix.lineCount).fill(1);
  }

  plan(query: PlanQuery): PlanResult {
    const opts: TravelOptions = { ...DEFAULT_TRAVEL_OPTIONS, ...query.options };
    const { origin, destination } = query;
    const straight = haversineMeters(origin.lat, origin.lon, destination.lat, destination.lon);
    if (straight < SAME_PLACE_M) return { options: [], answerKind: 'same-place' };

    const restricted = (query.modes != null && new Set(query.modes).size < ALL_MODE_GROUPS) || !opts.includePremium;
    const chosen = makeContext(this.ix, query.departAt, restricted && query.modes ? new Set(query.modes) : null, opts.includePremium);
    const result = this.ladder(chosen, query, opts, straight, restricted);
    if (!restricted) return result;

    const open = makeContext(this.ix, query.departAt, null, true);
    if (result.options.length === 0 || result.answerKind === 'closest-approach') {
      const fallback = this.ladder(open, query, opts, straight, false);
      return fallback.options.length > 0 ? { ...fallback, modesGaveNothing: true } : result;
    }
    return { ...result, suggestion: this.suggest(open, chosen, query, opts, result.options) };
  }

  /** Normal search, then wider walking, then the closest approach. With restricted modes only the first two. */
  private ladder(ctx: QueryContext, q: PlanQuery, opts: TravelOptions, straight: number, modesOnly: boolean): PlanResult {
    const tolerance = WALKING[opts.walking];
    const walkOnly = straight <= WALK_ONLY_MAX_M ? this.walkOnly(ctx, straight) : null;
    const direct = this.search(ctx, q, opts, tolerance.accessRadiusM, opts.maxTransfers + 1);
    if (direct.length > 0) return { options: walkOnly ? [...direct, walkOnly] : direct, answerKind: 'direct' };
    if (walkOnly) return { options: [walkOnly], answerKind: 'walk-only' };

    for (const radius of RELAXED_RADII_M) {
      if (radius <= tolerance.accessRadiusM) continue;
      const rides = opts.maxTransfers >= DEFAULT_TRAVEL_OPTIONS.maxTransfers ? MAX_RIDES : opts.maxTransfers + 1;
      const relaxed = this.search(ctx, q, opts, radius, rides);
      if (relaxed.length > 0) return { options: relaxed, answerKind: 'relaxed' };
    }
    if (modesOnly) return { options: [], answerKind: 'closest-approach' };
    const partial = this.closestApproach(ctx, q, opts, straight);
    return { options: partial ? [partial] : [], answerKind: 'closest-approach' };
  }

  /** A chosen stop is a named place: the traveller is at it (no walk), and may also walk to stops around it. */
  private accessOf(place: PlaceInput, radiusM: number): AccessPoint[] {
    const near = this.ix.stopsWithin(place.lat, place.lon, radiusM);
    if (place.stopIndex === undefined || place.stopIndex < 0) return near;
    const others = near.filter(n => n.stop !== place.stopIndex);
    return [{ stop: place.stopIndex, walkSec: 0, meters: 0 }, ...others];
  }

  private params(ctx: QueryContext, profile: CostProfile, opts: TravelOptions, access: AccessPoint[],
    egressSec: Float32Array, maxRides: number, rideWeights: Float32Array): ScanParams {
    return {
      access, egressSec, maxRides, lineAllowed: ctx.lineAllowed, lineRideWeight: rideWeights,
      hopSec: ctx.hopSec, boardWait: ctx.boardWait,
      walkWeight: profile.walkWeight * WALKING[opts.walking].walkWeightFactor, waitWeight: profile.waitWeight,
      transferPenalty: profile.transferPenalty, paidTransferPenalty: profile.paidTransferPenalty,
      transferBufferSec: TRANSFER_BUFFER_SEC[opts.transferTime]
    };
  }

  private search(ctx: QueryContext, q: PlanQuery, opts: TravelOptions, radiusM: number, maxRides: number): PlanOption[] {
    const access = this.accessOf(q.origin, radiusM);
    const egressSec = new Float32Array(this.ix.stopCount).fill(Infinity);
    for (const e of this.accessOf(q.destination, radiusM)) egressSec[e.stop] = e.walkSec;
    if (access.length === 0) return [];
    const buffer = TRANSFER_BUFFER_SEC[opts.transferTime];
    const build = (raw: RawPath) => buildOption(this.ix, ctx, raw, buffer);

    const candidates: PlanOption[] = [];
    for (const profile of SEARCH_PROFILES) {
      candidates.push(...this.scanner.run(this.params(ctx, profile, opts, access, egressSec, maxRides, this.unitWeights)).map(build));
    }
    let options = filterOptions(candidates);

    // Re-runs that make the lines already shown less attractive, to surface other corridors
    const weights = new Float32Array(this.unitWeights);
    for (let i = 0; i < DIVERSITY_RERUNS && options.length > 0; i++) {
      // Each re-run makes the lines already shown costlier still, so the search has to find another way
      for (const line of new Set(options.flatMap(rideLines))) {
        weights[line] = Math.min(MAX_SHOWN_LINE_RIDE_WEIGHT, weights[line] * SHOWN_LINE_RIDE_WEIGHT);
      }
      const extra = this.scanner.run(this.params(ctx, BALANCED, opts, access, egressSec, maxRides, weights)).map(build);
      const merged = filterOptions([...candidates, ...extra]);
      candidates.push(...extra);
      const grew = merged.some(m => !options.some(o => o.signature === m.signature));
      options = merged;
      if (!grew && options.length >= MIN_OPTIONS) break;
    }
    return options;
  }

  private walkOnly(ctx: QueryContext, straight: number): PlanOption {
    const meters = Math.round(straight * WALK_DETOUR);
    const sec = Math.round(meters / WALK_SPEED_MPS);
    return buildOption(this.ix, ctx, {
      legs: [{ kind: 'walk', fromStop: ENDPOINT, toStop: ENDPOINT, sec, meters, flags: 0 }], rides: 0, cost: 0, endStop: ENDPOINT
    }, 0);
  }

  /** Ride as near as public transport gets, then name the rest honestly. */
  private closestApproach(ctx: QueryContext, q: PlanQuery, opts: TravelOptions, straight: number): PlanOption | null {
    const access = this.accessOf(q.origin, RELAXED_RADII_M[RELAXED_RADII_M.length - 1]);
    if (access.length === 0) return null;
    const none = new Float32Array(this.ix.stopCount).fill(Infinity);
    this.scanner.run(this.params(ctx, BALANCED, opts, access, none, MAX_RIDES, this.unitWeights));
    const stops = this.ix.net.stops;
    const remaining = (s: number) => haversineMeters(stops[s][2], stops[s][3], q.destination.lat, q.destination.lon);
    const raw = this.scanner.bestReached(remaining);
    if (!raw || remaining(raw.endStop) > straight * (1 - CLOSEST_APPROACH_MIN_GAIN)) return null;

    const option = buildOption(this.ix, ctx, raw, TRANSFER_BUFFER_SEC[opts.transferTime]);
    const meters = Math.round(remaining(raw.endStop) * WALK_DETOUR);
    const sec = Math.round(meters / WALK_SPEED_MPS);
    option.legs.push({
      kind: 'walk', fromStop: raw.endStop, toStop: ENDPOINT, sec, meters, paidArea: false, sheltered: false,
      stepFree: false, uncovered: true, startSec: ctx.departSec + option.typicalSec
    });
    return option;
  }

  private suggest(open: QueryContext, chosen: QueryContext, q: PlanQuery, opts: TravelOptions, shown: PlanOption[]): ModeSuggestion | undefined {
    const access = this.accessOf(q.origin, WALKING[opts.walking].accessRadiusM);
    const egressSec = new Float32Array(this.ix.stopCount).fill(Infinity);
    for (const e of this.accessOf(q.destination, WALKING[opts.walking].accessRadiusM)) egressSec[e.stop] = e.walkSec;
    const raws = this.scanner.run(this.params(open, BALANCED, opts, access, egressSec, opts.maxTransfers + 1, this.unitWeights));
    const best = filterOptions(raws.map(r => buildOption(this.ix, open, r, TRANSFER_BUFFER_SEC[opts.transferTime])))[0];
    const fastestShown = Math.min(...shown.filter(o => o.rideSec > 0).map(o => o.typicalSec));
    if (!best || !Number.isFinite(fastestShown)) return undefined;
    const saves = fastestShown - best.typicalSec;
    if (saves < Math.max(SUGGESTION_MIN_GAIN_SEC, fastestShown * SUGGESTION_MIN_GAIN_RATIO)) return undefined;
    const modeGroups = new Set<number>();
    for (const leg of best.legs) {
      if (leg.kind === 'ride' && !chosen.lineAllowed[leg.lines[0]]) modeGroups.add(this.ix.lineMode[leg.lines[0]]);
    }
    return modeGroups.size > 0 ? { modeGroups: [...modeGroups], savesSec: saves, option: best } : undefined;
  }
}

/** Every line an option rides. A re-run makes them costlier, so it looks for another way on each leg. */
function rideLines(option: PlanOption): number[] {
  return option.legs.flatMap(leg => (leg.kind === 'ride' ? leg.lines : []));
}
