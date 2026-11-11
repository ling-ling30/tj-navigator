/**
 * Prints the options for a handful of real trips. Run: npx vite-node scripts/routing-v2/show.ts
 * Optional argument: a number to show only that trip.
 */
import fs from 'node:fs';
import { Planner, type PlaceInput, type PlanQuery } from '../../src/lib/router/v2/planner';
import { ModeGroup, type NetworkV2 } from '../../src/types/network-v2';
import { describeResult } from './describe';

const net = JSON.parse(fs.readFileSync('public/data/network-v2.json', 'utf-8')) as NetworkV2;
const planner = new Planner(net);
const ix = planner.ix;

const stop = (id: string): PlaceInput => {
  const index = ix.stopIndex(id);
  if (index < 0) throw new Error(`unknown stop ${id}`);
  const s = net.stops[index];
  return { lat: s[2], lon: s[3], name: s[1], stopIndex: index };
};
const point = (lat: number, lon: number, name: string): PlaceInput => ({ lat, lon, name });
/** Wednesday 11 Nov 2026 */
const at = (h: number, m = 0) => new Date(2026, 10, 11, h, m);

const TRIPS: Array<{ title: string; query: PlanQuery }> = [
  { title: 'Owner commute, stop to stop: Flavor Bliss > Penjaringan, 07:00',
    query: { origin: stop('tj:B08106P'), destination: stop('tj:G00074'), departAt: at(7) } },
  { title: 'Owner commute, point to point (Alam Sutera > Penjaringan), 07:00',
    query: { origin: point(-6.236, 106.657, 'Rumah'), destination: point(-6.124, 106.791, 'Kantor'), departAt: at(7) } },
  { title: 'Owner commute back: Penjaringan > Flavor Bliss, 17:30',
    query: { origin: stop('tj:G00075'), destination: stop('tj:B08106P'), departAt: at(17, 30) } },
  { title: 'Lebak Bulus > Bundaran HI (MRT), 08:00',
    query: { origin: stop('mrt:LBB'), destination: stop('mrt:BHI'), departAt: at(8) } },
  { title: 'Bogor > Jakarta Kota (KRL), 08:00',
    query: { origin: stop('krl:BOG'), destination: stop('krl:JAK'), departAt: at(8) } },
  { title: 'Bekasi station > Bundaran HI, 07:30',
    query: { origin: stop('krl:BKS'), destination: stop('mrt:BHI'), departAt: at(7, 30) } },
  { title: 'Bekasi station > Bundaran HI, BRT + Bus only',
    query: { origin: stop('krl:BKS'), destination: stop('mrt:BHI'), departAt: at(7, 30), modes: [ModeGroup.BRT, ModeGroup.BUS] } },
  { title: 'Tebet station > Blok M, 12:00',
    query: { origin: stop('krl:TEB'), destination: point(-6.2443, 106.8006, 'Blok M'), departAt: at(12) } },
  { title: 'Kota Bambu > Penjaringan, direct only',
    query: { origin: stop('tj:G00436'), destination: stop('tj:G00074'), departAt: at(12), options: { maxTransfers: 0 } } }
];

const only = process.argv[2] && process.argv[2] !== "adhoc" ? Number(process.argv[2]) : process.argv[2] === "adhoc" ? -1 : null;
TRIPS.forEach((trip, i) => {
  if (only !== null && only !== i + 1) return;
  const started = performance.now();
  const result = planner.plan(trip.query);
  console.log(describeResult(ix, `${i + 1}. ${trip.title}`, result), `\n  (${(performance.now() - started).toFixed(0)} ms)`);
});

// Ad-hoc query: npx vite-node scripts/routing-v2/show.ts adhoc "<stop name or id>" "<stop name or id>" [HH:MM]
if (process.argv[2] === 'adhoc') {
  const find = (q: string): PlaceInput => {
    const i = net.stops.findIndex(s => s[0] === q || s[1] === q);
    if (i < 0) throw new Error(`no stop "${q}"`);
    return stop(net.stops[i][0]);
  };
  const [h, m] = (process.argv[5] ?? '08:00').split(':').map(Number);
  const query: PlanQuery = { origin: find(process.argv[3]), destination: find(process.argv[4]), departAt: at(h, m) };
  console.log(describeResult(ix, `${process.argv[3]} > ${process.argv[4]}`, planner.plan(query)));
}
