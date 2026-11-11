import type { CompiledTransitNetwork, Itinerary, Leg, StopEntity, AnswerKind } from '../../types/transit';
import { WALK_CONSTANTS, findNearbyAccessStops, haversineMeters, calculateWalkMetrics } from './access-stops';
import { RaptorRouter } from './raptor';

export interface LocationInput {
  stopIndex?: number;
  lat: number;
  lon: number;
  name?: string;
  isCustomPoint?: boolean;
}

export interface LadderResult {
  itineraries: Itinerary[];
  answerKind: AnswerKind;
  ladderLevel: number;
}

export function formatTimeFromSeconds(sec: number): string {
  const rounded = Math.round(sec / 60) * 60;
  const h = Math.floor(rounded / 3600) % 24;
  const m = Math.floor((rounded % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDistanceString(meters: number): string {
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1).replace('.', ',');
    return `${km} km`;
  }
  return `${meters} m`;
}

export class JourneyPlanner {
  private router: RaptorRouter;
  private network: CompiledTransitNetwork;

  constructor(router: RaptorRouter) {
    this.router = router;
    this.network = router.getNetwork();
  }

  public plan(
    origin: LocationInput,
    dest: LocationInput,
    departureSecondsOfDay: number = 8 * 3600
  ): LadderResult {
    // 5. Same Place Check: distance < 25m or same stop
    const straightDist = haversineMeters(origin.lat, origin.lon, dest.lat, dest.lon);
    const isSameStop =
      origin.stopIndex !== undefined &&
      dest.stopIndex !== undefined &&
      origin.stopIndex >= 0 &&
      origin.stopIndex === dest.stopIndex;

    if (straightDist < 25 || isSameStop) {
      return {
        itineraries: [],
        answerKind: 'same-place',
        ladderLevel: 5
      };
    }

    // 4. Check Walk-Only option if within ~1.5 km
    let walkOnlyItin: Itinerary | null = null;
    if (straightDist <= WALK_CONSTANTS.DEFAULT_WALK_RADIUS_METERS) {
      const walkMetrics = calculateWalkMetrics(straightDist);
      const walkLeg: Leg = {
        type: 'WALK',
        fromStopName: origin.name || `${origin.lat.toFixed(4)}, ${origin.lon.toFixed(4)}`,
        toStopName: dest.name || `${dest.lat.toFixed(4)}, ${dest.lon.toFixed(4)}`,
        departureTime: formatTimeFromSeconds(departureSecondsOfDay),
        arrivalTime: formatTimeFromSeconds(departureSecondsOfDay + walkMetrics.walkSeconds),
        durationSeconds: walkMetrics.walkSeconds,
        distanceMeters: walkMetrics.distanceMeters,
        isPaidAreaTransfer: false,
        isSheltered: false,
        isStepFree: false
      };

      walkOnlyItin = {
        id: `itin-walk-${Date.now()}`,
        category: 'FASTEST',
        totalDurationMinutes: walkMetrics.walkMinutes,
        nominalDurationMinutes: walkMetrics.walkMinutes,
        trafficDelayMinutes: 0,
        departureTime: formatTimeFromSeconds(departureSecondsOfDay),
        arrivalTime: formatTimeFromSeconds(departureSecondsOfDay + walkMetrics.walkSeconds),
        standardFareIdr: 0,
        integratedFareIdr: 0,
        transfersCount: 0,
        legs: [walkLeg],
        badges: ['JALAN KAKI', 'WALK ONLY'],
        answerKind: 'walk-only'
      };
    }

    // Resolve Access and Egress Stops
    const resolveAccessStops = (loc: LocationInput, radius: number, maxCount: number) => {
      if (loc.stopIndex !== undefined && loc.stopIndex >= 0 && !loc.isCustomPoint) {
        return [{ stopIndex: loc.stopIndex, distanceMeters: 0, walkSeconds: 0 }];
      }
      return findNearbyAccessStops(this.network, loc.lat, loc.lon, radius, maxCount);
    };

    // 1. Normal Search (Default Limits: 1.5 km walk, 3 transfers, 8 access stops)
    const accessStopsL1 = resolveAccessStops(origin, WALK_CONSTANTS.DEFAULT_WALK_RADIUS_METERS, WALK_CONSTANTS.MAX_ACCESS_STOPS);
    const egressStopsL1 = resolveAccessStops(dest, WALK_CONSTANTS.DEFAULT_WALK_RADIUS_METERS, WALK_CONSTANTS.MAX_ACCESS_STOPS);

    const normalResult = this.router.planRouteWithAccessPoints(
      origin,
      dest,
      accessStopsL1,
      egressStopsL1,
      departureSecondsOfDay,
      WALK_CONSTANTS.DEFAULT_MAX_TRANSFERS
    );

    if (normalResult.itineraries.length > 0) {
      const itins: Itinerary[] = normalResult.itineraries.map(it => ({ ...it, answerKind: 'direct' as AnswerKind }));
      if (walkOnlyItin) {
        itins.push(walkOnlyItin);
      }
      return {
        itineraries: this.paretoFilter(itins),
        answerKind: 'direct',
        ladderLevel: 1
      };
    }

    // If within walk distance and no transit found, return walk-only
    if (walkOnlyItin) {
      return {
        itineraries: [walkOnlyItin],
        answerKind: 'walk-only',
        ladderLevel: 4
      };
    }

    // 2. Auto-Relax and Retry (Tier 1: 3 km / 5 transfers; Tier 2: 5 km / 5 transfers)
    const tiers = [
      { radius: WALK_CONSTANTS.RELAXED_WALK_RADIUS_TIER1, maxCount: WALK_CONSTANTS.RELAXED_ACCESS_STOPS, transfers: WALK_CONSTANTS.RELAXED_MAX_TRANSFERS },
      { radius: WALK_CONSTANTS.RELAXED_WALK_RADIUS_TIER2, maxCount: 16, transfers: WALK_CONSTANTS.RELAXED_MAX_TRANSFERS }
    ];

    for (const tier of tiers) {
      const acc = resolveAccessStops(origin, tier.radius, tier.maxCount);
      const egr = resolveAccessStops(dest, tier.radius, tier.maxCount);
      const relaxedResult = this.router.planRouteWithAccessPoints(
        origin,
        dest,
        acc,
        egr,
        departureSecondsOfDay,
        tier.transfers
      );

      if (relaxedResult.itineraries.length > 0) {
        const itins = relaxedResult.itineraries.map(it => ({
          ...it,
          answerKind: 'relaxed' as AnswerKind,
          badges: [...it.badges, 'RUTE JALAN KAKI LEBIH JAUH'],
          relaxedWalkExtraMeters: Math.max(0, tier.radius - WALK_CONSTANTS.DEFAULT_WALK_RADIUS_METERS)
        }));
        return {
          itineraries: this.paretoFilter(itins),
          answerKind: 'relaxed',
          ladderLevel: 2
        };
      }
    }

    // 3. Closest Approach Answer
    const wideAcc = resolveAccessStops(origin, WALK_CONSTANTS.RELAXED_WALK_RADIUS_TIER2, 16);
    const wideSearch = this.router.runRaptor(wideAcc, departureSecondsOfDay, WALK_CONSTANTS.RELAXED_MAX_TRANSFERS);

    let bestStopIdx = -1;
    let minStraightDistToDest = Infinity;

    for (let s = 0; s < this.network.stops.length; s++) {
      if (wideSearch.bestArrival[s] < Infinity) {
        const d = haversineMeters(this.network.stops[s][2], this.network.stops[s][3], dest.lat, dest.lon);
        if (d < minStraightDistToDest) {
          minStraightDistToDest = d;
          bestStopIdx = s;
        }
      }
    }

    if (bestStopIdx !== -1) {
      const closestItin = this.router.buildClosestApproachItinerary(
        origin,
        dest,
        wideAcc,
        bestStopIdx,
        wideSearch,
        departureSecondsOfDay
      );
      if (closestItin) {
        return {
          itineraries: [closestItin],
          answerKind: 'closest-approach',
          ladderLevel: 3
        };
      }
    }

    // Fallback if origin has 0 reachable stops
    return {
      itineraries: [],
      answerKind: 'closest-approach',
      ladderLevel: 3
    };
  }

  private paretoFilter(itins: Itinerary[]): Itinerary[] {
    if (itins.length <= 1) return itins;
    const sorted = [...itins].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
    const seen = new Set<string>();
    const filtered: Itinerary[] = [];

    for (const it of sorted) {
      const sig = it.legs.map(l => `${l.type}:${l.fromStopName}->${l.toStopName}`).join('|');
      if (!seen.has(sig)) {
        seen.add(sig);
        filtered.push(it);
      }
    }

    // Assign categories
    let minDuration = Infinity;
    let minTransfers = Infinity;
    let minFare = Infinity;

    filtered.forEach(it => {
      if (it.totalDurationMinutes < minDuration) minDuration = it.totalDurationMinutes;
      if (it.transfersCount < minTransfers) minTransfers = it.transfersCount;
      if (it.standardFareIdr < minFare) minFare = it.standardFareIdr;
    });

    return filtered.map(it => {
      let category: Itinerary['category'] = 'FASTEST';
      if (it.transfersCount === minTransfers && it.transfersCount < filtered[0].transfersCount) {
        category = 'FEWEST_TRANSFERS';
      } else if (it.standardFareIdr === minFare && it.standardFareIdr < filtered[0].standardFareIdr) {
        category = 'CHEAPEST';
      }
      return { ...it, category };
    });
  }
}
