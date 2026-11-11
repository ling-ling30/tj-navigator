/**
 * Walking links between stops, derived when the graph is loaded:
 * curated transfers from the graph, platforms of the same halte, and ordinary footpaths between nearby stops.
 */
import { TransferFlag, type NetworkV2 } from '../../../types/network-v2';

export const WALK_SPEED_MPS = 1.25;
export const WALK_DETOUR = 1.3;
const FOOTPATH_RADIUS_M = 400;
const FOOTPATH_MAX_NEIGHBOURS = 8;
const MIN_WALK_SEC = 30;
/** Extra time to get in or out of a rail station on an ordinary footpath. */
const RAIL_GATE_SEC = 90;
const GRID_DEG = 0.004;
const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function isRailStopId(id: string): boolean {
  return id.startsWith('krl:') || id.startsWith('mrt:') || id.startsWith('lrt:');
}

export interface FootpathTable {
  start: Int32Array;
  to: Int32Array;
  sec: Float32Array;
  meters: Int32Array;
  flags: Uint8Array;
}

type Edge = [to: number, sec: number, meters: number, flags: number];

export function buildFootpaths(net: NetworkV2): FootpathTable {
  const stops = net.stops;
  const n = stops.length;
  const edges: Array<Map<number, Edge>> = Array.from({ length: n }, () => new Map());
  const put = (from: number, e: Edge) => {
    if (from !== e[0] && !edges[from].has(e[0])) edges[from].set(e[0], e);
  };
  const walkOf = (a: number, b: number): [number, number] => {
    const meters = Math.round(haversineMeters(stops[a][2], stops[a][3], stops[b][2], stops[b][3]) * WALK_DETOUR);
    return [Math.max(MIN_WALK_SEC, Math.round(meters / WALK_SPEED_MPS)), meters];
  };

  // 1. Curated transfers win over everything derived below
  for (const [from, to, sec, meters, flags] of net.transfers) put(from, [to, sec, meters, flags]);

  // 2. Platforms of the same halte: inside the paid area
  const byHalte = new Map<string, number[]>();
  stops.forEach((s, i) => {
    if (!s[4]) return;
    const list = byHalte.get(s[4]);
    if (list) list.push(i); else byHalte.set(s[4], [i]);
  });
  for (const members of byHalte.values()) {
    for (const a of members) for (const b of members) {
      if (a === b) continue;
      const [sec, meters] = walkOf(a, b);
      put(a, [b, sec, meters, TransferFlag.PAID_AREA | TransferFlag.SHELTERED]);
    }
  }

  // 3. Ordinary footpaths: nearest neighbours within the radius, plus same-name stops
  const grid = new Map<string, number[]>();
  const cellOf = (i: number) => [Math.floor(stops[i][2] / GRID_DEG), Math.floor(stops[i][3] / GRID_DEG)] as const;
  stops.forEach((_, i) => {
    const key = cellOf(i).join(':');
    const list = grid.get(key);
    if (list) list.push(i); else grid.set(key, [i]);
  });
  for (let a = 0; a < n; a++) {
    const [cy, cx] = cellOf(a);
    const near: Array<[number, number]> = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      for (const b of grid.get(`${cy + dy}:${cx + dx}`) ?? []) {
        if (b === a) continue;
        const d = haversineMeters(stops[a][2], stops[a][3], stops[b][2], stops[b][3]);
        if (d <= FOOTPATH_RADIUS_M) near.push([d, b]);
      }
    }
    near.sort((x, y) => x[0] - y[0]);
    near.forEach(([, b], rank) => {
      if (rank >= FOOTPATH_MAX_NEIGHBOURS && stops[a][1] !== stops[b][1]) return;
      const [sec, meters] = walkOf(a, b);
      const gate = isRailStopId(stops[a][0]) || isRailStopId(stops[b][0]) ? RAIL_GATE_SEC : 0;
      put(a, [b, sec + gate, meters, 0]);
    });
  }

  const start = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) start[i + 1] = start[i] + edges[i].size;
  const total = start[n];
  const table: FootpathTable = {
    start, to: new Int32Array(total), sec: new Float32Array(total), meters: new Int32Array(total), flags: new Uint8Array(total)
  };
  for (let i = 0; i < n; i++) {
    let k = start[i];
    for (const [to, sec, meters, flags] of edges[i].values()) {
      table.to[k] = to; table.sec[k] = sec; table.meters[k] = meters; table.flags[k] = flags; k++;
    }
  }
  return table;
}
