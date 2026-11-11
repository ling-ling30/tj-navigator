/**
 * Fare estimate for one option. Rules and their confidence: wayfinder/routing-v2/tickets/09-fare-model.md.
 * Every result is an estimate and is labelled so in the UI.
 */

export interface FareLeg {
  fareClass: string;
  meters: number;
  /** Number of stops ridden (alighting position minus boarding position). */
  hops: number;
  /** Clock time of boarding, in seconds of the day. */
  boardSec: number;
  /** The traveller reached this boarding from the previous ride without leaving a paid area. */
  paidEntry: boolean;
  /** The line is a BRT corridor line. */
  isBrt: boolean;
}

export interface FareEstimate { fareIdr: number; integrated: boolean }

const TJ_REGULAR = new Set(['FP', 'FP2']);
const TJ_FLAT_IDR = 3500;
const TJ_EARLY_IDR = 2000;
const TJ_EARLY_FROM_SEC = 5 * 3600;
const TJ_EARLY_TO_SEC = 7 * 3600;
const PREMIUM_IDR: Record<string, number> = { PP: 20000, PP2: 25000, PP3: 35000, SH2: 15000 };

const KRL_BASE_IDR = 3000;
const KRL_BASE_KM = 25;
const KRL_STEP_IDR = 1000;
const KRL_STEP_KM = 10;

const MRT_BASE_IDR = 3000;
const MRT_PER_STATION_IDR = 1000;
const MRT_MAX_IDR = 14000;

const LRT_JKT_FLAT_IDR = 5000;
const LRT_JBD_BASE_IDR = 5000;
const LRT_JBD_PER_KM_IDR = 700;
const LRT_JBD_CAP_PEAK_IDR = 20000;
const LRT_JBD_CAP_OFFPEAK_IDR = 10000;

const INTEGRATED_BASE_IDR = 2500;
const INTEGRATED_PER_KM_IDR = 250;
const INTEGRATED_CAP_IDR = 10000;
const INTEGRATED_MAX_TRIP_SEC = 3 * 3600;

/**
 * Disputed rule: leaving a halte to the street and tapping in again on another Transjakarta service.
 * The research says a new fare; the feed says free transfers within three hours. Default: a new fare.
 */
const STREET_TRANSFER_IS_FREE = false;

/** Operator families that take part in the integrated tariff. */
function integratedFamily(fareClass: string): string | null {
  if (TJ_REGULAR.has(fareClass) || fareClass === 'GR') return 'TJ';
  if (fareClass === 'MRT') return 'MRT';
  if (fareClass === 'LRT_JKT') return 'LRT_JKT';
  return null;
}

function krlFare(meters: number): number {
  const extraKm = Math.max(0, meters / 1000 - KRL_BASE_KM);
  return KRL_BASE_IDR + Math.ceil(extraKm / KRL_STEP_KM) * KRL_STEP_IDR;
}

function lrtJabodebekFare(meters: number, peak: boolean): number {
  const extraKm = Math.max(0, Math.ceil(meters / 1000 - 1));
  return Math.min(peak ? LRT_JBD_CAP_PEAK_IDR : LRT_JBD_CAP_OFFPEAK_IDR, LRT_JBD_BASE_IDR + extraKm * LRT_JBD_PER_KM_IDR);
}

export function estimateFare(legs: FareLeg[], tripSec: number, peak: boolean): FareEstimate {
  let other = 0;
  let integratedSeparate = 0;
  let integratedMeters = 0;
  const families = new Set<string>();

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const prev = i > 0 ? legs[i - 1] : null;
    let price: number;

    if (TJ_REGULAR.has(leg.fareClass)) {
      const continuesTap = prev !== null && (TJ_REGULAR.has(prev.fareClass) || prev.fareClass === 'GR') &&
        (leg.paidEntry || STREET_TRANSFER_IS_FREE);
      const early = leg.isBrt && leg.boardSec >= TJ_EARLY_FROM_SEC && leg.boardSec < TJ_EARLY_TO_SEC;
      price = continuesTap ? 0 : early ? TJ_EARLY_IDR : TJ_FLAT_IDR;
    } else if (leg.fareClass === 'GR') {
      price = 0;
    } else if (leg.fareClass in PREMIUM_IDR) {
      price = PREMIUM_IDR[leg.fareClass];
    } else if (leg.fareClass === 'KRL' || leg.fareClass === 'LRT_JBD') {
      // Consecutive rides inside the same rail network are one tap: price the chain once, on its last leg.
      const next = legs[i + 1];
      if (next && next.fareClass === leg.fareClass && next.paidEntry) { price = 0; }
      else {
        let meters = leg.meters;
        for (let j = i; j > 0 && legs[j].paidEntry && legs[j - 1].fareClass === leg.fareClass; j--) meters += legs[j - 1].meters;
        price = leg.fareClass === 'KRL' ? krlFare(meters) : lrtJabodebekFare(meters, peak);
      }
    } else if (leg.fareClass === 'MRT') {
      price = Math.min(MRT_MAX_IDR, MRT_BASE_IDR + Math.max(0, leg.hops - 1) * MRT_PER_STATION_IDR);
    } else if (leg.fareClass === 'LRT_JKT') {
      price = LRT_JKT_FLAT_IDR;
    } else {
      price = TJ_FLAT_IDR;
    }

    const family = integratedFamily(leg.fareClass);
    if (family) {
      families.add(family);
      integratedSeparate += price;
      integratedMeters += leg.meters;
    } else {
      other += price;
    }
  }

  const integratedPrice = Math.min(
    INTEGRATED_CAP_IDR, INTEGRATED_BASE_IDR + Math.ceil(integratedMeters / 1000) * INTEGRATED_PER_KM_IDR
  );
  const integrated = families.size >= 2 && tripSec <= INTEGRATED_MAX_TRIP_SEC && integratedPrice < integratedSeparate;
  return { fareIdr: other + (integrated ? integratedPrice : integratedSeparate), integrated };
}
