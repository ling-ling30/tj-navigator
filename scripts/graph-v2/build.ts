/**
 * Graph builder v2 (docs/ROUTING-V2-SPEC.md, section 7).
 * Run from the repo root: `pnpm build:data:v2`. Writes public/data/network-v2.json.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { NetworkV2 } from '../../src/types/network-v2.ts';
import { loadGtfs } from './gtfs-load.ts';
import { buildLines, buildPatterns } from './patterns.ts';
import { encodePolyline, type PatternPath } from './paths.ts';
import { buildRail } from './rail.ts';
import { newStats, StopRegistry } from './registry.ts';
import { buildTransfers } from './transfers.ts';

const ROOT = process.cwd();
const GTFS_ZIP = path.join(ROOT, 'tmp_gtfs.zip');
const GTFS_DIR = path.join(ROOT, 'tmp_gtfs');
const SEED_DIR = path.join(ROOT, 'data', 'seeds');
const OUT_FILE = path.join(ROOT, 'public', 'data', 'network-v2.json');
const VERSION_FILE = path.join(ROOT, 'public', 'data', 'network-v2.version.json');
const SHAPES_FILE = path.join(ROOT, 'public', 'data', 'shapes-v2.json');
const GTFS_URL = 'https://gtfs.transjakarta.co.id/files/file_gtfs.zip';
const VERSION = '2.0.0';

async function ensureGtfs(): Promise<void> {
  if (fs.existsSync(path.join(GTFS_DIR, 'stop_times.txt'))) return;
  if (!fs.existsSync(GTFS_ZIP)) {
    console.log(`Downloading ${GTFS_URL} ...`);
    const res = await fetch(GTFS_URL);
    if (!res.ok) throw new Error(`GTFS download failed: HTTP ${res.status}`);
    fs.writeFileSync(GTFS_ZIP, Buffer.from(await res.arrayBuffer()));
  }
  fs.mkdirSync(GTFS_DIR, { recursive: true });
  execSync(`tar -xf "${GTFS_ZIP}" -C "${GTFS_DIR}"`);
}

function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

async function main(): Promise<void> {
  await ensureGtfs();
  const gtfs = loadGtfs(GTFS_DIR);
  const stats = newStats();
  const registry = new StopRegistry();

  const { lines, lineOfRoute } = buildLines(gtfs, stats);
  const paths: PatternPath[] = [];
  const patterns = buildPatterns(gtfs, lineOfRoute, registry, yyyymmdd(new Date()), stats, paths);
  for (const rail of buildRail(SEED_DIR, registry, lines)) {
    // The seeds carry no track geometry: a rail pattern is drawn station to station
    patterns.push(rail);
    paths.push({ points: rail[3].map(s => [registry.stops[s][2], registry.stops[s][3]]), stopVertex: rail[3].map((_, i) => i) });
  }
  const transfers = buildTransfers(SEED_DIR, gtfs, registry, stats);

  const network: NetworkV2 = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    feedDate: fs.statSync(path.join(GTFS_DIR, 'stops.txt')).mtime.toISOString().slice(0, 10),
    stops: registry.stops,
    lines,
    patterns,
    transfers
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(network));
  // Route geometry, in pattern order: loaded only when a map or a live arrival needs it
  const shapes = { version: VERSION, generatedAt: network.generatedAt, patterns: paths.map(p => [encodePolyline(p.points), p.stopVertex]) };
  fs.writeFileSync(SHAPES_FILE, JSON.stringify(shapes));
  console.log(`Wrote ${path.relative(ROOT, SHAPES_FILE)} (${(fs.statSync(SHAPES_FILE).size / 1024).toFixed(0)} KB, ${paths.reduce((n, p) => n + p.points.length, 0)} points)`);
  // A tiny file the app checks to learn that a newer graph is out, without downloading the graph itself
  fs.writeFileSync(VERSION_FILE, JSON.stringify({ version: VERSION, generatedAt: network.generatedAt, feedDate: network.feedDate }));

  const hops = stats.hopsAlongShape + stats.hopsFallback;
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB)`);
  console.log(`stops ${network.stops.length} | lines ${lines.length} | patterns ${patterns.length} | curated transfers ${transfers.length}`);
  console.log(`hops along a shape ${stats.hopsAlongShape} of ${hops} (${((100 * stats.hopsAlongShape) / hops).toFixed(1)} %)`);
  console.log(`patterns skipped, no valid service: ${stats.patternsWithoutService}`);
  console.log(`stop ids in stop_times but not in stops.txt: ${[...stats.unknownStops].join(', ') || 'none'}`);
  console.log(`unknown route_desc: ${[...stats.unknownRouteDesc].join(', ') || 'none'}`);
  console.log(`fare inherited: ${stats.fareInherited.join(', ') || 'none'} | fare defaulted: ${stats.fareDefaulted.join(', ') || 'none'}`);
  console.log(`hub edges re-pointed: ${stats.hubEdgesRepointed.length} | dropped: ${stats.hubEdgesDropped.join('; ') || 'none'}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
