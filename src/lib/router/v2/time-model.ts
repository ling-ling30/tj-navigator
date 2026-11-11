/**
 * Time model: how long a hop takes and how long a traveller waits.
 * The calibration table lives here so that tuning never needs a graph rebuild.
 * See docs/ROUTING-V2-SPEC.md, section 3.
 */
import { DayBit } from '../../../types/network-v2';

export const HopClass = { BUSWAY: 0, STREET: 1, MIKRO: 2, TOLL: 3, KRL: 4, MRT: 5, LRT: 6 } as const;

/**
 * Commercial speed in km/h (stops included): [off-peak, peak].
 * PROVISIONAL starting values, pending wayfinder/routing-v2 tickets 13 (live bus speeds) and 14 (published figures).
 */
export const SPEED_KMH: Record<number, readonly [number, number]> = {
  [HopClass.BUSWAY]: [22, 18],
  [HopClass.STREET]: [17, 13],
  [HopClass.MIKRO]: [14, 11],
  [HopClass.TOLL]: [45, 30],
  [HopClass.KRL]: [38, 38],
  [HopClass.MRT]: [32, 32],
  [HopClass.LRT]: [30, 30]
};

/** A hop this long on an express service is treated as a toll or highway stretch. */
export const TOLL_HOP_MIN_METERS = 2500;
const EXPRESS_SERVICE_CLASSES = new Set(['TRANSJABODETABEK', 'ROYALTRANS']);

export const MAX_EXPECTED_WAIT_SEC = 15 * 60;
/** From this headway on, a leg is flagged as infrequent in the UI. */
export const INFREQUENT_HEADWAY_SEC = 30 * 60;
const MIN_HOP_SEC = 15;
const HOUR = 3600;
const PEAK_PERIODS: ReadonlyArray<readonly [number, number]> = [[6 * HOUR, 9 * HOUR], [16 * HOUR, 20 * HOUR]];

export function hopClassOf(serviceClass: string, meters: number): number {
  switch (serviceClass) {
    case 'KRL': return HopClass.KRL;
    case 'MRT': return HopClass.MRT;
    case 'LRT': return HopClass.LRT;
    case 'BRT': return HopClass.BUSWAY;
    case 'MIKROTRANS': return HopClass.MIKRO;
    default:
      return EXPRESS_SERVICE_CLASSES.has(serviceClass) && meters >= TOLL_HOP_MIN_METERS ? HopClass.TOLL : HopClass.STREET;
  }
}

export function hopSeconds(meters: number, hopClass: number, peak: boolean): number {
  const kmh = SPEED_KMH[hopClass][peak ? 1 : 0];
  return Math.max(MIN_HOP_SEC, meters / (kmh / 3.6));
}

/** Day-type bit of a calendar date (device time zone, which for this app is Jakarta time). */
export function dayBitOf(date: Date): number {
  const day = date.getDay();
  if (day === 0) return DayBit.SUNDAY;
  if (day === 6) return DayBit.SATURDAY;
  return DayBit.WEEKDAY;
}

export function secondsOfDay(date: Date): number {
  return date.getHours() * HOUR + date.getMinutes() * 60 + date.getSeconds();
}

export function isPeak(dayBit: number, sec: number): boolean {
  return dayBit === DayBit.WEEKDAY && PEAK_PERIODS.some(([from, to]) => sec >= from && sec < to);
}

/** Expected wait for a service with the given frequency (vehicles per second): half the headway, capped. */
export function expectedWaitSec(frequency: number): number {
  if (!(frequency > 0)) return Infinity;
  return Math.min(1 / (2 * frequency), MAX_EXPECTED_WAIT_SEC);
}
