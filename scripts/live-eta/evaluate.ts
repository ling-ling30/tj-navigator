/**
 * Scores arrival-time estimates on a recorded session of the live bus feed.
 * For every operator ETA in the recording it finds when the bus really reached that stop, then compares:
 *   operator : the ETA the feed publishes (whole minutes)
 *   own-speed: remaining distance ÷ the bus's own speed over the last two minutes
 *   class    : remaining distance ÷ the calibrated speed of the service class
 *   traffic  : remaining distance at the speed buses actually drove each stretch in the last ten minutes
 * Run: npx vite-node scripts/live-eta/evaluate.ts [recording.ndjson]
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { projectForward, type Shape } from '../graph-v2/geo.ts';
import { loadGtfs } from '../graph-v2/gtfs-load.ts';

const FILE = process.argv[2] ?? fs.readdirSync('scripts/diag/recordings').filter(f => f.startsWith('eta-')).sort().map(f => `scripts/diag/recordings/${f}`).pop()!;
const SAMPLE_EVERY = 12; // score one operator snapshot in this many, to keep the run short
const ARRIVE_BEFORE_M = 20;
const OFF_ROUTE_M = 100;
const STEP_M = 50;
const WINDOW_SEC = 600;
const LAYOVER_SEC = 120;
const CELL_DEG = 0.0015;
const CLASS_SPEED_MPS: Record<string, number> = { BRT: 22 / 3.6, Mikrotrans: 16 / 3.6 };
const DEFAULT_SPEED_MPS = 18 / 3.6;
const HORIZONS: Array<[string, number, number]> = [['0-2 min', 0, 120], ['2-5 min', 120, 300], ['5-10 min', 300, 600], ['10-20 min', 600, 1200]];

const gtfs = loadGtfs('tmp_gtfs');
const routeDesc = new Map(gtfs.routes.map(r => [r.route_id, r.route_desc]));

interface Track { shape: Shape; stopIds: string[]; stopPos: number[]; stopSeg: number[]; classSpeed: number }
const tracks = new Map<string, Track | null>();
function trackOf(tripId: string): Track | null {
  if (tracks.has(tripId)) return tracks.get(tripId)!;
  const trip = gtfs.trips.get(tripId);
  const shape = trip && gtfs.shapes.get(trip.shapeId);
  const stopIds = gtfs.tripStops.get(tripId);
  let track: Track | null = null;
  if (trip && shape && stopIds) {
    const stopPos: number[] = [];
    const stopSeg: number[] = [];
    let seg = 0;
    for (const id of stopIds) {
      const s = gtfs.stops.get(id);
      const p = s ? projectForward(shape, seg, s.lat, s.lon, 60) : { pos: stopPos[stopPos.length - 1] ?? 0, seg, offset: 0 };
      stopPos.push(Math.max(p.pos, stopPos[stopPos.length - 1] ?? 0));
      stopSeg.push(p.seg);
      seg = p.seg;
    }
    track = { shape, stopIds, stopPos, stopSeg, classSpeed: CLASS_SPEED_MPS[routeDesc.get(trip.routeId) ?? ''] ?? DEFAULT_SPEED_MPS };
  }
  tracks.set(tripId, track);
  return track;
}

/** Cell of the point `dist` metres along the shape: a ~165 m square plus one of eight headings. */
function cellAt(shape: Shape, dist: number): number {
  let lo = 0, hi = shape.cum.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (shape.cum[mid] <= dist) lo = mid; else hi = mid; }
  const span = shape.cum[hi] - shape.cum[lo] || 1;
  const f = Math.min(1, Math.max(0, (dist - shape.cum[lo]) / span));
  const lat = shape.lat[lo] + f * (shape.lat[hi] - shape.lat[lo]);
  const lon = shape.lon[lo] + f * (shape.lon[hi] - shape.lon[lo]);
  const heading = Math.atan2(shape.lon[hi] - shape.lon[lo], shape.lat[hi] - shape.lat[lo]);
  const sector = ((Math.round(heading / (Math.PI / 4)) % 8) + 8) % 8;
  return (Math.round((lat + 7) / CELL_DEG) * 4096 + Math.round((lon - 106) / CELL_DEG)) * 8 + sector;
}

interface Run { trip: string; track: Track; t: number[]; s: number[]; arrivals: Map<number, number> }
const runsOfBus = new Map<string, Run[]>();
/** cell → observations [time, metres, seconds], later sorted by time */
const cells = new Map<number, number[][]>();
const snapshots: Array<[number, string, string, Array<[string, number]>]> = [];

function observe(track: Track, t: number, s1: number, s2: number, dt: number): void {
  const add = (dist: number, ds: number, sec: number) => {
    const key = cellAt(track.shape, dist);
    const list = cells.get(key);
    if (list) list.push([t, ds, sec]); else cells.set(key, [[t, ds, sec]]);
  };
  const ds = s2 - s1;
  if (ds < 1) { add(s1, 0, dt); return; }
  for (let d = s1; d < s2; d += STEP_M) {
    const part = Math.min(STEP_M, s2 - d);
    add(d + part / 2, part, (dt * part) / ds);
  }
}

async function read(): Promise<void> {
  const state = new Map<string, { run: Run; seg: number; nextStop: number; still: number }>();
  let snapshotCount = 0;
  for await (const line of readline.createInterface({ input: fs.createReadStream(FILE) })) {
    const rec = JSON.parse(line);
    if (rec.e) { if (snapshotCount++ % SAMPLE_EVERY === 0) snapshots.push(rec.e); continue; }
    const [t, bus, trip, lat, lon, next] = rec.p as [number, string, string, number, number, string];
    const track = trackOf(trip);
    if (!track) { state.delete(bus); continue; }
    let st = state.get(bus);
    if (!st || st.run.trip !== trip) {
      // Place the bus on its route with the help of the stop it says is next
      let best = projectForward(track.shape, 0, lat, lon, 40);
      track.stopIds.forEach((id, k) => {
        if (id !== next) return;
        const p = projectForward(track.shape, k > 0 ? track.stopSeg[k - 1] : 0, lat, lon, 40);
        if (p.offset < best.offset + 15 && p.pos <= track.stopPos[k] + 40) best = p;
      });
      if (best.offset > OFF_ROUTE_M) { state.delete(bus); continue; }
      const run: Run = { trip, track, t: [t], s: [best.pos], arrivals: new Map() };
      const list = runsOfBus.get(bus);
      if (list) list.push(run); else runsOfBus.set(bus, [run]);
      st = { run, seg: best.seg, nextStop: track.stopPos.findIndex(p => p > best.pos + ARRIVE_BEFORE_M), still: 0 };
      state.set(bus, st);
      continue;
    }
    const run = st.run;
    const prevT = run.t[run.t.length - 1];
    const prevS = run.s[run.s.length - 1];
    const dt = t - prevT;
    if (dt <= 0) continue;
    const p = projectForward(track.shape, Math.max(0, st.seg - 1), lat, lon, 40);
    if (p.offset > OFF_ROUTE_M || p.pos < prevS - 80 || dt > 180) { state.delete(bus); continue; }
    const s = Math.max(prevS, p.pos);
    st.seg = p.seg;
    st.still = s - prevS < 1 ? st.still + dt : 0;
    if (st.still <= LAYOVER_SEC) observe(track, t, prevS, s, dt); // a long standstill is a layover, not traffic
    while (st.nextStop >= 0 && st.nextStop < track.stopPos.length && s >= track.stopPos[st.nextStop] - ARRIVE_BEFORE_M) {
      const target = track.stopPos[st.nextStop] - ARRIVE_BEFORE_M;
      run.arrivals.set(st.nextStop, s > prevS ? prevT + (dt * Math.max(0, target - prevS)) / (s - prevS) : t);
      st.nextStop++;
    }
    run.t.push(t);
    run.s.push(s);
  }
  for (const list of cells.values()) list.sort((a, b) => a[0] - b[0]);
}

function positionAt(run: Run, t: number): number | null {
  if (t < run.t[0] || t > run.t[run.t.length - 1]) return null;
  let lo = 0, hi = run.t.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (run.t[mid] <= t) lo = mid; else hi = mid; }
  const span = run.t[hi] - run.t[lo];
  return span > 0 ? run.s[lo] + ((run.s[hi] - run.s[lo]) * (t - run.t[lo])) / span : run.s[lo];
}

function cellSpeed(key: number, t0: number, fallback: number): number {
  const list = cells.get(key);
  if (!list) return fallback;
  let lo = 0, hi = list.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid][0] < t0 - WINDOW_SEC) lo = mid + 1; else hi = mid; }
  let metres = 0, seconds = 0;
  for (let i = lo; i < list.length && list[i][0] < t0; i++) { metres += list[i][1]; seconds += list[i][2]; }
  return seconds >= 20 && metres > 0 ? Math.max(1, metres / seconds) : fallback;
}

const MODELS = ['operator', 'own-speed', 'class', 'traffic'] as const;
const errors: Record<string, number[][]> = Object.fromEntries(MODELS.map(m => [m, HORIZONS.map(() => [])]));

function score(): void {
  for (const [t0, bus, trip, etas] of snapshots) {
    const run = (runsOfBus.get(bus) ?? []).find(r => r.trip === trip && t0 >= r.t[0] && t0 <= r.t[r.t.length - 1]);
    const s0 = run && positionAt(run, t0);
    if (!run || s0 == null) continue;
    const { track } = run;
    const earlier = positionAt(run, t0 - 120);
    const ownSpeed = earlier == null ? null : Math.min(17, Math.max(1.5, (s0 - earlier) / 120));
    let k = track.stopPos.findIndex(p => p > s0 + ARRIVE_BEFORE_M);
    if (k < 0) continue;
    // Time along the route at traffic speed, accumulated once and read off at each stop
    let walked = s0, trafficSec = 0;
    for (const [stopId, etaMin] of etas) {
      while (k < track.stopIds.length && track.stopIds[k] !== stopId) k++;
      if (k >= track.stopIds.length) break;
      const arrival = run.arrivals.get(k);
      const target = track.stopPos[k] - ARRIVE_BEFORE_M;
      while (walked < target) {
        const part = Math.min(STEP_M, target - walked);
        trafficSec += part / cellSpeed(cellAt(track.shape, walked + part / 2), t0, track.classSpeed);
        walked += part;
      }
      if (arrival === undefined) { k++; continue; }
      const actual = arrival - t0;
      const h = HORIZONS.findIndex(([, from, to]) => actual > from && actual <= to);
      if (h >= 0) {
        const dist = Math.max(0, target - s0);
        errors.operator[h].push(etaMin * 60 - actual);
        if (ownSpeed != null) errors['own-speed'][h].push(dist / ownSpeed - actual);
        errors.class[h].push(dist / track.classSpeed - actual);
        errors.traffic[h].push(trafficSec - actual);
      }
      k++;
    }
  }
}

const pct = (values: number[], p: number) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
const mins = (sec: number) => (sec / 60).toFixed(1).padStart(5);

await read();
score();
console.log(`Recording ${FILE}`);
console.log(`buses placed on a route: ${runsOfBus.size} | snapshots scored: ${snapshots.length} | traffic cells: ${cells.size}`);
console.log('\nError = estimate minus what really happened, in minutes. "typical" = median size of the error; "bad" = 90th percentile.');
HORIZONS.forEach(([label], h) => {
  console.log(`\nBus really arrives in ${label}  (${errors.operator[h].length} cases)`);
  for (const m of MODELS) {
    const e = errors[m][h];
    const abs = e.map(Math.abs);
    console.log(`  ${m.padEnd(10)} typical ${mins(pct(abs, 0.5))}  bad ${mins(pct(abs, 0.9))}  bias ${mins(pct(e, 0.5))}`);
  }
});
