/**
 * Speed calibration: compares the model's end-to-end time on named routes with published travel times
 * (wayfinder/routing-v2/tickets/14-real-speed-references.md) and searches the street and toll speeds that fit best.
 * Run: npx vite-node scripts/routing-v2/calibrate.ts
 */
import fs from 'node:fs';
import { HopClass, hopClassOf, SPEED_KMH } from '../../src/lib/router/v2/time-model';
import type { NetworkV2 } from '../../src/types/network-v2';

const net = JSON.parse(fs.readFileSync('public/data/network-v2.json', 'utf-8')) as NetworkV2;

/** Published one-way times in minutes: [off-peak, peak], and the published one-way length in km. */
const PUBLISHED: Array<{ line: string; km: number; minutes: [number, number] }> = [
  { line: 'S61', km: 29.85, minutes: [70, 92.5] },
  { line: 'S11', km: 32, minutes: [87.5, 135] },
  { line: 'P11', km: 48, minutes: [87.5, 115] },
  { line: 'B51', km: 44.5, minutes: [105, 125] },
  { line: '1', km: 12.9, minutes: [34.4, 41.4] }
];

interface Split { line: string; headsign: string; km: number; byClass: Map<number, number>; minutes: [number, number] }

/** The pattern of the line whose length is closest to the published one-way length. */
function pick(line: string, km: number): Split | null {
  const lineIdx = net.lines.findIndex(l => l[1] === line);
  let best: Split | null = null;
  for (const p of net.patterns) {
    if (p[0] !== lineIdx) continue;
    const total = p[4].reduce((a, b) => a + b, 0) / 1000;
    if (best && Math.abs(total - km) >= Math.abs(best.km - km)) continue;
    const byClass = new Map<number, number>();
    for (const m of p[4]) {
      const c = hopClassOf(net.lines[lineIdx][6], m);
      byClass.set(c, (byClass.get(c) ?? 0) + m / 1000);
    }
    best = { line, headsign: p[2], km: total, byClass, minutes: [0, 0] };
  }
  return best;
}

const minutesOf = (s: Split, speed: (hopClass: number) => number) =>
  [...s.byClass].reduce((sum, [c, km]) => sum + (km / speed(c)) * 60, 0);

const splits: Split[] = [];
for (const pub of PUBLISHED) {
  const s = pick(pub.line, pub.km);
  if (s) splits.push({ ...s, minutes: pub.minutes });
}

console.log('MODEL WITH THE CURRENT TABLE versus PUBLISHED (minutes, one way)');
for (const s of splits) {
  const parts = [...s.byClass].map(([c, km]) => `${Object.keys(HopClass)[c]} ${km.toFixed(1)} km`).join(', ');
  const model = [0, 1].map(i => minutesOf(s, c => SPEED_KMH[c][i]));
  console.log(`  ${s.line.padEnd(4)} [${s.headsign}] ${s.km.toFixed(1)} km (${parts})`);
  console.log(`       off-peak model ${model[0].toFixed(0)} vs published ${s.minutes[0]} | peak model ${model[1].toFixed(0)} vs published ${s.minutes[1]}`);
}

// Fit street and toll speeds on the express routes (the busway speed comes from corridor 1 directly)
const express = splits.filter(s => s.byClass.has(HopClass.TOLL));
for (const period of [0, 1] as const) {
  let best = { street: 0, toll: 0, error: Infinity };
  for (let street = 8; street <= 30; street += 0.5) {
    for (let toll = 15; toll <= 70; toll += 1) {
      const speed = (c: number) => (c === HopClass.TOLL ? toll : c === HopClass.STREET ? street : SPEED_KMH[c][period]);
      const error = express.reduce((sum, s) => sum + ((minutesOf(s, speed) - s.minutes[period]) / s.minutes[period]) ** 2, 0);
      if (error < best.error) best = { street, toll, error };
    }
  }
  const rms = Math.sqrt(best.error / express.length) * 100;
  console.log(`BEST FIT ${period === 0 ? 'off-peak' : 'peak'}: street ${best.street} km/h, toll ${best.toll} km/h (rms error ${rms.toFixed(0)} %)`);
}
