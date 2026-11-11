/** Adapter: the planner's options → the `Itinerary` shape the screens already render. */
import { ModeGroup } from '../../../types/network-v2';
import { TransitMode, type AnswerKind, type Itinerary, type Leg, type ModeSuggestionView, type OptionBadge, type TransitModeType } from '../../../types/transit';
import { PREMIUM_FARE_CLASSES } from './context';
import type { NetworkIndex } from './network-index';
import type { PlanOption, RideLeg } from './option';
import { Badge } from './option-filter';
import type { PlanResult } from './planner';

export interface PlanView {
  itineraries: Itinerary[];
  answerKind: AnswerKind;
  suggestion?: ModeSuggestionView;
  modesGaveNothing: boolean;
  /** Nothing runs at the time asked for: the options are for this later departure (epoch milliseconds). */
  laterDepartureMs?: number;
}

const LEGACY_MODE: Record<number, TransitModeType> = {
  [ModeGroup.BRT]: TransitMode.BRT,
  [ModeGroup.BUS]: TransitMode.NON_BRT,
  [ModeGroup.MIKROTRANS]: TransitMode.MIKROTRANS,
  [ModeGroup.KRL]: TransitMode.COMMUTER_RAIL,
  [ModeGroup.MRT]: TransitMode.MRT,
  [ModeGroup.LRT]: TransitMode.LRT
};
const DAY_SEC = 86400;

export function clock(sec: number): string {
  const s = ((Math.round(sec / 60) * 60) % DAY_SEC + DAY_SEC) % DAY_SEC;
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
}
const minutes = (sec: number) => Math.max(1, Math.round(sec / 60));

function category(badges: string[]): Itinerary['category'] {
  if (badges.includes(Badge.FEWEST_TRANSFERS) && !badges.includes(Badge.FASTEST)) return 'FEWEST_TRANSFERS';
  if (badges.includes(Badge.CHEAPEST) && !badges.includes(Badge.FASTEST)) return 'CHEAPEST';
  return 'FASTEST';
}

function intermediateNames(ix: NetworkIndex, leg: RideLeg): string[] {
  const names: string[] = [];
  leg.segments.forEach(([board, alight], i) => {
    // A continued ride passes the terminus where its segments meet
    for (let pos = i === 0 ? board + 1 : board; pos < alight; pos++) names.push(ix.net.stops[ix.posStop[pos]][1]);
  });
  return names;
}

const BUS_LINE_PREFIX = 'tj:';

/** Only buses have a live feed, and only a ride on one pattern can be followed along its shape. */
function liveRef(ix: NetworkIndex, leg: RideLeg): Leg['live'] {
  const routes = leg.lines.map(l => ix.net.lines[l][0]).filter(id => id.startsWith(BUS_LINE_PREFIX)).map(id => id.slice(BUS_LINE_PREFIX.length));
  if (routes.length === 0 || leg.segments.length !== 1) return undefined;
  const [board, alight] = leg.segments[0];
  const pattern = ix.posPattern[board];
  const start = ix.patStart[pattern];
  const approachStops: string[] = [];
  for (let pos = start; pos <= board; pos++) approachStops.push(ix.net.stops[ix.posStop[pos]][0].slice(BUS_LINE_PREFIX.length));
  return { pattern, boardStop: board - start, alightStop: alight - start, routes, approachStops };
}

export function toItinerary(
  ix: NetworkIndex, option: PlanOption, index: number, departSec: number, originName: string, destinationName: string
): Itinerary {
  const stops = ix.net.stops;
  const name = (s: number, endpoint: string) => (s < 0 ? endpoint : stops[s][1]);
  const id = (s: number) => (s < 0 ? undefined : stops[s][0]);
  const hasRide = option.legs.some(l => l.kind === 'ride');

  const itinerary: Itinerary = {
    id: `option-${index}`,
    category: category(option.badges),
    totalDurationMinutes: minutes(option.typicalSec),
    nominalDurationMinutes: minutes(option.typicalSec),
    trafficDelayMinutes: 0,
    departureTime: clock(departSec),
    arrivalTime: clock(departSec + option.typicalSec),
    standardFareIdr: option.fareIdr,
    integratedFareIdr: option.fareIdr,
    transfersCount: option.transfers,
    legs: [],
    badges: [],
    answerKind: hasRide ? 'direct' : 'walk-only',
    durationMinMinutes: minutes(option.minSec),
    durationMaxMinutes: minutes(option.maxSec),
    walkMeters: option.walkMeters,
    badgeKeys: option.badges as OptionBadge[],
    fareIsIntegrated: option.fareIntegrated
  };

  for (const leg of option.legs) {
    if (leg.kind === 'walk') {
      const walk: Leg = {
        type: 'WALK',
        fromStopName: name(leg.fromStop, originName), fromStopId: id(leg.fromStop),
        toStopName: name(leg.toStop, destinationName), toStopId: id(leg.toStop),
        departureTime: clock(leg.startSec), arrivalTime: clock(leg.startSec + leg.sec),
        durationSeconds: leg.sec, distanceMeters: leg.meters,
        isPaidAreaTransfer: leg.paidArea, isSheltered: leg.sheltered, isStepFree: leg.stepFree,
        isUncoveredSegment: leg.uncovered
      };
      itinerary.legs.push(walk);
      if (leg.uncovered && leg.fromStop >= 0) {
        const from = stops[leg.fromStop];
        itinerary.answerKind = 'closest-approach';
        itinerary.uncoveredDistanceMeters = leg.meters;
        itinerary.uncoveredDurationMinutes = minutes(leg.sec);
        itinerary.uncoveredOriginLat = from[2];
        itinerary.uncoveredOriginLon = from[3];
      }
      continue;
    }
    const line = ix.net.lines[leg.lines[0]];
    const between = intermediateNames(ix, leg);
    itinerary.legs.push({
      type: 'TRANSIT',
      mode: LEGACY_MODE[line[4]],
      modeGroup: line[4],
      routeId: line[0],
      routeShortName: line[1],
      routeColor: line[3],
      lineNames: leg.lines.map(l => ix.net.lines[l][1]),
      premiumFareClass: PREMIUM_FARE_CLASSES.has(line[5]) ? line[5] : undefined,
      fromStopName: stops[leg.boardStop][1], fromStopId: stops[leg.boardStop][0],
      toStopName: stops[leg.alightStop][1], toStopId: stops[leg.alightStop][0],
      departureTime: clock(leg.boardSec), arrivalTime: clock(leg.boardSec + leg.rideSec),
      durationSeconds: Math.round(leg.rideSec), distanceMeters: leg.meters,
      intermediateStopCount: between.length, intermediateStopNames: between,
      isPaidAreaTransfer: leg.paidEntry,
      headwaySeconds: Number.isFinite(leg.headwaySec) ? Math.round(leg.headwaySec) : undefined,
      waitSeconds: Math.round(leg.waitSec),
      isInfrequent: leg.infrequent,
      live: liveRef(ix, leg)
    });
  }
  return itinerary;
}

export function toPlanView(
  ix: NetworkIndex, result: PlanResult, departSec: number,
  origin: { name: string }, destination: { name: string; lat: number; lon: number }
): PlanView {
  const convert = (o: PlanOption, i: number) => {
    const itinerary = toItinerary(ix, o, i, departSec, origin.name, destination.name);
    if (itinerary.uncoveredOriginLat !== undefined) {
      itinerary.uncoveredDestLat = destination.lat;
      itinerary.uncoveredDestLon = destination.lon;
      itinerary.googleMapsUrl = 'https://www.google.com/maps/dir/?api=1' +
        `&origin=${itinerary.uncoveredOriginLat},${itinerary.uncoveredOriginLon}&destination=${destination.lat},${destination.lon}`;
    }
    if (result.answerKind === 'relaxed') itinerary.answerKind = 'relaxed';
    return itinerary;
  };
  return {
    itineraries: result.options.map(convert),
    answerKind: result.answerKind,
    modesGaveNothing: result.modesGaveNothing === true,
    laterDepartureMs: result.laterDepartureMs,
    suggestion: result.suggestion && {
      modeGroups: result.suggestion.modeGroups,
      savesMinutes: minutes(result.suggestion.savesSec),
      itinerary: convert(result.suggestion.option, -1)
    }
  };
}
