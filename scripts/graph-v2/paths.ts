/**
 * Route geometry per pattern, for the map and for placing live buses on their route.
 * Each pattern becomes one polyline that passes exactly through its stops; `stopVertex[i]` is the vertex of stop i.
 */
import { haversineMeters, projectForward, type Shape } from './geo.ts';

export interface PatternPath { points: Array<[number, number]>; stopVertex: number[] }

const SHAPE_NEAR_M = 60;
const SHAPE_MAX_OFFSET_M = 150;
const SIMPLIFY_TOLERANCE_M = 8;
const MAX_DETOUR_RATIO = 5;
const MAX_DETOUR_SLACK_M = 500;

/** Distance from point p to the straight line a–b, in metres (flat approximation, fine at this scale). */
function offsetMeters(p: [number, number], a: [number, number], b: [number, number]): number {
  const k = Math.cos((p[0] * Math.PI) / 180);
  const ax = (a[1] - p[1]) * k, ay = a[0] - p[0];
  const bx = (b[1] - p[1]) * k, by = b[0] - p[0];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy) * 111_320;
}

/** Douglas–Peucker: drops points that bend the line by less than the tolerance. Keeps both ends. */
function simplify(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    let worst = -1;
    let worstOffset = SIMPLIFY_TOLERANCE_M;
    for (let i = from + 1; i < to; i++) {
      const d = offsetMeters(points[i], points[from], points[to]);
      if (d > worstOffset) { worstOffset = d; worst = i; }
    }
    if (worst >= 0) { keep[worst] = 1; stack.push([from, worst], [worst, to]); }
  }
  return points.filter((_, i) => keep[i]);
}

export function pathOf(shape: Shape | undefined, stops: Array<{ lat: number; lon: number }>): PatternPath {
  const projected: Array<{ pos: number; seg: number } | null> = [];
  if (shape) {
    let seg = 0;
    for (const s of stops) {
      const p = projectForward(shape, seg, s.lat, s.lon, SHAPE_NEAR_M);
      if (p.offset <= SHAPE_MAX_OFFSET_M) { projected.push(p); seg = p.seg; } else projected.push(null);
    }
  }
  const points: Array<[number, number]> = [[stops[0].lat, stops[0].lon]];
  const stopVertex = [0];
  for (let i = 0; i + 1 < stops.length; i++) {
    const a = projected[i];
    const b = projected[i + 1];
    const end: [number, number] = [stops[i + 1].lat, stops[i + 1].lon];
    const straight = haversineMeters(stops[i].lat, stops[i].lon, end[0], end[1]);
    const along = a && b ? b.pos - a.pos : NaN;
    if (shape && a && b && along >= straight * 0.95 && along <= straight * MAX_DETOUR_RATIO + MAX_DETOUR_SLACK_M) {
      const between: Array<[number, number]> = [points[points.length - 1]];
      for (let j = a.seg + 1; j <= b.seg; j++) between.push([shape.lat[j], shape.lon[j]]);
      between.push(end);
      points.push(...simplify(between).slice(1));
    } else {
      points.push(end);
    }
    stopVertex.push(points.length - 1);
  }
  return { points, stopVertex };
}

/** Google polyline encoding, precision 5: about three characters per point instead of twenty. */
export function encodePolyline(points: Array<[number, number]>): string {
  let out = '';
  let prevLat = 0;
  let prevLon = 0;
  const pack = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) { out += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    out += String.fromCharCode(v + 63);
  };
  for (const [lat, lon] of points) {
    const la = Math.round(lat * 1e5);
    const lo = Math.round(lon * 1e5);
    pack(la - prevLat);
    pack(lo - prevLon);
    prevLat = la;
    prevLon = lo;
  }
  return out;
}
