/**
 * Plans a trip and measures its first option against the real feed, exactly as the app does when a row is opened.
 * Run: npx vite-node scripts/live-eta/try-live.ts "<from stop id>" "<to stop id>"
 */
import fs from 'node:fs';
import { measureOption } from '../../src/lib/live/measure';
import { Planner } from '../../src/lib/router/v2/planner';
import { secondsOfDay } from '../../src/lib/router/v2/time-model';
import { toPlanView } from '../../src/lib/router/v2/to-itinerary';
import type { NetworkV2 } from '../../src/types/network-v2';

// The app fetches the shapes over HTTP; here they come from the file
globalThis.fetch = (async () => new Response(fs.readFileSync('public/data/shapes-v2.json'))) as typeof fetch;

const net = JSON.parse(fs.readFileSync('public/data/network-v2.json', 'utf-8')) as NetworkV2;
const planner = new Planner(net);
const place = (id: string) => {
  const i = planner.ix.stopIndex(id);
  if (i < 0) throw new Error(`unknown stop ${id}`);
  return { lat: net.stops[i][2], lon: net.stops[i][3], name: net.stops[i][1], stopIndex: i };
};
const origin = place(process.argv[2] ?? 'tj:G00436');
const destination = place(process.argv[3] ?? 'tj:G00074');
const now = new Date();
const view = toPlanView(planner.ix, planner.plan({ origin, destination, departAt: now }), secondsOfDay(now), origin, destination);

for (const option of view.itineraries.slice(0, 3)) {
  const first = option.legs.find(l => l.type === 'TRANSIT');
  console.log(`\n${origin.name} > ${destination.name}: ${option.totalDurationMinutes} min planned, first ride ${first?.lineNames?.join('/')} from ${first?.fromStopName}, typical wait ${Math.round((first?.waitSeconds ?? 0) / 60)} min`);
  const live = await measureOption(option);
  if (!live) { console.log('  no live figure (rail, or the feed gave nothing)'); continue; }
  const leg = live.legs[0];
  const min = (s?: number) => (s === undefined ? 'none seen' : `${Math.round(s / 60)} min`);
  console.log(`  buses coming: ${leg.busesComing} | next bus ${min(leg.nextBusSec)} | then ${min(leg.followingBusSec)} | total now ${live.totalMinutes} min`);
}
process.exit(0);
