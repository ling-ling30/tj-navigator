/**
 * Curated transfers only: hand-kept hubs and the station links the feed declares.
 * Ordinary footpaths between nearby stops are derived by the engine when it loads the graph.
 */
import fs from 'node:fs';
import path from 'node:path';
import { TransferFlag, type StopV2, type TransferV2 } from '../../src/types/network-v2.ts';
import { haversineMeters } from './geo.ts';
import type { Gtfs } from './gtfs-load.ts';
import type { BuildStats, StopRegistry } from './registry.ts';

const ALIAS_MAX_TARGETS = 6;
const WALK_SPEED_MPS = 1.25;
const WALK_DETOUR = 1.3;
const MIN_STATION_TRANSFER_SEC = 60;

interface HubEdge {
  fromStopId: string; toStopId: string; distanceMeters: number; baseDurationSeconds: number;
  isPaidAreaTransfer?: boolean; gateBufferSeconds?: number; isSheltered?: boolean; isStepFree?: boolean;
}

function flagsOf(paid?: boolean, sheltered?: boolean, stepFree?: boolean): number {
  return (paid ? TransferFlag.PAID_AREA : 0) | (sheltered ? TransferFlag.SHELTERED : 0) | (stepFree ? TransferFlag.STEP_FREE : 0);
}

/** Real stops that stand in for an invented hub stop: the platforms carrying one of the given stop names. */
function aliasTargets(names: string[], stops: StopV2[]): number[] {
  const targets: number[] = [];
  stops.forEach((s, i) => {
    if (s[0].startsWith('tj:') && names.includes(s[1])) targets.push(i);
  });
  return targets.slice(0, ALIAS_MAX_TARGETS);
}

export function buildTransfers(seedDir: string, gtfs: Gtfs, registry: StopRegistry, stats: BuildStats): TransferV2[] {
  const stops = registry.stops;
  const byPair = new Map<string, TransferV2>();
  const put = (t: TransferV2) => {
    const key = `${t[0]}>${t[1]}`;
    if (t[0] !== t[1] && !byPair.has(key)) byPair.set(key, t);
  };

  // 1. Hand-kept hubs
  const hubs = JSON.parse(fs.readFileSync(path.join(seedDir, 'transfer-hubs.json'), 'utf-8')) as Array<{ edges: HubEdge[] }>;
  const aliases = JSON.parse(fs.readFileSync(path.join(seedDir, 'hub-stop-aliases.json'), 'utf-8')) as Record<string, string[] | string>;
  const resolve = (id: string): { targets: number[]; repointed: boolean } => {
    const direct = registry.get(id);
    if (direct !== undefined) return { targets: [direct], repointed: false };
    const names = aliases[id];
    return { targets: Array.isArray(names) ? aliasTargets(names, stops) : [], repointed: true };
  };
  for (const hub of hubs) {
    for (const e of hub.edges) {
      const from = resolve(e.fromStopId);
      const to = resolve(e.toStopId);
      const label = `${e.fromStopId} > ${e.toStopId}`;
      if (from.targets.length === 0 || to.targets.length === 0) { stats.hubEdgesDropped.push(label); continue; }
      if (from.repointed || to.repointed) stats.hubEdgesRepointed.push(label);
      const walkSec = e.baseDurationSeconds + (e.gateBufferSeconds ?? 0);
      const flags = flagsOf(e.isPaidAreaTransfer, e.isSheltered, e.isStepFree);
      for (const f of from.targets) for (const t of to.targets) put([f, t, walkSec, e.distanceMeters, flags]);
    }
  }

  // 2. Station links declared by the feed (between parent stations): link their platforms, inside the paid area
  const platformsOf = new Map<string, number[]>();
  stops.forEach((s, i) => {
    if (!s[4]) return;
    const list = platformsOf.get(s[4]);
    if (list) list.push(i); else platformsOf.set(s[4], [i]);
  });
  for (const [a, b] of gtfs.stationTransfers) {
    for (const f of platformsOf.get(a) ?? []) {
      for (const t of platformsOf.get(b) ?? []) {
        const meters = Math.round(haversineMeters(stops[f][2], stops[f][3], stops[t][2], stops[t][3]) * WALK_DETOUR);
        const walkSec = Math.max(MIN_STATION_TRANSFER_SEC, Math.round(meters / WALK_SPEED_MPS));
        put([f, t, walkSec, meters, TransferFlag.PAID_AREA | TransferFlag.SHELTERED]);
      }
    }
  }

  return [...byPair.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}
