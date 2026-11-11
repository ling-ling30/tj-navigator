/** Geometry helpers for the graph builder. */

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export interface Shape {
  lat: Float64Array;
  lon: Float64Array;
  /** Cumulative distance in metres at each point. */
  cum: Float64Array;
}

export function makeShape(points: Array<[number, number]>): Shape {
  const n = points.length;
  const lat = new Float64Array(n);
  const lon = new Float64Array(n);
  const cum = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    lat[i] = points[i][0];
    lon[i] = points[i][1];
    if (i > 0) cum[i] = cum[i - 1] + haversineMeters(lat[i - 1], lon[i - 1], lat[i], lon[i]);
  }
  return { lat, lon, cum };
}

/** Distance from a point to segment j of the shape, and how far along the segment the nearest point lies (0..1). */
function pointToSegment(shape: Shape, j: number, lat: number, lon: number): { dist: number; t: number } {
  // Local flat approximation: fine for segments of a few hundred metres.
  const cosLat = Math.cos(toRad(lat));
  const ax = (shape.lon[j] - lon) * cosLat;
  const ay = shape.lat[j] - lat;
  const bx = (shape.lon[j + 1] - lon) * cosLat;
  const by = shape.lat[j + 1] - lat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  const px = ax + t * dx;
  const py = ay + t * dy;
  const metresPerDegree = (Math.PI / 180) * EARTH_RADIUS_M;
  return { dist: Math.sqrt(px * px + py * py) * metresPerDegree, t };
}

export interface Projection {
  /** Metres along the shape. */
  pos: number;
  /** Segment index, to continue the search from. */
  seg: number;
  /** Distance from the stop to the shape. */
  offset: number;
}

/**
 * Project a stop onto the shape at or after segment `fromSeg`.
 * Takes the first place where the shape passes within `nearM` of the stop and follows it to its local
 * minimum, so that on out-and-back routes the outbound stop is not matched to the return leg.
 * Falls back to the closest point after `fromSeg` when the shape never comes that near.
 */
export function projectForward(shape: Shape, fromSeg: number, lat: number, lon: number, nearM: number): Projection {
  const last = shape.lat.length - 2;
  let best: Projection | null = null;
  let inside = false;
  for (let j = Math.max(0, fromSeg); j <= last; j++) {
    const { dist, t } = pointToSegment(shape, j, lat, lon);
    const pos = shape.cum[j] + t * (shape.cum[j + 1] - shape.cum[j]);
    if (dist <= nearM) {
      inside = true;
      if (!best || dist < best.offset) best = { pos, seg: j, offset: dist };
    } else if (inside) {
      break; // left the first near stretch: keep its minimum
    } else if (!best || dist < best.offset) {
      best = { pos, seg: j, offset: dist };
    }
  }
  return best ?? { pos: 0, seg: 0, offset: Infinity };
}
