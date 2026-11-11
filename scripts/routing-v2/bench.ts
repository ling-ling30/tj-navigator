/**
 * Routing benchmark: golden trips, variety, directness, sanity and speed.
 * Run: npx vite-node scripts/routing-v2/bench.ts     (exit code 1 when a golden trip fails)
 * Targets: docs/ROUTING-V2-SPEC.md, section 9.
 */
import fs from 'node:fs';
import { haversineMeters } from '../../src/lib/router/v2/footpaths';
import type { PlanOption, RideLeg } from '../../src/lib/router/v2/option';
import { Planner, type PlaceInput, type PlanQuery, type PlanResult } from '../../src/lib/router/v2/planner';
import { ModeGroup, type NetworkV2 } from '../../src/types/network-v2';
import { describeResult } from './describe';

const net = JSON.parse(fs.readFileSync('public/data/network-v2.json', 'utf-8')) as NetworkV2;
const planner = new Planner(net);
const ix = planner.ix;
const VERBOSE = process.argv.includes('--verbose');

const stop = (id: string): PlaceInput => {
  const i = ix.stopIndex(id);
  if (i < 0) throw new Error(`unknown stop ${id}`);
  return { lat: net.stops[i][2], lon: net.stops[i][3], name: net.stops[i][1], stopIndex: i };
};
const stopNamed = (name: string): PlaceInput => {
  const i = net.stops.findIndex(s => s[1] === name && s[4] !== '');
  if (i < 0) throw new Error(`no halte named ${name}`);
  return stop(net.stops[i][0]);
};
const point = (lat: number, lon: number): PlaceInput => ({ lat, lon });
/** Wednesday 11 Nov 2026 */
const at = (h: number, m = 0) => new Date(2026, 10, 11, h, m);

const rides = (o: PlanOption) => o.legs.filter((l): l is RideLeg => l.kind === 'ride');
const names = (leg: RideLeg) => leg.lines.map(l => net.lines[l][1]);
const usesInOrder = (o: PlanOption, first: string[], then: string[]) => {
  const r = rides(o);
  const a = r.findIndex(leg => names(leg).some(n => first.includes(n)));
  return a >= 0 && r.slice(a + 1).some(leg => names(leg).some(n => then.includes(n)));
};
const isRail = (leg: RideLeg) => ix.lineMode[leg.lines[0]] >= ModeGroup.KRL;

interface Golden { title: string; query: PlanQuery; check: (r: PlanResult) => boolean }
const CORRIDOR_9_FAMILY = ['9', '9A', '9E', '7R', '9ST'];
const GOLDEN: Golden[] = [
  { title: 'Owner commute, stop to stop: express bus then corridor 9 family, in the first two options',
    query: { origin: stop('tj:B08106P'), destination: stop('tj:G00074'), departAt: at(7) },
    check: r => r.options.slice(0, 2).some(o => usesInOrder(o, ['S61', 'S11'], CORRIDOR_9_FAMILY)) },
  { title: 'Owner commute, point to point',
    query: { origin: point(-6.236, 106.657), destination: point(-6.124, 106.791), departAt: at(7) },
    check: r => r.options.slice(0, 2).some(o => usesInOrder(o, ['S61', 'S11'], CORRIDOR_9_FAMILY)) },
  { title: 'Owner commute back in the evening',
    query: { origin: stop('tj:G00075'), destination: stop('tj:B08106P'), departAt: at(17, 30) },
    check: r => r.options.slice(0, 2).some(o => usesInOrder(o, CORRIDOR_9_FAMILY, ['S61', 'S11'])) },
  { title: 'Blok M > Kota: corridor 1 direct is the first option',
    query: { origin: stopNamed('Blok M'), destination: stopNamed('Kota'), departAt: at(10) },
    check: r => r.options.length > 0 && r.options[0].transfers === 0 && names(rides(r.options[0])[0]).includes('1') },
  { title: 'Lebak Bulus > Bundaran HI: MRT direct is the first option',
    query: { origin: stop('mrt:LBB'), destination: stop('mrt:BHI'), departAt: at(8) },
    check: r => r.options.length > 0 && r.options[0].transfers === 0 && names(rides(r.options[0])[0]).includes('M') },
  { title: 'Bogor > Jakarta Kota: KRL direct is the first option',
    query: { origin: stop('krl:BOG'), destination: stop('krl:JAK'), departAt: at(8) },
    check: r => r.options.length > 0 && r.options[0].transfers === 0 && names(rides(r.options[0])[0]).includes('B') },
  { title: 'Direct only is respected',
    query: { origin: stop('krl:TEB'), destination: point(-6.2443, 106.8006), departAt: at(12), options: { maxTransfers: 0 } },
    check: r => r.options.every(o => o.transfers === 0) },
  { title: 'Rail only is respected',
    query: { origin: stop('krl:BKS'), destination: stop('mrt:BHI'), departAt: at(7, 30), modes: [ModeGroup.KRL, ModeGroup.MRT, ModeGroup.LRT] },
    check: r => r.options.length > 0 && !r.modesGaveNothing && r.options.every(o => rides(o).every(isRail)) },
  { title: 'Bus only from a rail station still answers, and suggests rail',
    query: { origin: stop('krl:BKS'), destination: stop('mrt:BHI'), departAt: at(7, 30), modes: [ModeGroup.BRT, ModeGroup.BUS] },
    check: r => r.options.length > 0 && r.options.every(o => rides(o).every(l => !isRail(l))) && r.suggestion !== undefined },
  { title: 'Same place',
    query: { origin: stop('krl:TEB'), destination: stop('krl:TEB'), departAt: at(9) },
    check: r => r.answerKind === 'same-place' },
  { title: 'Nothing runs at 02:30: still an answer kind, no crash',
    query: { origin: stop('tj:B08106P'), destination: stop('tj:G00074'), departAt: at(2, 30) },
    check: r => r.answerKind !== undefined }
];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(p * (sorted.length - 1))] : NaN;
};
const share = (n: number, of: number) => `${((100 * n) / of).toFixed(1)} %`;

let failed = 0;
console.log('GOLDEN TRIPS');
for (const g of GOLDEN) {
  const result = planner.plan(g.query);
  const ok = g.check(result);
  if (!ok) failed++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${g.title}`);
  if (!ok || VERBOSE) console.log(describeResult(ix, g.title, result));
}

// Two stops on one running pattern: the direct ride must be offered, unless something clearly beats it
const rand = mulberry32(42);
const running = ix.patternFrequencies(1, 8 * 3600);
const runningPatterns = [...running.keys()].filter(p => running[p] > 0 && net.patterns[p][3].length >= 6);
let directOffered = 0;
const DIRECT_SAMPLES = 200;
const directMisses: string[] = [];
for (let n = 0; n < DIRECT_SAMPLES; n++) {
  const p = runningPatterns[Math.floor(rand() * runningPatterns.length)];
  const seq = net.patterns[p][3];
  const i = Math.floor(rand() * (seq.length - 3));
  const j = i + 2 + Math.floor(rand() * (seq.length - i - 2));
  if (seq[i] === seq[j]) { directOffered++; continue; }
  const r = planner.plan({ origin: stop(net.stops[seq[i]][0]), destination: stop(net.stops[seq[j]][0]), departAt: at(8) });
  const line = net.patterns[p][0];
  const hasDirect = r.options.some(o => rides(o).length === 1);
  const walkable = r.options.some(o => rides(o).length === 0);
  if (hasDirect || walkable) directOffered++;
  else directMisses.push(`${net.lines[line][1]}: ${net.stops[seq[i]][1]} > ${net.stops[seq[j]][1]}`);
}

// Random pairs at least 3 km apart
const PAIRS = 300;
const MIN_STRAIGHT_M = 3000;
const optionCounts: number[] = [];
const circuity: number[] = [];
const millis: number[] = [];
const kinds: Record<string, number> = {};
let doubleWalks = 0;
let empty = 0;
for (let n = 0; n < PAIRS; ) {
  const a = Math.floor(rand() * net.stops.length);
  const b = Math.floor(rand() * net.stops.length);
  const straight = haversineMeters(net.stops[a][2], net.stops[a][3], net.stops[b][2], net.stops[b][3]);
  if (straight < MIN_STRAIGHT_M) continue;
  n++;
  const started = performance.now();
  const r = planner.plan({ origin: stop(net.stops[a][0]), destination: stop(net.stops[b][0]), departAt: at(8) });
  millis.push(performance.now() - started);
  kinds[r.answerKind] = (kinds[r.answerKind] ?? 0) + 1;
  const transit = r.options.filter(o => rides(o).length > 0);
  if (r.options.length === 0) empty++;
  optionCounts.push(r.answerKind === 'direct' ? transit.length : 0);
  if (r.answerKind === 'direct' && transit.length > 0) circuity.push((transit[0].rideMeters + transit[0].walkMeters) / straight);
  for (const o of r.options) {
    if (o.legs.some((leg, k) => k > 0 && leg.kind === 'walk' && o.legs[k - 1].kind === 'walk')) doubleWalks++;
  }
}

console.log('\nDIRECT RIDE ON ONE LINE');
console.log(`  a direct ride (on any line) offered for ${share(directOffered, DIRECT_SAMPLES)} of ${DIRECT_SAMPLES} pairs on one pattern (target 100 %)`);
directMisses.slice(0, 8).forEach(m => console.log(`    miss: ${m}`));
console.log(`\nVARIETY on ${PAIRS} random pairs at least ${MIN_STRAIGHT_M / 1000} km apart, weekday 08:00`);
console.log(`  2+ options ${share(optionCounts.filter(c => c >= 2).length, PAIRS)} (target 60 %) | 3+ options ${share(optionCounts.filter(c => c >= 3).length, PAIRS)} (target 30 %) | 5+ options ${share(optionCounts.filter(c => c >= 5).length, PAIRS)}`);
console.log(`  answer kinds ${JSON.stringify(kinds)} | no option at all ${empty}`);
console.log(`DIRECTNESS  circuity of the first option p50 ${percentile(circuity, 0.5).toFixed(2)} | p90 ${percentile(circuity, 0.9).toFixed(2)} (target p90 2.0)`);
console.log(`SANITY  options with two walks in a row ${doubleWalks} (target 0)`);
console.log(`SPEED  full query p50 ${percentile(millis, 0.5).toFixed(0)} ms | p95 ${percentile(millis, 0.95).toFixed(0)} ms (target p95 150 ms)`);
console.log(`\n${failed === 0 ? 'ALL GOLDEN TRIPS PASS' : `${failed} GOLDEN TRIP(S) FAIL`}`);
process.exit(failed === 0 ? 0 : 1);
