/**
 * How fast are buses really moving on one stretch of one line, according to a recording of the live feed?
 * Run: npx vite-node scripts/live-eta/stretch.ts <recording.ndjson> <route id> "<from stop name>" "<to stop name>"
 * Example: npx vite-node scripts/live-eta/stretch.ts scripts/diag/recordings/eta-x.ndjson 9 "Penjaringan" "Grogol Reformasi"
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { projectForward } from '../graph-v2/geo.ts';
import { loadGtfs } from '../graph-v2/gtfs-load.ts';

const [file, routeId, fromName, toName] = process.argv.slice(2);
const NEAR_ROUTE_M = 60;
const gtfs = loadGtfs('tmp_gtfs');

interface Stretch { tripId: string; from: number; to: number; fromSeg: number }
const stretches = new Map<string, Stretch>();
for (const [tripId, trip] of gtfs.trips) {
  if (trip.routeId !== routeId) continue;
  const shape = gtfs.shapes.get(trip.shapeId);
  const stopIds = gtfs.tripStops.get(tripId);
  if (!shape || !stopIds) continue;
  const names = stopIds.map(id => gtfs.stops.get(id)?.name ?? '');
  const a = names.indexOf(fromName);
  const b = a < 0 ? -1 : names.indexOf(toName, a + 1);
  if (b < 0) continue;
  let seg = 0;
  const pos: number[] = [];
  const segs: number[] = [];
  stopIds.forEach(id => {
    const s = gtfs.stops.get(id)!;
    const p = projectForward(shape, seg, s.lat, s.lon, NEAR_ROUTE_M);
    pos.push(p.pos); segs.push(p.seg); seg = p.seg;
  });
  stretches.set(tripId, { tripId, from: pos[a], to: pos[b], fromSeg: Math.max(0, segs[a] - 2) });
}
if (stretches.size === 0) throw new Error(`no trip of route ${routeId} runs ${fromName} > ${toName}`);

/** bus → samples [time, metres along the route] inside the stretch */
const tracks = new Map<string, Array<[number, number]>>();
for await (const line of readline.createInterface({ input: fs.createReadStream(file) })) {
  if (!line.startsWith('{"p"')) continue;
  const [t, bus, trip, lat, lon] = JSON.parse(line).p as [number, string, string, number, number];
  const st = stretches.get(trip);
  if (!st) continue;
  const shape = gtfs.shapes.get(gtfs.trips.get(trip)!.shapeId)!;
  const p = projectForward(shape, st.fromSeg, lat, lon, NEAR_ROUTE_M);
  if (p.offset > NEAR_ROUTE_M || p.pos < st.from || p.pos > st.to) continue;
  const list = tracks.get(bus);
  if (list) list.push([t, p.pos]); else tracks.set(bus, [[t, p.pos]]);
}

let metres = 0;
let seconds = 0;
const perBus: string[] = [];
for (const [bus, samples] of tracks) {
  const dt = samples[samples.length - 1][0] - samples[0][0];
  const ds = Math.max(0, samples[samples.length - 1][1] - samples[0][1]);
  if (dt < 60) continue;
  metres += ds;
  seconds += dt;
  perBus.push(`${bus}: ${(ds / 1000).toFixed(2)} km in ${(dt / 60).toFixed(1)} min = ${((ds / dt) * 3.6).toFixed(1)} km/h`);
}
const length = [...stretches.values()][0].to - [...stretches.values()][0].from;
const speed = seconds > 0 ? metres / seconds : NaN;
console.log(`Route ${routeId}, ${fromName} > ${toName}: ${(length / 1000).toFixed(1)} km along the route`);
console.log(`buses seen on the stretch for a minute or more: ${perBus.length}`);
perBus.slice(0, 12).forEach(l => console.log('  ' + l));
console.log(`all buses together: ${(speed * 3.6).toFixed(1)} km/h, so the stretch takes about ${(length / speed / 60).toFixed(0)} min right now`);
