/**
 * Replays the app's live measurement on a recording: at random moments it hands the app's own code the 15 seconds
 * of positions it would have heard at a stop, then checks the "next bus" time it reports against when a bus really came.
 * Run: npx vite-node scripts/live-eta/replay.ts [recording.ndjson]
 */
import fs from 'node:fs';
import readline from 'node:readline';
import type { BusSample } from '../../src/lib/live/feed';
import { BURST_MS, measureLeg, UPSTREAM_M } from '../../src/lib/live/measure';
import { place, shapeOf, vertexAt } from '../../src/lib/live/shapes';
import { NetworkIndex } from '../../src/lib/router/v2/network-index';
import type { NetworkV2 } from '../../src/types/network-v2';
import type { Leg } from '../../src/types/transit';

const FILE = process.argv[2] ?? 'scripts/diag/recordings/eta-202611110750.ndjson';
const CASES = 600;
const MAX_ATTEMPTS = CASES * 60;
const ON_ROUTE_M = 50;
const BURST_SEC = BURST_MS / 1000;
const HORIZONS: Array<[string, number, number]> = [['0-2 min', 0, 120], ['2-5 min', 120, 300], ['5-10 min', 300, 600], ['10-20 min', 600, 1200]];

// The app fetches the shapes over HTTP; here they come from the file
globalThis.fetch = (async () => new Response(fs.readFileSync('public/data/shapes-v2.json'))) as typeof fetch;

const net = JSON.parse(fs.readFileSync('public/data/network-v2.json', 'utf-8')) as NetworkV2;
const ix = new NetworkIndex(net);

/** route code → samples in time order: [t seconds, lat, lon, bus, next stop] */
const byRoute = new Map<string, Array<[number, number, number, string, string]>>();
let tMin = Infinity, tMax = 0;
for await (const line of readline.createInterface({ input: fs.createReadStream(FILE) })) {
  if (!line.startsWith('{"p"')) continue;
  const [t, bus, trip, lat, lon, next] = JSON.parse(line).p as [number, string, string, number, number, string];
  const route = trip.slice(0, trip.lastIndexOf('-'));
  const list = byRoute.get(route);
  if (list) list.push([t, lat, lon, bus, next]); else byRoute.set(route, [[t, lat, lon, bus, next]]);
  tMin = Math.min(tMin, t); tMax = Math.max(tMax, t);
}

let seed = 7;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pct = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };

const busPatterns = net.patterns.map((_, i) => i).filter(i => net.lines[net.patterns[i][0]][0].startsWith('tj:') && net.patterns[i][3].length >= 8);
const errors: number[][] = HORIZONS.map(() => []);
let cases = 0, noneSeen = 0, wrongNone = 0;

for (let attempt = 0; cases < CASES && attempt < MAX_ATTEMPTS; attempt++) {
  const pattern = busPatterns[Math.floor(rand() * busPatterns.length)];
  const route = net.lines[net.patterns[pattern][0]][0].slice(3);
  const samples = byRoute.get(route);
  const shape = await shapeOf(pattern);
  if (!samples || !shape) continue;
  const stops = net.patterns[pattern][3].length;
  const boardStop = 2 + Math.floor(rand() * (stops - 4));
  const alightStop = Math.min(stops - 1, boardStop + 4);
  const boardM = shape.cum[shape.stopVertex[boardStop]];
  const T = tMin + 60 + Math.floor(rand() * (tMax - tMin - 25 * 60));
  const now = T + BURST_SEC;

  // What really happened: the first bus of the line to reach the stop after the app finished listening
  const fromV = vertexAt(shape, Math.max(0, boardM - UPSTREAM_M - 2000));
  const toV = Math.min(shape.lat.length - 1, shape.stopVertex[boardStop] + 2);
  const before = new Map<string, number>();
  let arrival: number | undefined;
  for (const [t, lat, lon, bus] of samples) {
    if (t < T) continue;
    const p = place(shape, lat, lon, fromV, toV);
    if (p.offset > ON_ROUTE_M) continue;
    const prev = before.get(bus);
    before.set(bus, p.metres);
    if (t >= now && prev !== undefined && prev < boardM - 20 && p.metres >= boardM - 20) { arrival = t - now; break; }
  }

  let planned = 0;
  for (let pos = ix.patStart[pattern] + boardStop; pos < ix.patStart[pattern] + alightStop; pos++) planned += ix.posHopSecOffPeak[pos];
  const burst: BusSample[] = [];
  for (const [t, lat, lon, bus, next] of samples) if (t >= T && t < now) burst.push({ bus, route, lat, lon, next, t: t * 1000 });
  const approachStops = net.patterns[pattern][3].slice(0, boardStop + 1).map(s => net.stops[s][0].slice(3));
  const live = measureLeg(shape, { pattern, boardStop, alightStop, routes: [route], approachStops }, { durationSeconds: planned } as Leg, 0, burst);

  if (live.nextBusSec === undefined) {
    // Saying "no bus seen" is wrong when one in fact arrived within ten minutes
    if (arrival !== undefined || burst.length > 0) { cases++; noneSeen++; if (arrival !== undefined && arrival < 600) wrongNone++; }
    continue;
  }
  if (arrival === undefined) continue;
  const h = HORIZONS.findIndex(([, from, to]) => arrival! > from && arrival! <= to);
  if (h < 0) continue;
  cases++;
  errors[h].push(live.nextBusSec - arrival);
}

const m = (sec: number) => (sec / 60).toFixed(1);
console.log(`Recording ${FILE}`);
console.log(`stops tested: ${cases} (the app listens for ${BURST_SEC} s, then says when the next bus comes)`);
HORIZONS.forEach(([label], h) => {
  const e = errors[h];
  console.log(`  bus really comes in ${label.padEnd(9)} (${String(e.length).padStart(3)} cases): typical error ${m(pct(e.map(Math.abs), 0.5))} min, bad ${m(pct(e.map(Math.abs), 0.9))} min, bias ${m(pct(e, 0.5))} min`);
});
console.log(`  "no bus seen": ${noneSeen} cases, of which a bus did come within 10 minutes in ${wrongNone}`);
