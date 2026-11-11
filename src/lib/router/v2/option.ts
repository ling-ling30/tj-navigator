/** Turns a raw path from the search into an option a traveller can read: pooled lines, times, range, fare. */
import { TransferFlag, ModeGroup } from '../../../types/network-v2';
import { estimateFare, type FareLeg } from '../../fare/fare-v2';
import type { QueryContext } from './context';
import { BALANCED, type CostProfile } from './cost-profiles';
import type { RawPath } from './line-scan';
import type { NetworkIndex } from './network-index';
import { poolRide } from './pooling';
import { INFREQUENT_HEADWAY_SEC } from './time-model';

export interface RideLeg {
  kind: 'ride';
  /** Line indexes that serve this leg; the first is the one the search chose. */
  lines: number[];
  boardStop: number;
  alightStop: number;
  boardPos: number;
  alightPos: number;
  /** Board and alight positions of each pattern the leg rides; more than one when the line continues past a terminus. */
  segments: Array<[number, number]>;
  waitSec: number;
  rideSec: number;
  meters: number;
  hops: number;
  /** Effective headway of the pooled lines. */
  headwaySec: number;
  infrequent: boolean;
  paidEntry: boolean;
  /** Clock time of boarding (typical), seconds of the day. */
  boardSec: number;
}

export interface WalkLeg {
  kind: 'walk';
  /** -1 = the traveller's origin or destination. */
  fromStop: number;
  toStop: number;
  sec: number;
  meters: number;
  paidArea: boolean;
  sheltered: boolean;
  stepFree: boolean;
  /** The part public transport does not cover (closest-approach answers). */
  uncovered: boolean;
  startSec: number;
}

export type OptionLeg = RideLeg | WalkLeg;

export interface PlanOption {
  legs: OptionLeg[];
  rideSec: number;
  walkSec: number;
  waitSec: number;
  /** Typical door-to-door time, with expected waits. */
  typicalSec: number;
  /** No waiting at all … a full headway at every boarding. */
  minSec: number;
  maxSec: number;
  transfers: number;
  walkMeters: number;
  rideMeters: number;
  fareIdr: number;
  fareIntegrated: boolean;
  /** Generalised cost under the balanced profile: the common yardstick for ranking. */
  cost: number;
  signature: string;
  badges: string[];
}

export function buildOption(
  ix: NetworkIndex, ctx: QueryContext, raw: RawPath, transferBufferSec: number, yardstick: CostProfile = BALANCED
): PlanOption {
  const legs: OptionLeg[] = [];
  const fareLegs: FareLeg[] = [];
  const parts: string[] = [];
  let clock = ctx.departSec;
  let rideSec = 0, walkSec = 0, waitSec = 0, walkMeters = 0, rideMeters = 0, cost = 0, rides = 0;

  for (const leg of raw.legs) {
    if (leg.kind === 'walk') {
      const before = legs[legs.length - 1];
      if (before && before.kind === 'walk') {
        // Two walks in a row are one walk to the traveller
        before.toStop = leg.toStop;
        before.sec += leg.sec;
        before.meters += leg.meters;
        before.paidArea = false;
      } else legs.push({
        kind: 'walk', fromStop: leg.fromStop, toStop: leg.toStop, sec: leg.sec, meters: leg.meters,
        paidArea: (leg.flags & TransferFlag.PAID_AREA) !== 0, sheltered: (leg.flags & TransferFlag.SHELTERED) !== 0,
        stepFree: (leg.flags & TransferFlag.STEP_FREE) !== 0, uncovered: false, startSec: clock
      });
      clock += leg.sec;
      walkSec += leg.sec;
      walkMeters += leg.meters;
      cost += yardstick.walkWeight * leg.sec;
      continue;
    }

    const pooled = poolRide(ix, ctx, leg.boardPos, leg.alightPos);
    let meters = 0;
    for (let pos = leg.boardPos; pos < leg.alightPos; pos++) meters += ix.posHopM[pos];

    const earlier = legs[legs.length - 1];
    if (leg.continues && earlier && earlier.kind === 'ride') {
      // Same bus past its terminus: extend the ride instead of showing a change
      const stay = pooled.waitSec + pooled.rideSec;
      earlier.alightStop = ix.posStop[leg.alightPos];
      earlier.alightPos = leg.alightPos;
      earlier.segments.push([leg.boardPos, leg.alightPos]);
      earlier.rideSec += stay;
      earlier.meters += meters;
      earlier.hops += leg.alightPos - leg.boardPos;
      const fareLeg = fareLegs[fareLegs.length - 1];
      fareLeg.meters += meters;
      fareLeg.hops += leg.alightPos - leg.boardPos;
      parts[parts.length - 1] += `+${earlier.alightStop}`;
      clock += stay;
      rideSec += stay;
      rideMeters += meters;
      cost += stay;
      continue;
    }
    if (rides > 0) {
      clock += transferBufferSec;
      cost += transferBufferSec + (leg.paidEntry ? yardstick.paidTransferPenalty : yardstick.transferPenalty);
    }
    const line = ix.net.lines[pooled.lines[0]];
    const boardStop = ix.posStop[leg.boardPos];
    const alightStop = ix.posStop[leg.alightPos];
    const headwaySec = pooled.frequency > 0 ? 1 / pooled.frequency : Infinity;
    legs.push({
      kind: 'ride', lines: pooled.lines, boardStop, alightStop, boardPos: leg.boardPos, alightPos: leg.alightPos,
      segments: [[leg.boardPos, leg.alightPos]], waitSec: pooled.waitSec, rideSec: pooled.rideSec, meters, hops: leg.alightPos - leg.boardPos,
      headwaySec, infrequent: headwaySec >= INFREQUENT_HEADWAY_SEC, paidEntry: leg.paidEntry, boardSec: clock + pooled.waitSec
    });
    fareLegs.push({
      fareClass: line[5], meters, hops: leg.alightPos - leg.boardPos, boardSec: clock + pooled.waitSec,
      paidEntry: rides > 0 && leg.paidEntry, isBrt: line[4] === ModeGroup.BRT
    });
    parts.push(`${[...pooled.lines].sort((a, b) => a - b).join('/')}@${boardStop}>${alightStop}`);
    clock += pooled.waitSec + pooled.rideSec;
    waitSec += pooled.waitSec;
    rideSec += pooled.rideSec;
    rideMeters += meters;
    cost += yardstick.waitWeight * pooled.waitSec + pooled.rideSec;
    rides++;
  }

  const typicalSec = clock - ctx.departSec;
  const fare = estimateFare(fareLegs, typicalSec, ctx.peak);
  return {
    legs, rideSec, walkSec, waitSec, typicalSec, minSec: typicalSec - waitSec, maxSec: typicalSec + waitSec,
    transfers: Math.max(0, rides - 1), walkMeters, rideMeters, fareIdr: fare.fareIdr, fareIntegrated: fare.integrated,
    cost, signature: parts.join('|'), badges: []
  };
}
