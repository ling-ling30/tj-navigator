/** Reads the raw Transjakarta GTFS text files into plain maps. Stop TIMES are ignored on purpose: they are a template. */
import fs from 'node:fs';
import path from 'node:path';
import { makeShape, type Shape } from './geo.ts';

export type Row = Record<string, string>;

/** Minimal CSV reader with quoted-field support. */
export function readCsv(file: string): Row[] {
  const text = fs.readFileSync(file, 'utf-8').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  const header = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = splitLine(line);
    const row: Row = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ''));
    return row;
  });
}

function splitLine(line: string): string[] {
  if (!line.includes('"')) return line.split(',');
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function toSeconds(hms: string): number {
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

export interface GtfsStop { id: string; name: string; lat: number; lon: number; parent: string; isStation: boolean }
export interface GtfsTrip { id: string; routeId: string; serviceId: string; headsign: string; direction: number; shapeId: string }
export interface GtfsFrequency { start: number; end: number; headway: number }

export interface Gtfs {
  stops: Map<string, GtfsStop>;
  routes: Row[];
  trips: Map<string, GtfsTrip>;
  /** trip id → stop ids in travel order. */
  tripStops: Map<string, string[]>;
  frequencies: Map<string, GtfsFrequency[]>;
  calendar: Row[];
  /** route id → fare id. */
  fareOfRoute: Map<string, string>;
  /** Pairs of parent stations that the feed marks as connected. */
  stationTransfers: Array<[string, string]>;
  shapes: Map<string, Shape>;
}

export function loadGtfs(dir: string): Gtfs {
  const file = (name: string) => path.join(dir, name);

  const stops = new Map<string, GtfsStop>();
  for (const r of readCsv(file('stops.txt'))) {
    const lat = Number(r.stop_lat);
    const lon = Number(r.stop_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    stops.set(r.stop_id, {
      id: r.stop_id, name: r.stop_name.trim(), lat, lon,
      parent: r.parent_station || '', isStation: r.location_type === '1'
    });
  }

  const trips = new Map<string, GtfsTrip>();
  for (const r of readCsv(file('trips.txt'))) {
    trips.set(r.trip_id, {
      id: r.trip_id, routeId: r.route_id, serviceId: r.service_id,
      headsign: (r.trip_headsign || '').trim(), direction: Number(r.direction_id) || 0, shapeId: r.shape_id || ''
    });
  }

  const seqs = new Map<string, Array<[number, string]>>();
  for (const r of readCsv(file('stop_times.txt'))) {
    let list = seqs.get(r.trip_id);
    if (!list) seqs.set(r.trip_id, (list = []));
    list.push([Number(r.stop_sequence), r.stop_id]);
  }
  const tripStops = new Map<string, string[]>();
  for (const [tripId, list] of seqs) {
    list.sort((a, b) => a[0] - b[0]);
    tripStops.set(tripId, list.map(x => x[1]));
  }

  const frequencies = new Map<string, GtfsFrequency[]>();
  for (const r of readCsv(file('frequencies.txt'))) {
    const headway = Number(r.headway_secs);
    if (!(headway > 0)) continue;
    let list = frequencies.get(r.trip_id);
    if (!list) frequencies.set(r.trip_id, (list = []));
    list.push({ start: toSeconds(r.start_time), end: toSeconds(r.end_time), headway });
  }

  const fareOfRoute = new Map<string, string>();
  for (const r of readCsv(file('fare_rules.txt'))) if (r.route_id) fareOfRoute.set(r.route_id, r.fare_id);

  const stationTransfers: Array<[string, string]> = [];
  if (fs.existsSync(file('transfers.txt'))) {
    for (const r of readCsv(file('transfers.txt'))) stationTransfers.push([r.from_stop_id, r.to_stop_id]);
  }

  const shapePoints = new Map<string, Array<[number, number, number]>>();
  for (const r of readCsv(file('shapes.txt'))) {
    let list = shapePoints.get(r.shape_id);
    if (!list) shapePoints.set(r.shape_id, (list = []));
    list.push([Number(r.shape_pt_sequence), Number(r.shape_pt_lat), Number(r.shape_pt_lon)]);
  }
  const shapes = new Map<string, Shape>();
  for (const [id, pts] of shapePoints) {
    pts.sort((a, b) => a[0] - b[0]);
    if (pts.length >= 2) shapes.set(id, makeShape(pts.map(p => [p[1], p[2]])));
  }

  return {
    stops, routes: readCsv(file('routes.txt')), trips, tripStops, frequencies,
    calendar: readCsv(file('calendar.txt')), fareOfRoute, stationTransfers, shapes
  };
}
