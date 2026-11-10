import { TransitMode, type Leg } from '../../types/transit';

export interface FareCalculationResult {
  standardFareIdr: number;
  integratedFareIdr: number;
  savingsIdr: number;
  isJakLingkoEligible: boolean;
}

export function calculateItineraryFare(legs: Leg[]): FareCalculationResult {
  let standardTotal = 0;
  let jakLingkoTotal = 0;
  let jakLingkoDistanceKm = 0;
  let hasJakLingkoMode = false;
  let krlTotal = 0;

  for (const leg of legs) {
    if (leg.type === 'WALK') continue;

    // Transjakarta BRT / Feeder
    if (leg.mode === TransitMode.BRT || leg.mode === TransitMode.NON_BRT) {
      if (leg.isPaidAreaTransfer) {
        // Free transfer inside BRT paid area
      } else {
        standardTotal += 3500;
        hasJakLingkoMode = true;
        jakLingkoDistanceKm += leg.distanceMeters / 1000;
      }
    } else if (leg.mode === TransitMode.MIKROTRANS) {
      // Mikrotrans is Rp 0 with card tap
      hasJakLingkoMode = true;
    } else if (leg.mode === TransitMode.COMMUTER_RAIL) {
      // KRL Commuterline distance progressive
      const km = leg.distanceMeters / 1000;
      const krlFare = 3000 + Math.max(0, Math.ceil((km - 25) / 10)) * 1000;
      standardTotal += krlFare;
      krlTotal += krlFare;
    } else if (leg.mode === TransitMode.MRT) {
      // MRT Jakarta station incremental
      const stopsPassed = leg.intermediateStopCount || 3;
      const mrtFare = Math.min(14000, 3000 + stopsPassed * 1000);
      standardTotal += mrtFare;
      hasJakLingkoMode = true;
      jakLingkoDistanceKm += leg.distanceMeters / 1000;
    } else if (leg.mode === TransitMode.LRT) {
      standardTotal += 5000;
      hasJakLingkoMode = true;
      jakLingkoDistanceKm += leg.distanceMeters / 1000;
    }
  }

  // Calculate JakLingko Integrated Tariff (Max Rp 10.000 for 3 hours across TJ + MRT + LRT)
  if (hasJakLingkoMode) {
    const rawJakLingko = 2500 + Math.ceil(jakLingkoDistanceKm) * 250;
    const cappedJakLingko = Math.min(10000, rawJakLingko);
    jakLingkoTotal = cappedJakLingko + krlTotal;
  } else {
    jakLingkoTotal = standardTotal;
  }

  const savings = Math.max(0, standardTotal - jakLingkoTotal);

  return {
    standardFareIdr: standardTotal,
    integratedFareIdr: jakLingkoTotal,
    savingsIdr: savings,
    isJakLingkoEligible: hasJakLingkoMode && savings > 0
  };
}
