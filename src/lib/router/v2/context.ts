/** Everything about one query that does not depend on the search profile: the moment, the allowed lines, the waits. */
import type { NetworkIndex } from './network-index';
import { dayBitOf, expectedWaitSec, isPeak, secondsOfDay } from './time-model';

/** Fare classes of premium services, which a traveller can switch off. */
export const PREMIUM_FARE_CLASSES = new Set(['PP', 'PP2', 'PP3', 'SH2']);

export interface QueryContext {
  departSec: number;
  peak: boolean;
  hopSec: Float32Array;
  patFreq: Float64Array;
  lineAllowed: Uint8Array;
  /** Expected wait per boarding position, pooled over the patterns of the same line on the same hop. */
  boardWait: Float32Array;
}

export function makeContext(
  ix: NetworkIndex, departAt: Date, allowedModes: ReadonlySet<number> | null, includePremium: boolean
): QueryContext {
  const dayBit = dayBitOf(departAt);
  const departSec = secondsOfDay(departAt);
  const peak = isPeak(dayBit, departSec);
  const patFreq = ix.patternFrequencies(dayBit, departSec);

  const lineAllowed = new Uint8Array(ix.lineCount);
  ix.net.lines.forEach((line, i) => {
    const modeOk = allowedModes === null || allowedModes.has(line[4]);
    const fareOk = includePremium || !PREMIUM_FARE_CLASSES.has(line[5]);
    lineAllowed[i] = modeOk && fareOk ? 1 : 0;
  });

  const total = ix.posStop.length;
  const groupFreq = new Float64Array(ix.hopGroupCount);
  for (let pos = 0; pos < total; pos++) {
    const g = ix.posHopGroup[pos];
    if (g >= 0) groupFreq[g] += patFreq[ix.posPattern[pos]];
  }
  const boardWait = new Float32Array(total).fill(Infinity);
  for (let pos = 0; pos < total; pos++) {
    const g = ix.posHopGroup[pos];
    const pat = ix.posPattern[pos];
    if (g >= 0 && patFreq[pat] > 0 && lineAllowed[ix.patLine[pat]]) boardWait[pos] = expectedWaitSec(groupFreq[g]);
  }

  return { departSec, peak, hopSec: peak ? ix.posHopSecPeak : ix.posHopSecOffPeak, patFreq, lineAllowed, boardWait };
}
