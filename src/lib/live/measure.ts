/**
 * Live figures for the first bus ride of an option: when the next buses reach the boarding stop,
 * worked out from where they are right now, not from the operator's ETA. docs/LIVE-COMPANION-SPEC.md, section 2.
 *
 * Riding time is deliberately NOT measured here. Replaying a recording (scripts/live-eta/replay.ts) showed that
 * a short listen cannot tell a red light from a jam: the live riding time was worse than the planned one.
 */
import type { Itinerary, Leg, LiveLegRef } from '../../types/transit';
import { listen, topicsFor, type BusSample } from './feed';
import { place, shapeOf, vertexAt, type PatternShape } from './shapes';

export const BURST_MS = 15_000;
/** A bus further than this from the route is on another road. */
const ON_ROUTE_M = 50;
/** How far before the boarding stop a bus still counts as "coming". */
export const UPSTREAM_M = 8000;
const SAMPLE_EVERY_M = 500;
/** A bus must be seen for this long before its direction is known. */
const MIN_SEEN_SEC = 6;
/** A bus this close to the stop has, for the traveller, arrived. */
const AT_STOP_M = 20;
const MIN_SPEED_MPS = 1;

export interface LiveLeg {
  legIndex: number;
  /** Seconds until the next bus reaches the boarding stop, and the one after it. Absent when none was seen coming. */
  nextBusSec?: number;
  followingBusSec?: number;
  busesComing: number;
}

export interface LiveOption {
  legs: LiveLeg[];
  /** Door-to-door minutes with the real wait for the first bus in place of the typical one. */
  totalMinutes: number;
  measuredAtMs: number;
}

interface Track { first: number; last: number; start: number; end: number; headingHere: boolean }

/** Where each bus was at its first and last sighting, as distances along the route. */
function tracksOn(shape: PatternShape, samples: BusSample[], ref: LiveLegRef, fromVertex: number, toVertex: number): Track[] {
  const routes = new Set(ref.routes);
  const approach = new Set(ref.approachStops);
  const byBus = new Map<string, Track>();
  for (const s of samples) {
    if (!routes.has(s.route)) continue;
    const p = place(shape, s.lat, s.lon, fromVertex, toVertex);
    if (p.offset > ON_ROUTE_M) continue;
    const track = byBus.get(s.bus);
    const headingHere = approach.has(s.next);
    if (!track) byBus.set(s.bus, { first: s.t, last: s.t, start: p.metres, end: p.metres, headingHere });
    else { track.last = s.t; track.end = p.metres; track.headingHere ||= headingHere; }
  }
  // Coming this way: the bus says its next stop is on the approach, or it was seen moving forward for a while.
  // A bus that moved backwards along this route is running the other way on the same road.
  return [...byBus.values()].filter(t => {
    if (t.end - t.start < -15) return false;
    return t.headingHere || ((t.last - t.first) / 1000 >= MIN_SEEN_SEC && t.end - t.start > 5);
  });
}

/**
 * Buses still before the boarding stop, turned into arrival times at the speed the plan assumes for that road.
 * The plan's speed is the steadier guide; the buses' positions are what is new.
 */
export function measureLeg(shape: PatternShape, ref: LiveLegRef, leg: Leg, legIndex: number, samples: BusSample[]): LiveLeg {
  const boardM = shape.cum[shape.stopVertex[ref.boardStop]];
  const alightM = shape.cum[shape.stopVertex[ref.alightStop]];
  const fromVertex = vertexAt(shape, Math.max(0, boardM - UPSTREAM_M));
  const tracks = tracksOn(shape, samples, ref, fromVertex, shape.stopVertex[ref.boardStop] + 1);
  const speed = Math.max(MIN_SPEED_MPS, (alightM - boardM) / Math.max(1, leg.durationSeconds));
  const coming = tracks.filter(t => t.end < boardM - AT_STOP_M).map(t => (boardM - t.end) / speed).sort((a, b) => a - b);
  return {
    legIndex,
    busesComing: coming.length,
    nextBusSec: coming.length > 0 ? Math.round(coming[0]) : undefined,
    followingBusSec: coming.length > 1 ? Math.round(coming[1]) : undefined
  };
}

/** Points along the approach to the boarding stop, for choosing the feed cells to listen to. */
function pointsOf(shape: PatternShape, ref: LiveLegRef): Array<[number, number]> {
  const to = shape.cum[shape.stopVertex[ref.boardStop]];
  const points: Array<[number, number]> = [];
  for (let m = Math.max(0, to - UPSTREAM_M); m <= to; m += SAMPLE_EVERY_M) {
    const v = vertexAt(shape, m);
    points.push([shape.lat[v], shape.lon[v]]);
  }
  return points;
}

/** Listens to the feed once and returns the next buses for the first bus ride of the option. Null when nothing can be measured. */
export async function measureOption(option: Itinerary): Promise<LiveOption | null> {
  // Only the first ride: a bus near a later stop now is not the one the traveller will take there
  const legIndex = option.legs.findIndex(leg => leg.type === 'TRANSIT');
  const leg = option.legs[legIndex];
  if (!leg?.live) return null;
  const shape = await shapeOf(leg.live.pattern);
  if (!shape) return null;
  const samples = await listen(topicsFor(leg.live.routes, pointsOf(shape, leg.live)), BURST_MS);
  if (samples.length === 0) return null;

  const live = measureLeg(shape, leg.live, leg, legIndex, samples);
  // The traveller can only take a bus that arrives after the walk to the stop
  const walkSec = option.legs.slice(0, legIndex).reduce((sum, l) => sum + l.durationSeconds, 0);
  const catchable = [live.nextBusSec, live.followingBusSec].find(sec => sec !== undefined && sec >= walkSec);
  const deltaSec = catchable !== undefined && leg.waitSeconds !== undefined ? catchable - walkSec - leg.waitSeconds : 0;
  return { legs: [live], totalMinutes: Math.max(1, Math.round(option.totalDurationMinutes + deltaSec / 60)), measuredAtMs: Date.now() };
}
