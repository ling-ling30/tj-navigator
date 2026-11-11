/** Turns GTFS routes and trips into lines and stop patterns. Keeps every distinct stop sequence. */
import { DayBit, ModeGroup, type LineV2, type PatternV2, type WindowV2 } from '../../src/types/network-v2.ts';
import { haversineMeters, projectForward, type Shape } from './geo.ts';
import type { Gtfs, GtfsStop, Row } from './gtfs-load.ts';
import { pathOf, type PatternPath } from './paths.ts';
import type { BuildStats, StopRegistry } from './registry.ts';

const SHAPE_NEAR_M = 60;
const SHAPE_MAX_OFFSET_M = 150;
const STRAIGHT_LINE_DETOUR = 1.3;
const SHAPE_MIN_RATIO = 0.95;
const SHAPE_MAX_RATIO = 5;
const SHAPE_MAX_SLACK_M = 500;
const DEFAULT_FARE = 'FP';

const SERVICE_CLASS: Record<string, string> = {
  'BRT': 'BRT',
  'Angkutan Umum Integrasi': 'INTEGRASI',
  'Rusun': 'RUSUN',
  'Mikrotrans': 'MIKROTRANS',
  'Transjabodetabek': 'TRANSJABODETABEK',
  'Royaltrans': 'ROYALTRANS',
  'Bus Wisata': 'WISATA'
};

function modeGroupOf(serviceClass: string): number {
  if (serviceClass === 'BRT') return ModeGroup.BRT;
  if (serviceClass === 'MIKROTRANS') return ModeGroup.MIKROTRANS;
  return ModeGroup.BUS;
}

/** Day-type bits of each service id that is still valid on the build date. */
export function dayMasks(calendar: Row[], buildDate: string): Map<string, number> {
  const masks = new Map<string, number>();
  for (const c of calendar) {
    let mask = 0;
    if (!c.end_date || c.end_date >= buildDate) {
      if ([c.monday, c.tuesday, c.wednesday, c.thursday, c.friday].includes('1')) mask |= DayBit.WEEKDAY;
      if (c.saturday === '1') mask |= DayBit.SATURDAY;
      if (c.sunday === '1') mask |= DayBit.SUNDAY;
    }
    masks.set(c.service_id, mask);
  }
  return masks;
}

export function buildLines(gtfs: Gtfs, stats: BuildStats): { lines: LineV2[]; lineOfRoute: Map<string, number> } {
  const lines: LineV2[] = [];
  const lineOfRoute = new Map<string, number>();
  const routes = [...gtfs.routes].sort((a, b) => a.route_id.localeCompare(b.route_id));
  for (const r of routes) {
    let serviceClass = SERVICE_CLASS[r.route_desc];
    if (!serviceClass) { stats.unknownRouteDesc.add(r.route_desc); serviceClass = 'INTEGRASI'; }
    let fare = gtfs.fareOfRoute.get(r.route_id);
    if (!fare) {
      const base = gtfs.fareOfRoute.get(r.route_id.replace(/R$/, ''));
      if (base) { fare = base; stats.fareInherited.push(r.route_id); }
      else { fare = DEFAULT_FARE; stats.fareDefaulted.push(r.route_id); }
    }
    lineOfRoute.set(r.route_id, lines.length);
    lines.push([
      `tj:${r.route_id}`, r.route_short_name, r.route_long_name,
      r.route_color ? `#${r.route_color}` : '', modeGroupOf(serviceClass), fare, serviceClass
    ]);
  }
  return { lines, lineOfRoute };
}

function hopMetersAlong(shape: Shape | undefined, stops: GtfsStop[], stats: BuildStats): number[] {
  const pos: number[] = [];
  if (shape) {
    let seg = 0;
    for (const s of stops) {
      const p = projectForward(shape, seg, s.lat, s.lon, SHAPE_NEAR_M);
      if (p.offset <= SHAPE_MAX_OFFSET_M) { pos.push(p.pos); seg = p.seg; } else pos.push(NaN);
    }
  }
  const hops: number[] = [];
  for (let i = 0; i + 1 < stops.length; i++) {
    const straight = haversineMeters(stops[i].lat, stops[i].lon, stops[i + 1].lat, stops[i + 1].lon);
    const along = shape ? pos[i + 1] - pos[i] : NaN;
    const plausible = along >= straight * SHAPE_MIN_RATIO && along <= straight * SHAPE_MAX_RATIO + SHAPE_MAX_SLACK_M;
    if (plausible) { hops.push(Math.round(along)); stats.hopsAlongShape++; }
    else { hops.push(Math.round(straight * STRAIGHT_LINE_DETOUR)); stats.hopsFallback++; }
  }
  return hops;
}

export function buildPatterns(
  gtfs: Gtfs, lineOfRoute: Map<string, number>, registry: StopRegistry, buildDate: string, stats: BuildStats,
  /** Filled with the route geometry of each pattern, in the same order as the patterns returned. */
  paths: PatternPath[]
): PatternV2[] {
  const masks = dayMasks(gtfs.calendar, buildDate);
  const groups = new Map<string, string[]>();
  for (const tripId of [...gtfs.tripStops.keys()].sort()) {
    const trip = gtfs.trips.get(tripId);
    if (!trip || !lineOfRoute.has(trip.routeId)) continue;
    const key = `${trip.routeId}|${trip.direction}|${gtfs.tripStops.get(tripId)!.join('>')}`;
    const list = groups.get(key);
    if (list) list.push(tripId); else groups.set(key, [tripId]);
  }

  const patterns: PatternV2[] = [];
  for (const tripIds of groups.values()) {
    const first = gtfs.trips.get(tripIds[0])!;
    const stops: GtfsStop[] = [];
    for (const stopId of gtfs.tripStops.get(tripIds[0])!) {
      const s = gtfs.stops.get(stopId);
      if (s) stops.push(s); else stats.unknownStops.add(stopId);
    }
    if (stops.length < 2) continue;

    const seen = new Set<string>();
    const windows: WindowV2[] = [];
    for (const tripId of tripIds) {
      const mask = masks.get(gtfs.trips.get(tripId)!.serviceId) ?? 0;
      if (mask === 0) continue;
      for (const f of gtfs.frequencies.get(tripId) ?? []) {
        const w: WindowV2 = [mask, f.start, f.end, f.headway];
        if (!seen.has(w.join(','))) { seen.add(w.join(',')); windows.push(w); }
      }
    }
    if (windows.length === 0) { stats.patternsWithoutService++; continue; }
    windows.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]);

    const shapeTrip = tripIds.map(id => gtfs.trips.get(id)!).find(t => gtfs.shapes.has(t.shapeId));
    const shape = shapeTrip ? gtfs.shapes.get(shapeTrip.shapeId) : undefined;
    const hopMeters = hopMetersAlong(shape, stops, stats);
    paths.push(pathOf(shape, stops));
    const stopIdx = stops.map(s => registry.add(`tj:${s.id}`, s.name, s.lat, s.lon, s.parent));
    patterns.push([lineOfRoute.get(first.routeId)!, first.direction, first.headsign, stopIdx, hopMeters, windows]);
  }
  return patterns;
}
