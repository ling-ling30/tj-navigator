/**
 * Compiled transit graph, version 2 (see docs/ROUTING-V2-SPEC.md, section 7).
 * Compact tuples: the file is fetched and cached by every client.
 */

export const ModeGroup = { BRT: 0, BUS: 1, MIKROTRANS: 2, KRL: 3, MRT: 4, LRT: 5 } as const;
export type ModeGroupType = (typeof ModeGroup)[keyof typeof ModeGroup];

/** Day-type bits used in headway windows. */
export const DayBit = { WEEKDAY: 1, SATURDAY: 2, SUNDAY: 4 } as const;

/** Transfer flag bits. */
export const TransferFlag = { PAID_AREA: 1, SHELTERED: 2, STEP_FREE: 4 } as const;

/** [id, name, lat, lon, halte]. `halte` is the GTFS parent station id, or '' when the stop has none. */
export type StopV2 = [id: string, name: string, lat: number, lon: number, halte: string];

/** [id, shortName, longName, colorHex, modeGroup, fareClass, serviceClass]. */
export type LineV2 = [
  id: string,
  shortName: string,
  longName: string,
  color: string,
  modeGroup: number,
  fareClass: string,
  serviceClass: string
];

/** [dayMask, startSec, endSec, headwaySec]. */
export type WindowV2 = [dayMask: number, startSec: number, endSec: number, headwaySec: number];

/**
 * [lineIdx, direction, headsign, stopIdx[], hopMeters[], windows[]].
 * A stop may appear twice in `stopIdx` (loop routes). `hopMeters[i]` is the distance
 * along the route from position i to position i + 1, so it has one entry fewer than `stopIdx`.
 */
export type PatternV2 = [
  lineIdx: number,
  direction: number,
  headsign: string,
  stopIdx: number[],
  hopMeters: number[],
  windows: WindowV2[]
];

/** Curated transfers only: [fromStop, toStop, walkSec, meters, flags]. Proximity footpaths are derived at load. */
export type TransferV2 = [from: number, to: number, walkSec: number, meters: number, flags: number];

export interface NetworkV2 {
  version: string;
  generatedAt: string;
  feedDate: string;
  stops: StopV2[];
  lines: LineV2[];
  patterns: PatternV2[];
  transfers: TransferV2[];
}
