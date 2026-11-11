/** Typed-array view of the compiled graph, built once when the worker loads it. */
import type { NetworkV2 } from '../../../types/network-v2';
import { buildFootpaths, haversineMeters, isRailStopId, WALK_DETOUR, WALK_SPEED_MPS, type FootpathTable } from './footpaths';
import { hopClassOf, hopSeconds } from './time-model';

export interface NearbyStop { stop: number; meters: number; walkSec: number }

export class NetworkIndex {
  readonly net: NetworkV2;
  readonly stopCount: number;
  readonly patternCount: number;
  readonly lineCount: number;

  /** Pattern p occupies positions patStart[p] .. patStart[p + 1] - 1 of the flat arrays below. */
  readonly patStart: Int32Array;
  readonly patLine: Int32Array;
  readonly patDir: Int8Array;
  /** Flat, by position: stop at the position, pattern of the position, metres and seconds to the next position. */
  readonly posStop: Int32Array;
  readonly posPattern: Int32Array;
  readonly posHopM: Int32Array;
  readonly posHopSecOffPeak: Float32Array;
  readonly posHopSecPeak: Float32Array;
  /** Hops that the same line runs between the same two stops share a group: their frequencies pool. */
  readonly posHopGroup: Int32Array;
  readonly hopGroupCount: number;

  /** Positions that serve each stop: stopPosStart[s] .. stopPosStart[s + 1] - 1 of stopPos. */
  readonly stopPosStart: Int32Array;
  readonly stopPos: Int32Array;

  readonly footpaths: FootpathTable;
  /** A stop inside a paid area: a halte platform or a rail station. Changing lines there needs no new tap. */
  readonly stopIsPaidArea: Uint8Array;
  readonly lineMode: Uint8Array;
  private readonly stopIndexById = new Map<string, number>();

  constructor(net: NetworkV2) {
    this.net = net;
    const S = (this.stopCount = net.stops.length);
    const P = (this.patternCount = net.patterns.length);
    this.lineCount = net.lines.length;
    this.lineMode = Uint8Array.from(net.lines, l => l[4]);

    this.patStart = new Int32Array(P + 1);
    net.patterns.forEach((p, i) => (this.patStart[i + 1] = this.patStart[i] + p[3].length));
    const total = this.patStart[P];
    this.patLine = new Int32Array(P);
    this.patDir = new Int8Array(P);
    this.posStop = new Int32Array(total);
    this.posPattern = new Int32Array(total);
    this.posHopM = new Int32Array(total);
    this.posHopSecOffPeak = new Float32Array(total);
    this.posHopSecPeak = new Float32Array(total);
    this.posHopGroup = new Int32Array(total).fill(-1);

    const groups = new Map<number, number>();
    const perStop = new Int32Array(S);
    net.patterns.forEach((p, pi) => {
      const [lineIdx, dir, , stopIdx, hopMeters] = p;
      const serviceClass = net.lines[lineIdx][6];
      const fareClass = net.lines[lineIdx][5];
      this.patLine[pi] = lineIdx;
      this.patDir[pi] = dir;
      for (let i = 0; i < stopIdx.length; i++) {
        const pos = this.patStart[pi] + i;
        this.posStop[pos] = stopIdx[i];
        this.posPattern[pos] = pi;
        perStop[stopIdx[i]]++;
        if (i + 1 === stopIdx.length) continue;
        const meters = hopMeters[i];
        const hopClass = hopClassOf(serviceClass, meters, fareClass);
        this.posHopM[pos] = meters;
        this.posHopSecOffPeak[pos] = hopSeconds(meters, hopClass, false);
        this.posHopSecPeak[pos] = hopSeconds(meters, hopClass, true);
        const key = (lineIdx * S + stopIdx[i]) * S + stopIdx[i + 1];
        let g = groups.get(key);
        if (g === undefined) groups.set(key, (g = groups.size));
        this.posHopGroup[pos] = g;
      }
    });
    this.hopGroupCount = groups.size;

    this.stopPosStart = new Int32Array(S + 1);
    for (let s = 0; s < S; s++) this.stopPosStart[s + 1] = this.stopPosStart[s] + perStop[s];
    this.stopPos = new Int32Array(total);
    const cursor = this.stopPosStart.slice(0, S);
    for (let pos = 0; pos < total; pos++) this.stopPos[cursor[this.posStop[pos]]++] = pos;

    this.footpaths = buildFootpaths(net);
    this.stopIsPaidArea = new Uint8Array(S);
    net.stops.forEach((s, i) => {
      this.stopIndexById.set(s[0], i);
      if (s[4] || isRailStopId(s[0])) this.stopIsPaidArea[i] = 1;
    });
  }

  stopIndex(id: string): number {
    return this.stopIndexById.get(id) ?? -1;
  }

  /** Frequency (vehicles per second) of every pattern at the given moment; 0 when it does not run. */
  patternFrequencies(dayBit: number, sec: number): Float64Array {
    const freq = new Float64Array(this.patternCount);
    this.net.patterns.forEach((p, i) => {
      for (const [mask, from, to, headway] of p[5]) {
        if ((mask & dayBit) !== 0 && sec >= from && sec < to) freq[i] += 1 / headway;
      }
    });
    return freq;
  }

  /** Stops within walking distance of a point, nearest first. */
  stopsWithin(lat: number, lon: number, radiusM: number): NearbyStop[] {
    const out: NearbyStop[] = [];
    const stops = this.net.stops;
    for (let s = 0; s < this.stopCount; s++) {
      const straight = haversineMeters(lat, lon, stops[s][2], stops[s][3]);
      if (straight > radiusM) continue;
      const meters = Math.round(straight * WALK_DETOUR);
      out.push({ stop: s, meters, walkSec: Math.round(meters / WALK_SPEED_MPS) });
    }
    return out.sort((a, b) => a.meters - b.meters);
  }
}
