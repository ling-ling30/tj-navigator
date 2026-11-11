/**
 * Common lines: every pattern that takes the traveller from the same boarding stop to the same alighting stop
 * in about the same time is the same leg ("Naik 9, 9A atau 9E"), and their frequencies add up.
 */
import type { QueryContext } from './context';
import type { NetworkIndex } from './network-index';
import { expectedWaitSec } from './time-model';

/** A pattern joins the pool when its ride is at most this much longer than the chosen one. */
const POOL_RIDE_RATIO = 1.2;
const POOL_RIDE_SLACK_SEC = 180;

export interface PooledRide {
  /** Line indexes, the chosen line first, then by frequency. */
  lines: number[];
  /** Combined frequency in vehicles per second. */
  frequency: number;
  waitSec: number;
  rideSec: number;
}

export function rideSeconds(ctx: QueryContext, boardPos: number, alightPos: number): number {
  let sec = 0;
  for (let pos = boardPos; pos < alightPos; pos++) sec += ctx.hopSec[pos];
  return sec;
}

export function poolRide(ix: NetworkIndex, ctx: QueryContext, boardPos: number, alightPos: number): PooledRide {
  const boardStop = ix.posStop[boardPos];
  const alightStop = ix.posStop[alightPos];
  const chosenPattern = ix.posPattern[boardPos];
  const chosenLine = ix.patLine[chosenPattern];
  const chosenFare = ix.net.lines[chosenLine][5];
  const baseRide = rideSeconds(ctx, boardPos, alightPos);
  const limit = Math.max(baseRide * POOL_RIDE_RATIO, baseRide + POOL_RIDE_SLACK_SEC);

  /** pattern → shortest ride found on it between the two stops */
  const rideOf = new Map<number, number>();
  for (let i = ix.stopPosStart[boardStop]; i < ix.stopPosStart[boardStop + 1]; i++) {
    const from = ix.stopPos[i];
    const pat = ix.posPattern[from];
    if (!(ctx.patFreq[pat] > 0) || !ctx.lineAllowed[ix.patLine[pat]]) continue;
    // A premium bus is not interchangeable with a regular one: pool only within the same fare class
    if (ix.net.lines[ix.patLine[pat]][5] !== chosenFare) continue;
    const end = ix.patStart[pat + 1];
    let sec = 0;
    for (let pos = from; pos + 1 < end && sec <= limit; pos++) {
      sec += ctx.hopSec[pos];
      if (ix.posStop[pos + 1] !== alightStop) continue;
      if (sec <= limit && sec < (rideOf.get(pat) ?? Infinity)) rideOf.set(pat, sec);
      break;
    }
  }
  if (!rideOf.has(chosenPattern)) rideOf.set(chosenPattern, baseRide);

  let frequency = 0;
  let weightedRide = 0;
  const lineFreq = new Map<number, number>();
  for (const [pat, sec] of rideOf) {
    const f = ctx.patFreq[pat];
    frequency += f;
    weightedRide += f * sec;
    lineFreq.set(ix.patLine[pat], (lineFreq.get(ix.patLine[pat]) ?? 0) + f);
  }
  const lines = [...lineFreq.keys()].sort((a, b) =>
    a === chosenLine ? -1 : b === chosenLine ? 1 : lineFreq.get(b)! - lineFreq.get(a)!
  );
  return {
    lines,
    frequency,
    waitSec: expectedWaitSec(frequency),
    rideSec: frequency > 0 ? weightedRide / frequency : baseRide
  };
}
