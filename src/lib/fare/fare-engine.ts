import { TransitMode, type Leg } from '../../types/transit';

export interface FareCalculationResult {
  standardFareIdr: number;
  integratedFareIdr: number;
  savingsIdr: number;
  isJakLingkoEligible: boolean;
}

// Named tariff constants per Pergub DKI 133/2021 & operator fare matrices
const FARE_TJ_FLAT_IDR = 3500;
const FARE_KRL_BASE_IDR = 3000;
const FARE_KRL_BASE_KM = 25;
const FARE_KRL_TIER_KM = 10;
const FARE_KRL_TIER_IDR = 1000;

const FARE_MRT_BASE_IDR = 3000;
const FARE_MRT_PER_STATION_IDR = 1000;
const FARE_MRT_MAX_IDR = 14000;

const FARE_LRT_FLAT_IDR = 5000;

const JAKLINGKO_BASE_BOARDING_IDR = 2500;
const JAKLINGKO_RATE_PER_KM_IDR = 250;
const JAKLINGKO_MAX_CEILING_IDR = 10000;

/**
 * Calculates standard separate operator fares and JakLingko integrated tariff
 * per official Pergub DKI 133/2021, KCI/KAI Commuter distance bands, and MRT Jakarta matrices.
 */
export function calculateItineraryFare(legs: Leg[]): FareCalculationResult {
  let standardTotal = 0;
  let jakLingkoTotal = 0;
  let jakLingkoDistanceKm = 0;
  let krlTotal = 0;
  let hasBrtService = false;

  const jakLingkoModeFamilies = new Set<string>();

  // Track contiguous KRL rail segments (free platform transfers at Manggarai, Jatinegara, Duri, etc.)
  let currentKrlDistanceKm = 0;
  let inKrlJourney = false;

  const finalizeKrlJourney = () => {
    if (inKrlJourney && currentKrlDistanceKm > 0) {
      const additionalBands = Math.max(0, Math.ceil((currentKrlDistanceKm - FARE_KRL_BASE_KM) / FARE_KRL_TIER_KM));
      const krlFare = FARE_KRL_BASE_IDR + additionalBands * FARE_KRL_TIER_IDR;
      standardTotal += krlFare;
      krlTotal += krlFare;
      currentKrlDistanceKm = 0;
      inKrlJourney = false;
    }
  };

  for (const leg of legs) {
    if (leg.type === 'WALK') {
      // Walking transfers between stations end a continuous rail/paid-area journey
      if (!leg.isPaidAreaTransfer && inKrlJourney) {
        finalizeKrlJourney();
      }
      continue;
    }

    if (leg.mode === TransitMode.COMMUTER_RAIL) {
      inKrlJourney = true;
      currentKrlDistanceKm += leg.distanceMeters / 1000;
    } else {
      if (inKrlJourney) {
        finalizeKrlJourney();
      }

      // Transjakarta BRT / Non-BRT Feeder
      if (leg.mode === TransitMode.BRT || leg.mode === TransitMode.NON_BRT) {
        if (leg.isPaidAreaTransfer && hasBrtService) {
          // Free transfer inside BRT paid area (e.g. CSW, Semanggi)
        } else {
          standardTotal += FARE_TJ_FLAT_IDR;
          hasBrtService = true;
          jakLingkoModeFamilies.add('TJ');
          jakLingkoDistanceKm += leg.distanceMeters / 1000;
        }
      } else if (leg.mode === TransitMode.MIKROTRANS) {
        // Mikrotrans is Rp 0 with mandatory card tap
        hasBrtService = true;
        jakLingkoModeFamilies.add('TJ');
        jakLingkoDistanceKm += leg.distanceMeters / 1000;
      } else if (leg.mode === TransitMode.MRT) {
        // MRT Jakarta station progressive formula:
        // Rp 3.000 base + Rp 1.000 per station hop traveled, max Rp 14.000
        const stationsTraveled = Math.max(1, (leg.intermediateStopCount ?? 0) + 1);
        const mrtFare = Math.min(FARE_MRT_MAX_IDR, FARE_MRT_BASE_IDR + stationsTraveled * FARE_MRT_PER_STATION_IDR);
        standardTotal += mrtFare;
        jakLingkoModeFamilies.add('MRT');
        jakLingkoDistanceKm += leg.distanceMeters / 1000;
      } else if (leg.mode === TransitMode.LRT) {
        // LRT flat fare
        standardTotal += FARE_LRT_FLAT_IDR;
        jakLingkoModeFamilies.add('LRT');
        jakLingkoDistanceKm += leg.distanceMeters / 1000;
      }
    }
  }

  // Finalize any active KRL rail journey
  if (inKrlJourney) {
    finalizeKrlJourney();
  }

  // Handle case where trip enters at BRT station via paid-area walkway (e.g. CSW 1 -> CSW 13)
  if (legs.some(l => l.mode === TransitMode.BRT || l.mode === TransitMode.NON_BRT) && !hasBrtService) {
    standardTotal += FARE_TJ_FLAT_IDR;
    jakLingkoModeFamilies.add('TJ');
  }

  // JakLingko Integrated Tariff (Pergub DKI 133/2021):
  // Applies ONLY for multi-modal journeys transferring between at least 2 different JakLingko modes (TJ + MRT + LRT).
  // Single-mode journeys (e.g. pure BRT, pure MRT) use the operator's standard tariff.
  const isMultiModalJakLingko = jakLingkoModeFamilies.size >= 2;

  if (isMultiModalJakLingko) {
    const rawJakLingko = JAKLINGKO_BASE_BOARDING_IDR + Math.ceil(jakLingkoDistanceKm) * JAKLINGKO_RATE_PER_KM_IDR;
    const cappedJakLingko = Math.min(JAKLINGKO_MAX_CEILING_IDR, rawJakLingko);
    jakLingkoTotal = cappedJakLingko + krlTotal;
  } else {
    jakLingkoTotal = standardTotal;
  }

  const savings = Math.max(0, standardTotal - jakLingkoTotal);

  return {
    standardFareIdr: standardTotal,
    integratedFareIdr: jakLingkoTotal,
    savingsIdr: savings,
    isJakLingkoEligible: isMultiModalJakLingko && savings > 0
  };
}
