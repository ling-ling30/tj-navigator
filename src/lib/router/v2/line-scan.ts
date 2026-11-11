/**
 * One cost search: round-based line scanning (the structure of RAPTOR) on a generalised cost.
 * Round k holds the cheapest way to be at each stop after exactly k rides.
 * See docs/ROUTING-V2-SPEC.md, section 4.
 */
import { TransferFlag } from '../../../types/network-v2';
import { WALK_SPEED_MPS } from './footpaths';
import type { NetworkIndex } from './network-index';

export interface AccessPoint { stop: number; walkSec: number; meters: number }

export interface ScanParams {
  access: AccessPoint[];
  /** Walking seconds from each stop to the destination; Infinity when the stop is too far. */
  egressSec: Float32Array;
  maxRides: number;
  lineAllowed: Uint8Array;
  /** Multiplier on riding cost per line (1 = normal); used to steer re-runs away from lines already shown. */
  lineRideWeight: Float32Array;
  hopSec: Float32Array;
  /** Expected wait when boarding at a position; Infinity when the pattern does not run or is switched off. */
  boardWait: Float32Array;
  walkWeight: number;
  waitWeight: number;
  transferPenalty: number;
  paidTransferPenalty: number;
  transferBufferSec: number;
}

export type RawLeg =
  | { kind: 'ride'; pattern: number; boardPos: number; alightPos: number; paidEntry: boolean;
      /** The line carries on from its terminus as a new pattern: the same bus to the traveller, not a change. */
      continues: boolean }
  | { kind: 'walk'; fromStop: number; toStop: number; sec: number; meters: number; flags: number };

export interface RawPath { legs: RawLeg[]; rides: number; cost: number; endStop: number }

export const MAX_RIDES = 5;
const VIA_ACCESS = 1;
const VIA_RIDE = 2;
const VIA_WALK = 3;
/** In a walk leg, -1 stands for the traveller's origin or destination. */
export const ENDPOINT = -1;

export class LineScanner {
  private readonly ix: NetworkIndex;
  private readonly S: number;
  // Labels "at stop s after k rides", index k * S + s
  private readonly cost: Float64Array;
  private readonly time: Float64Array;
  private readonly via: Uint8Array;
  private readonly lastLine: Int32Array;
  private readonly lastDir: Int8Array;
  private readonly walkFrom: Int32Array;
  private readonly walkRef: Int32Array;
  // Labels "arrived at stop s by the k-th ride"
  private readonly rideCost: Float64Array;
  private readonly rideTime: Float64Array;
  private readonly rideBoard: Int32Array;
  private readonly rideAlight: Int32Array;
  private readonly ridePaid: Uint8Array;
  private readonly rideContinues: Uint8Array;
  /** The label's ride ended at the last stop of its pattern. */
  private readonly atTerminus: Uint8Array;

  private readonly best: Float64Array;
  private readonly accessMeters: Int32Array;
  private readonly queuedFrom: Int32Array;
  private readonly rideStamp: Int32Array;
  private readonly markStamp: Int32Array;
  private epoch = 0;
  private roundsRun = 0;

  constructor(ix: NetworkIndex) {
    this.ix = ix;
    const S = (this.S = ix.stopCount);
    const size = (MAX_RIDES + 1) * S;
    this.cost = new Float64Array(size);
    this.time = new Float64Array(size);
    this.via = new Uint8Array(size);
    this.lastLine = new Int32Array(size);
    this.lastDir = new Int8Array(size);
    this.walkFrom = new Int32Array(size);
    this.walkRef = new Int32Array(size);
    this.rideCost = new Float64Array(size);
    this.rideTime = new Float64Array(size);
    this.rideBoard = new Int32Array(size);
    this.rideAlight = new Int32Array(size);
    this.ridePaid = new Uint8Array(size);
    this.rideContinues = new Uint8Array(size);
    this.atTerminus = new Uint8Array(size);
    this.best = new Float64Array(S);
    this.accessMeters = new Int32Array(S);
    this.queuedFrom = new Int32Array(ix.patternCount).fill(-1);
    this.rideStamp = new Int32Array(S);
    this.markStamp = new Int32Array(S);
  }

  /** Runs the search and returns the cheapest path for each number of rides that improves on fewer rides. */
  run(p: ScanParams): RawPath[] {
    const { ix, S, cost, time, via, rideCost, best } = this;
    const fp = ix.footpaths;
    const rounds = Math.min(p.maxRides, MAX_RIDES);
    cost.fill(Infinity);
    rideCost.fill(Infinity);
    best.fill(Infinity);
    via.fill(0);

    let marked: number[] = [];
    for (const a of p.access) {
      const c = p.walkWeight * a.walkSec;
      if (c >= cost[a.stop]) continue;
      if (cost[a.stop] === Infinity) marked.push(a.stop);
      cost[a.stop] = best[a.stop] = c;
      time[a.stop] = a.walkSec;
      via[a.stop] = VIA_ACCESS;
      this.lastLine[a.stop] = -1;
      this.accessMeters[a.stop] = a.meters;
    }

    const found: RawPath[] = [];
    let bestTotal = Infinity;
    let k = 1;
    for (; k <= rounds && marked.length > 0; k++) {
      const base = k * S;
      const prev = base - S;
      const stamp = ++this.epoch;

      const queue: number[] = [];
      for (const s of marked) {
        for (let i = ix.stopPosStart[s]; i < ix.stopPosStart[s + 1]; i++) {
          const pos = ix.stopPos[i];
          const pat = ix.posPattern[pos];
          if (!p.lineAllowed[ix.patLine[pat]]) continue;
          const q = this.queuedFrom[pat];
          if (q === -1) { this.queuedFrom[pat] = pos; queue.push(pat); }
          else if (pos < q) this.queuedFrom[pat] = pos;
        }
      }

      const improved: number[] = [];
      for (const pat of queue) {
        const from = this.queuedFrom[pat];
        this.queuedFrom[pat] = -1;
        const end = ix.patStart[pat + 1];
        const line = ix.patLine[pat];
        const dir = ix.patDir[pat];
        const rideWeight = p.lineRideWeight[line];
        let carried = Infinity;
        let carriedTime = 0;
        let boardPos = -1;
        let paidEntry = false;
        let continued = false;

        for (let pos = from; pos < end; pos++) {
          const s = ix.posStop[pos];
          if (carried < rideCost[base + s] && carried < best[s] && carried < bestTotal) {
            if (this.rideStamp[s] !== stamp) { this.rideStamp[s] = stamp; improved.push(s); }
            rideCost[base + s] = carried;
            this.rideTime[base + s] = carriedTime;
            this.rideBoard[base + s] = boardPos;
            this.rideAlight[base + s] = pos;
            this.ridePaid[base + s] = paidEntry ? 1 : 0;
            this.rideContinues[base + s] = continued ? 1 : 0;
          }
          if (pos + 1 === end) break;

          const here = cost[prev + s];
          const wait = p.boardWait[pos];
          const sameLine = k > 1 && this.lastLine[prev + s] === line;
          // Feeds often split a line at its terminus; boarding its next pattern there is staying on the bus
          const continues = sameLine && via[prev + s] === VIA_RIDE && this.atTerminus[prev + s] === 1 && pos === ix.patStart[pat];
          const reverses = sameLine && !continues && this.lastDir[prev + s] !== dir;
          if (here < Infinity && wait < Infinity && !reverses) {
            let penalty = 0;
            let buffer = 0;
            let paid = false;
            if (continues) {
              paid = true;
            } else if (k > 1) {
              paid = via[prev + s] === VIA_WALK
                ? (fp.flags[this.walkRef[prev + s]] & TransferFlag.PAID_AREA) !== 0
                : ix.stopIsPaidArea[s] === 1;
              penalty = paid ? p.paidTransferPenalty : p.transferPenalty;
              buffer = p.transferBufferSec;
            }
            const boarded = here + p.waitWeight * wait + penalty + buffer;
            if (boarded < carried) {
              carried = boarded;
              carriedTime = time[prev + s] + wait + buffer;
              boardPos = pos;
              paidEntry = paid;
              continued = continues;
            }
          }
          if (carried < Infinity) {
            carried += p.hopSec[pos] * rideWeight;
            carriedTime += p.hopSec[pos];
          }
        }
      }

      // Stay at the stop the ride reached
      const next: number[] = [];
      const mark = (s: number) => {
        if (this.markStamp[s] !== stamp) { this.markStamp[s] = stamp; next.push(s); }
      };
      for (const s of improved) {
        const c = rideCost[base + s];
        if (c >= cost[base + s]) continue;
        const pat = ix.posPattern[this.rideBoard[base + s]];
        cost[base + s] = c;
        time[base + s] = this.rideTime[base + s];
        via[base + s] = VIA_RIDE;
        this.atTerminus[base + s] = this.rideAlight[base + s] === ix.patStart[pat + 1] - 1 ? 1 : 0;
        this.lastLine[base + s] = ix.patLine[pat];
        this.lastDir[base + s] = ix.patDir[pat];
        if (c < best[s]) best[s] = c;
        mark(s);
      }
      // One walk after a ride, never a chain of walks
      for (const s of improved) {
        const c0 = rideCost[base + s];
        const pat = ix.posPattern[this.rideBoard[base + s]];
        for (let j = fp.start[s]; j < fp.start[s + 1]; j++) {
          const t = fp.to[j];
          const c = c0 + p.walkWeight * fp.sec[j];
          if (c >= cost[base + t] || c >= best[t]) continue;
          cost[base + t] = best[t] = c;
          time[base + t] = this.rideTime[base + s] + fp.sec[j];
          via[base + t] = VIA_WALK;
          this.atTerminus[base + t] = 0;
          this.walkFrom[base + t] = s;
          this.walkRef[base + t] = j;
          this.lastLine[base + t] = ix.patLine[pat];
          this.lastDir[base + t] = ix.patDir[pat];
          mark(t);
        }
      }

      let roundBest = Infinity;
      let roundStop = -1;
      for (const s of next) {
        const total = cost[base + s] + p.walkWeight * p.egressSec[s];
        if (total < roundBest) { roundBest = total; roundStop = s; }
      }
      if (roundStop >= 0 && roundBest < bestTotal) {
        bestTotal = roundBest;
        found.push({ legs: this.pathTo(k, roundStop, p.egressSec[roundStop]), rides: k, cost: roundBest, endStop: roundStop });
      }
      marked = next;
    }
    this.roundsRun = k - 1;
    return found;
  }

  /** After a run: the reached stop for which `score` is lowest, with the path to it. Used for the closest approach. */
  bestReached(score: (stop: number) => number): RawPath | null {
    let bestStop = -1;
    let bestScore = Infinity;
    for (let s = 0; s < this.S; s++) {
      if (this.best[s] === Infinity || this.via[s] === VIA_ACCESS) continue;
      const v = score(s);
      if (v < bestScore) { bestScore = v; bestStop = s; }
    }
    if (bestStop < 0) return null;
    for (let k = 1; k <= this.roundsRun; k++) {
      if (this.cost[k * this.S + bestStop] === this.best[bestStop]) {
        return { legs: this.pathTo(k, bestStop, 0), rides: k, cost: this.best[bestStop], endStop: bestStop };
      }
    }
    return null;
  }

  private pathTo(k: number, stop: number, egressSec: number): RawLeg[] {
    const { ix, S } = this;
    const fp = ix.footpaths;
    const legs: RawLeg[] = [];
    let s = stop;
    if (egressSec > 0 && egressSec < Infinity) {
      legs.push({ kind: 'walk', fromStop: s, toStop: ENDPOINT, sec: egressSec, meters: Math.round(egressSec * WALK_SPEED_MPS), flags: 0 });
    }
    for (let r = k; r >= 1; r--) {
      const base = r * S;
      if (this.via[base + s] === VIA_WALK) {
        const j = this.walkRef[base + s];
        const from = this.walkFrom[base + s];
        legs.push({ kind: 'walk', fromStop: from, toStop: s, sec: fp.sec[j], meters: fp.meters[j], flags: fp.flags[j] });
        s = from;
      }
      const boardPos = this.rideBoard[base + s];
      legs.push({
        kind: 'ride', pattern: ix.posPattern[boardPos], boardPos,
        alightPos: this.rideAlight[base + s], paidEntry: this.ridePaid[base + s] === 1,
        continues: this.rideContinues[base + s] === 1
      });
      s = ix.posStop[boardPos];
    }
    if (this.accessMeters[s] > 0) {
      legs.push({ kind: 'walk', fromStop: ENDPOINT, toStop: s, sec: this.time[s], meters: this.accessMeters[s], flags: 0 });
    }
    return legs.reverse();
  }
}
