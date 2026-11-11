/** Route geometry per pattern (shapes-v2.json), loaded on first use and decoded one pattern at a time. */

const SHAPES_URL = '/data/shapes-v2.json';
const EARTH_RADIUS_M = 6_371_000;
const RAD = Math.PI / 180;

export interface PatternShape {
  lat: Float64Array;
  lon: Float64Array;
  /** Metres along the route at each vertex. */
  cum: Float64Array;
  /** Vertex of each stop of the pattern. */
  stopVertex: number[];
}

interface ShapesFile { patterns: Array<[string, number[]]> }

let file: Promise<ShapesFile> | null = null;
const decoded = new Map<number, PatternShape>();

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lon2 - lon1) * RAD) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Google polyline decoding, precision 5. */
function decode(text: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let i = 0, lat = 0, lon = 0;
  const next = () => {
    let shift = 0, result = 0, byte: number;
    do { byte = text.charCodeAt(i++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < text.length) { lat += next(); lon += next(); points.push([lat / 1e5, lon / 1e5]); }
  return points;
}

export async function shapeOf(pattern: number): Promise<PatternShape | null> {
  const known = decoded.get(pattern);
  if (known) return known;
  if (!file) {
    file = fetch(SHAPES_URL).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching route shapes`);
      return res.json() as Promise<ShapesFile>;
    });
    file.catch(() => { file = null; });
  }
  const entry = (await file).patterns[pattern];
  if (!entry) return null;
  const points = decode(entry[0]);
  const shape: PatternShape = {
    lat: Float64Array.from(points, p => p[0]),
    lon: Float64Array.from(points, p => p[1]),
    cum: new Float64Array(points.length),
    stopVertex: entry[1]
  };
  for (let v = 1; v < points.length; v++) {
    shape.cum[v] = shape.cum[v - 1] + haversine(shape.lat[v - 1], shape.lon[v - 1], shape.lat[v], shape.lon[v]);
  }
  decoded.set(pattern, shape);
  return shape;
}

export interface Placement { metres: number; offset: number }

/** Nearest point of the route to a position, searched between two vertices. `metres` is the distance along the route. */
export function place(shape: PatternShape, lat: number, lon: number, fromVertex: number, toVertex: number): Placement {
  const k = Math.cos(lat * RAD);
  const metresPerDegree = RAD * EARTH_RADIUS_M;
  let best: Placement = { metres: shape.cum[fromVertex], offset: Infinity };
  for (let v = Math.max(0, fromVertex); v < Math.min(toVertex, shape.lat.length - 1); v++) {
    const ax = (shape.lon[v] - lon) * k, ay = shape.lat[v] - lat;
    const dx = (shape.lon[v + 1] - shape.lon[v]) * k, dy = shape.lat[v + 1] - shape.lat[v];
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const offset = Math.hypot(ax + t * dx, ay + t * dy) * metresPerDegree;
    if (offset < best.offset) best = { metres: shape.cum[v] + t * (shape.cum[v + 1] - shape.cum[v]), offset };
  }
  return best;
}

/** The vertex at or just before a distance along the route. */
export function vertexAt(shape: PatternShape, metres: number): number {
  let lo = 0, hi = shape.cum.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (shape.cum[mid] <= metres) lo = mid; else hi = mid; }
  return lo;
}
