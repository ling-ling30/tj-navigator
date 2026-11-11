/** Rail lines from the hand-kept seeds (KRL, MRT, LRT). Both directions become separate patterns. */
import fs from 'node:fs';
import path from 'node:path';
import { DayBit, ModeGroup, type LineV2, type PatternV2, type WindowV2 } from '../../src/types/network-v2.ts';
import { haversineMeters } from './geo.ts';
import type { StopRegistry } from './registry.ts';

const RAIL_DETOUR = 1.2;
const HOUR = 3600;
/** Assumed service span and peak periods: the seeds carry headways only, no timetable. */
const SERVICE_START = 5 * HOUR;
const SERVICE_END = 24 * HOUR;
const PEAKS: Array<[number, number]> = [[6 * HOUR, 9 * HOUR], [16 * HOUR, 20 * HOUR]];
const ALL_DAYS = DayBit.WEEKDAY | DayBit.SATURDAY | DayBit.SUNDAY;

interface SeedStation { id: string; name: string; lat: number; lon: number; km?: number }
interface SeedRoute {
  id: string; shortName: string; longName: string; color: string; mode: number;
  peakHeadwaySeconds: number; offPeakHeadwaySeconds?: number; stations: SeedStation[];
}

const SEEDS: Array<{ file: string; modeGroup: number; serviceClass: string; fareOf: (id: string) => string }> = [
  { file: 'krl-network.json', modeGroup: ModeGroup.KRL, serviceClass: 'KRL', fareOf: () => 'KRL' },
  { file: 'mrt-network.json', modeGroup: ModeGroup.MRT, serviceClass: 'MRT', fareOf: () => 'MRT' },
  { file: 'lrt-network.json', modeGroup: ModeGroup.LRT, serviceClass: 'LRT', fareOf: id => (id === 'lrt:jakarta' ? 'LRT_JKT' : 'LRT_JBD') }
];

function windowsOf(route: SeedRoute): WindowV2[] {
  const peak = route.peakHeadwaySeconds;
  const off = route.offPeakHeadwaySeconds ?? peak;
  if (off === peak) return [[ALL_DAYS, SERVICE_START, SERVICE_END, peak]];
  const weekday: WindowV2[] = [];
  let cursor = SERVICE_START;
  for (const [start, end] of PEAKS) {
    if (start > cursor) weekday.push([DayBit.WEEKDAY, cursor, start, off]);
    weekday.push([DayBit.WEEKDAY, start, end, peak]);
    cursor = end;
  }
  if (cursor < SERVICE_END) weekday.push([DayBit.WEEKDAY, cursor, SERVICE_END, off]);
  return [...weekday, [DayBit.SATURDAY | DayBit.SUNDAY, SERVICE_START, SERVICE_END, off]];
}

export function buildRail(seedDir: string, registry: StopRegistry, lines: LineV2[]): PatternV2[] {
  const patterns: PatternV2[] = [];
  for (const seed of SEEDS) {
    const data = JSON.parse(fs.readFileSync(path.join(seedDir, seed.file), 'utf-8')) as { routes: SeedRoute[] };
    for (const route of data.routes) {
      const lineIdx = lines.length;
      lines.push([route.id, route.shortName, route.longName, route.color, seed.modeGroup, seed.fareOf(route.id), seed.serviceClass]);

      const st = route.stations;
      const stopIdx = st.map(s => registry.add(s.id, s.name, s.lat, s.lon, ''));
      const hops: number[] = [];
      for (let i = 0; i + 1 < st.length; i++) {
        const byKm = st[i].km !== undefined && st[i + 1].km !== undefined ? (st[i + 1].km! - st[i].km!) * 1000 : NaN;
        const straight = haversineMeters(st[i].lat, st[i].lon, st[i + 1].lat, st[i + 1].lon);
        hops.push(Math.round(byKm > 0 ? byKm : straight * RAIL_DETOUR));
      }
      const windows = windowsOf(route);
      patterns.push([lineIdx, 0, st[st.length - 1].name, stopIdx, hops, windows]);
      patterns.push([lineIdx, 1, st[0].name, [...stopIdx].reverse(), [...hops].reverse(), windows]);
    }
  }
  return patterns;
}
