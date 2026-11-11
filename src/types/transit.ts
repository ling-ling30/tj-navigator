export const TransitMode = {
  BRT: 0,
  NON_BRT: 1,
  COMMUTER_RAIL: 2,
  MRT: 3,
  LRT: 4,
  MIKROTRANS: 5
} as const;

export type TransitModeType = typeof TransitMode[keyof typeof TransitMode];

// Compact tuple schema: [id, name, lat, lon, modeEnum]
export type StopTuple = [string, string, number, number, number];

// [id, shortName, longName, colorHex, stopIndices, headwaySeconds, stopDistancesMeters?]
export type RouteTuple = [string, string, string, string, number[], number, number[]?];

// [fromIdx, toIdx, walkSec, distM, isPaidArea(0|1), gateBufferSec, peakPenaltySec, isSheltered(0|1), isStepFree(0|1)]
export type TransferTuple = [number, number, number, number, number, number, number, number, number];

export interface CompiledTransitNetwork {
  version: string;
  generatedAt: string;
  stops: StopTuple[];
  routes: RouteTuple[];
  stopRoutes: number[][];
  transfers: TransferTuple[];
  routeShapes: Record<string, string>;
}

export type AnswerKind = 'direct' | 'relaxed' | 'closest-approach' | 'walk-only' | 'same-place';

export interface StopEntity {
  index: number;
  id: string;
  name: string;
  lat: number;
  lon: number;
  mode: TransitModeType;
  isCustomPoint?: boolean;
  customLabel?: string;
}

export interface Leg {
  type: 'WALK' | 'TRANSIT';
  mode?: TransitModeType;
  routeId?: string;
  routeShortName?: string;
  routeColor?: string;
  fromStopName: string;
  fromStopId?: string;
  toStopName: string;
  toStopId?: string;
  departureTime: string;
  arrivalTime: string;
  durationSeconds: number;
  distanceMeters: number;
  intermediateStopCount?: number;
  intermediateStopNames?: string[];
  isPaidAreaTransfer?: boolean;
  isSheltered?: boolean;
  isStepFree?: boolean;
  recountedDelaySeconds?: number;
  liveBusId?: string;
  liveBusLandmark?: string;
  headwaySeconds?: number;
  isUncoveredSegment?: boolean;
  /** Routing v2: every line that serves this leg, the first being the main one ("9, 9A atau 9E"). */
  lineNames?: string[];
  /** Routing v2: typical wait before boarding, already outside `durationSeconds`. */
  waitSeconds?: number;
  /** Routing v2: the leg runs every 30 minutes or less often. */
  isInfrequent?: boolean;
  /** Routing v2: mode group of the main line (see src/types/network-v2.ts). */
  modeGroup?: number;
  /** Routing v2: premium fare class of the main line, if any (PP, PP3, SH2). */
  premiumFareClass?: string;
  /** Routing v2: what the live module needs to follow this ride. Absent on rail, which has no live feed. */
  live?: LiveLegRef;
}

/** Where a ride runs, so live bus positions can be placed on it. */
export interface LiveLegRef {
  /** Index of the pattern in the graph and in shapes-v2.json. */
  pattern: number;
  /** Boarding and alighting stop, as positions in that pattern's stop list. */
  boardStop: number;
  alightStop: number;
  /** Route codes of every line that serves the leg, as the live feed names them. */
  routes: string[];
  /** Stop ids (as the feed names them) from the start of the pattern up to the boarding stop: a bus whose next stop is one of these is coming this way. */
  approachStops: string[];
}

/** Routing v2 badge keys, each given to at most one option of a result. */
export type OptionBadge = 'fastest' | 'fewest_transfers' | 'cheapest' | 'least_walking';

export interface Itinerary {
  id: string;
  category: 'FASTEST' | 'FEWEST_TRANSFERS' | 'CHEAPEST';
  totalDurationMinutes: number;
  nominalDurationMinutes: number;
  trafficDelayMinutes: number;
  departureTime: string;
  arrivalTime: string;
  standardFareIdr: number;
  integratedFareIdr: number;
  transfersCount: number;
  legs: Leg[];
  badges: string[];
  answerKind?: AnswerKind;
  uncoveredDistanceMeters?: number;
  uncoveredDurationMinutes?: number;
  uncoveredOriginLat?: number;
  uncoveredOriginLon?: number;
  uncoveredDestLat?: number;
  uncoveredDestLon?: number;
  googleMapsUrl?: string;
  relaxedWalkExtraMeters?: number;
  /** Routing v2: door-to-door range, from no waiting at all to a full headway at every boarding. */
  durationMinMinutes?: number;
  durationMaxMinutes?: number;
  /** Routing v2: total walking of the option. */
  walkMeters?: number;
  badgeKeys?: OptionBadge[];
  /** Routing v2: the fare shown is the integrated (JakLingko) tariff. Every fare is an estimate. */
  fareIsIntegrated?: boolean;
}

/** Routing v2: a switched-off mode group would be clearly faster. */
export interface ModeSuggestionView {
  modeGroups: number[];
  savesMinutes: number;
  itinerary: Itinerary;
}
