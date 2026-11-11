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
}

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
}
