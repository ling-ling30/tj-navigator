/** Weights of the generalised cost, per search profile and per traveller preference. Starting values, tuned on the benchmark. */

export interface CostProfile {
  name: string;
  walkWeight: number;
  waitWeight: number;
  /** Seconds added per boarding after the first. */
  transferPenalty: number;
  /** The same, when the change stays inside a paid area. */
  paidTransferPenalty: number;
}

export const BALANCED: CostProfile = { name: 'balanced', walkWeight: 2, waitWeight: 1, transferPenalty: 300, paidTransferPenalty: 120 };

/** The profiles one query runs, in order. Each can surface a different option. */
export const SEARCH_PROFILES: readonly CostProfile[] = [
  BALANCED,
  { name: 'fastest', walkWeight: 1, waitWeight: 1, transferPenalty: 0, paidTransferPenalty: 0 },
  { name: 'fewest-transfers', walkWeight: 2, waitWeight: 1, transferPenalty: 1200, paidTransferPenalty: 1200 },
  { name: 'least-walking', walkWeight: 5, waitWeight: 1, transferPenalty: 300, paidTransferPenalty: 120 }
];

/** Riding on a line already shown costs this much more in a re-run, which steers it to another corridor. */
export const SHOWN_LINE_RIDE_WEIGHT = 1.5;
export const DIVERSITY_RERUNS = 2;

export type WalkingTolerance = 'sedikit' | 'normal' | 'jauh';
export type TransferTime = 'normal' | 'longgar';

export interface TravelOptions {
  /** 0 = direct only … 3 = no limit set by the traveller. */
  maxTransfers: number;
  walking: WalkingTolerance;
  transferTime: TransferTime;
  includePremium: boolean;
}

export const DEFAULT_TRAVEL_OPTIONS: TravelOptions = { maxTransfers: 3, walking: 'normal', transferTime: 'normal', includePremium: true };

export const WALKING: Record<WalkingTolerance, { accessRadiusM: number; walkWeightFactor: number }> = {
  sedikit: { accessRadiusM: 800, walkWeightFactor: 1.5 },
  normal: { accessRadiusM: 1500, walkWeightFactor: 1 },
  jauh: { accessRadiusM: 3000, walkWeightFactor: 0.75 }
};

export const TRANSFER_BUFFER_SEC: Record<TransferTime, number> = { normal: 0, longgar: 180 };

/** Answer ladder: wider walking when nothing is found. */
export const RELAXED_RADII_M: readonly number[] = [3000, 5000];
export const WALK_ONLY_MAX_M = 1500;
export const SAME_PLACE_M = 25;
