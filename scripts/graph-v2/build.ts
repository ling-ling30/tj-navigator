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
import { buildRail } from './rail.ts';
import { newStats, StopRegistry } from './registry.ts';
import { buildTransfers } from './transfers.ts';

const ROOT = process.cwd();
const GTFS_ZIP = path.join(ROOT, 'tmp_gtfs.zip');
const GTFS_DIR = path.join(ROOT, 'tmp_gtfs');
const SEED_DIR = path.join(ROOT, 'data', 'seeds');
const OUT_FILE = path.join(ROOT, 'public', 'data', 'network-v2.json');
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
  const patterns = buildPatterns(gtfs, lineOfRoute, registry, yyyymmdd(new Date()), stats);
  patterns.push(...buildRail(SEED_DIR, registry, lines));
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
