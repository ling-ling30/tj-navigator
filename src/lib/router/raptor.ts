import type { CompiledTransitNetwork, Itinerary, Leg, TransitModeType, AnswerKind } from '../../types/transit';
import { TransitMode } from '../../types/transit';
import { calculateItineraryFare } from '../fare/fare-engine';
import { WALK_CONSTANTS, type AccessStop, haversineMeters } from './access-stops';

export interface MarkedStops {
  [stopIndex: number]: boolean;
}

export interface TransitParent {
  fromStopIdx: number;
  routeIdx: number;
  boardTime: number;
  alightTime: number;
  hopCount: number;
}

export interface TransferParent {
  fromStopIdx: number;
  walkSec: number;
  distM: number;
  isPaidArea: boolean;
  isSheltered: boolean;
  isStepFree: boolean;
}

export interface RawRaptorResult {
  earliestArrival: number[][];
  bestArrival: number[];
  parentTransit: (TransitParent | null)[][];
  parentTransfer: (TransferParent | null)[][];
  maxRounds: number;
}

export interface SimpleLocation {
  stopIndex?: number;
  lat: number;
  lon: number;
  name?: string;
}

export class RaptorRouter {
  private network: CompiledTransitNetwork;

  constructor(network: CompiledTransitNetwork) {
    this.network = network;
  }

  public getNetwork(): CompiledTransitNetwork {
    return this.network;
  }

  /**
   * Run raw RAPTOR forward rounds from a set of access stops
   */
  public runRaptor(
    accessStops: AccessStop[],
    departureSecondsOfDay: number = 8 * 3600,
    maxTransfers: number = WALK_CONSTANTS.DEFAULT_MAX_TRANSFERS
  ): RawRaptorResult {
    const { stops, routes, stopRoutes, transfers } = this.network;
    const maxRounds = maxTransfers;

    const earliestArrival: number[][] = Array.from({ length: maxRounds + 1 }, () =>
      new Array(stops.length).fill(Infinity)
    );
    const bestArrival = new Array(stops.length).fill(Infinity);

    const parentTransit: (TransitParent | null)[][] = Array.from({ length: maxRounds + 1 }, () =>
      new Array(stops.length).fill(null)
    );
    const parentTransfer: (TransferParent | null)[][] = Array.from({ length: maxRounds + 1 }, () =>
      new Array(stops.length).fill(null)
    );

    let markedStops: MarkedStops = {};

    // Round 0: Seed access stops
    for (const acc of accessStops) {
      if (acc.stopIndex < 0 || acc.stopIndex >= stops.length) continue;
      const arr = departureSecondsOfDay + acc.walkSeconds;
      if (arr < earliestArrival[0][acc.stopIndex]) {
        earliestArrival[0][acc.stopIndex] = arr;
        bestArrival[acc.stopIndex] = arr;
        markedStops[acc.stopIndex] = true;
      }
    }

    // Round 0: Explore initial walking transfers from access stops
    for (const acc of accessStops) {
      if (acc.stopIndex < 0 || acc.stopIndex >= stops.length) continue;
      for (const transfer of transfers) {
        const [fromIdx, toIdx, walkSec, distM, isPaid, gateBuf, peakPen, isSheltered, isStepFree] = transfer;
        if (fromIdx === acc.stopIndex) {
          const totalWalk = walkSec + (gateBuf || 0) + (peakPen || 0);
          const arr = departureSecondsOfDay + acc.walkSeconds + totalWalk;
          if (arr < earliestArrival[0][toIdx]) {
            earliestArrival[0][toIdx] = arr;
            bestArrival[toIdx] = arr;
            markedStops[toIdx] = true;
            parentTransfer[0][toIdx] = {
              fromStopIdx: acc.stopIndex,
              walkSec: totalWalk,
              distM: distM || Math.round(totalWalk * 1.1),
              isPaidArea: isPaid === 1,
              isSheltered: isSheltered === 1,
              isStepFree: isStepFree === 1
            };
          }
        }
      }
    }

    // RAPTOR Rounds
    for (let k = 1; k <= maxRounds; k++) {
      for (let s = 0; s < stops.length; s++) {
        earliestArrival[k][s] = earliestArrival[k - 1][s];
      }

      // 1. Accumulate routes serving marked stops
      const queueRoutes = new Set<number>();
      for (const stopIdxStr of Object.keys(markedStops)) {
        const stopIdx = Number(stopIdxStr);
        const routesAtStop = stopRoutes[stopIdx] || [];
        for (const rIdx of routesAtStop) {
          queueRoutes.add(rIdx);
        }
      }

      markedStops = {};
      const transitUpdatedInRound = new Set<number>();

      // 2. Scan each accumulated route
      for (const rIdx of queueRoutes) {
        const route = routes[rIdx];
        const [, , , , stopSeq, headwaySec] = route;

        let boardingStopIdx: number | null = null;
        let boardTime = Infinity;

        for (let p = 0; p < stopSeq.length; p++) {
          const currentStop = stopSeq[p];

          if (boardingStopIdx !== null && boardTime < Infinity) {
            const hopCount = p - stopSeq.indexOf(boardingStopIdx);
            const mode = stops[boardingStopIdx][4];
            const perHopSec =
              mode === TransitMode.MRT ? 140 :
              mode === TransitMode.COMMUTER_RAIL ? 160 :
              mode === TransitMode.LRT ? 150 :
              mode === TransitMode.BRT ? 170 : 180;
            const transitTimeSec = hopCount * perHopSec;
            const arrTime = boardTime + transitTimeSec;

            if (arrTime < earliestArrival[k][currentStop] && arrTime < bestArrival[currentStop]) {
              earliestArrival[k][currentStop] = arrTime;
              bestArrival[currentStop] = arrTime;
              markedStops[currentStop] = true;
              transitUpdatedInRound.add(currentStop);
              parentTransit[k][currentStop] = {
                fromStopIdx: boardingStopIdx,
                routeIdx: rIdx,
                boardTime,
                alightTime: arrTime,
                hopCount
              };
              parentTransfer[k][currentStop] = null;
            }
          }

          const prevRoundArrival = earliestArrival[k - 1][currentStop];
          if (prevRoundArrival < Infinity) {
            const minBuffer = WALK_CONSTANTS.MIN_TRANSFER_BUFFER_SECONDS;
            const nextDeparture = prevRoundArrival + Math.max(minBuffer, Math.round(headwaySec / 2));
            if (boardingStopIdx === null || nextDeparture < boardTime) {
              boardingStopIdx = currentStop;
              boardTime = nextDeparture;
            }
          }
        }
      }

      // 3. Process transfer edges for stops reached by transit in this round
      for (const transfer of transfers) {
        const [fromIdx, toIdx, walkSec, distM, isPaid, gateBuf, peakPen, isSheltered, isStepFree] = transfer;
        if (transitUpdatedInRound.has(fromIdx) && earliestArrival[k][fromIdx] < Infinity) {
          const totalWalk = walkSec + (gateBuf || 0) + (peakPen || 0);
          const arr = earliestArrival[k][fromIdx] + totalWalk;
          if (arr < earliestArrival[k][toIdx] && arr < bestArrival[toIdx]) {
            earliestArrival[k][toIdx] = arr;
            bestArrival[toIdx] = arr;
            markedStops[toIdx] = true;
            parentTransfer[k][toIdx] = {
              fromStopIdx: fromIdx,
              walkSec: totalWalk,
              distM: distM || Math.round(totalWalk * 1.1),
              isPaidArea: isPaid === 1,
              isSheltered: isSheltered === 1,
              isStepFree: isStepFree === 1
            };
          }
        }
      }

      if (Object.keys(markedStops).length === 0) break;
    }

    return {
      earliestArrival,
      bestArrival,
      parentTransit,
      parentTransfer,
      maxRounds
    };
  }

  /**
   * Plan route with multiple access and egress stops (Coordinate or Stop inputs)
   */
  public planRouteWithAccessPoints(
    origin: SimpleLocation,
    dest: SimpleLocation,
    accessStops: AccessStop[],
    egressStops: AccessStop[],
    departureSecondsOfDay: number = 8 * 3600,
    maxTransfers: number = WALK_CONSTANTS.DEFAULT_MAX_TRANSFERS
  ): { itineraries: Itinerary[] } {
    if (accessStops.length === 0 || egressStops.length === 0) {
      return { itineraries: [] };
    }

    const raw = this.runRaptor(accessStops, departureSecondsOfDay, maxTransfers);
    const { stops } = this.network;
    const accessMap = new Map<number, AccessStop>();
    accessStops.forEach(a => accessMap.set(a.stopIndex, a));

    const results: Itinerary[] = [];

    // Check round 0 direct walk connections
    for (const egr of egressStops) {
      const pTrans = raw.parentTransfer[0][egr.stopIndex];
      if (raw.earliestArrival[0][egr.stopIndex] < Infinity && pTrans) {
        const acc = accessMap.get(pTrans.fromStopIdx);
        const accWalkSec = acc ? acc.walkSeconds : 0;
        const accWalkM = acc ? acc.distanceMeters : 0;
        const totalSec = accWalkSec + pTrans.walkSec + egr.walkSeconds;
        const totalMin = Math.max(1, Math.round(totalSec / 60));

        const legs: Leg[] = [];
        if (accWalkM > 0) {
          legs.push(this.createWalkLeg(
            origin.name || `${origin.lat.toFixed(4)}, ${origin.lon.toFixed(4)}`,
            undefined,
            stops[pTrans.fromStopIdx][1],
            stops[pTrans.fromStopIdx][0],
            departureSecondsOfDay,
            accWalkSec,
            accWalkM
          ));
        }

        legs.push(this.createWalkLeg(
          stops[pTrans.fromStopIdx][1],
          stops[pTrans.fromStopIdx][0],
          stops[egr.stopIndex][1],
          stops[egr.stopIndex][0],
          departureSecondsOfDay + accWalkSec,
          pTrans.walkSec,
          pTrans.distM,
          pTrans.isPaidArea,
          pTrans.isSheltered,
          pTrans.isStepFree
        ));

        if (egr.distanceMeters > 0) {
          legs.push(this.createWalkLeg(
            stops[egr.stopIndex][1],
            stops[egr.stopIndex][0],
            dest.name || `${dest.lat.toFixed(4)}, ${dest.lon.toFixed(4)}`,
            undefined,
            departureSecondsOfDay + accWalkSec + pTrans.walkSec,
            egr.walkSeconds,
            egr.distanceMeters
          ));
        }

        results.push({
          id: `itin-r0-${egr.stopIndex}`,
          category: 'FASTEST',
          totalDurationMinutes: totalMin,
          nominalDurationMinutes: totalMin,
          trafficDelayMinutes: 0,
          departureTime: this.formatTime(departureSecondsOfDay),
          arrivalTime: this.formatTime(departureSecondsOfDay + totalSec),
          standardFareIdr: 0,
          integratedFareIdr: 0,
          transfersCount: 0,
          legs,
          badges: ['WALK ONLY', 'FASTEST']
        });
      }
    }

    // Check rounds 1..maxTransfers
    for (const egr of egressStops) {
      for (let k = 1; k <= raw.maxRounds; k++) {
        if (raw.earliestArrival[k][egr.stopIndex] < Infinity) {
          const transitLegs = this.backtrackLegs(
            raw.parentTransit,
            raw.parentTransfer,
            raw.earliestArrival,
            k,
            egr.stopIndex,
            departureSecondsOfDay
          );

          if (transitLegs.length > 0) {
            const firstLeg = transitLegs[0];
            const firstStopIdx = stops.findIndex(s => s[0] === firstLeg.fromStopId);
            const acc = accessMap.get(firstStopIdx);
            const legs: Leg[] = [];

            // Add origin access walk leg if distance > 0
            if (acc && acc.distanceMeters > 0) {
              legs.push(this.createWalkLeg(
                origin.name || `${origin.lat.toFixed(4)}, ${origin.lon.toFixed(4)}`,
                undefined,
                stops[firstStopIdx][1],
                stops[firstStopIdx][0],
                departureSecondsOfDay,
                acc.walkSeconds,
                acc.distanceMeters
              ));
            }

            legs.push(...transitLegs);

            // Add destination egress walk leg if distance > 0
            if (egr.distanceMeters > 0) {
              const transitArrSec = raw.earliestArrival[k][egr.stopIndex];
              legs.push(this.createWalkLeg(
                stops[egr.stopIndex][1],
                stops[egr.stopIndex][0],
                dest.name || `${dest.lat.toFixed(4)}, ${dest.lon.toFixed(4)}`,
                undefined,
                transitArrSec,
                egr.walkSeconds,
                egr.distanceMeters
              ));
            }

            const totalSec = raw.earliestArrival[k][egr.stopIndex] + egr.walkSeconds - departureSecondsOfDay;
            const totalMin = Math.round(totalSec / 60);
            const fare = calculateItineraryFare(legs);
            const transitCount = legs.filter(l => l.type === 'TRANSIT').length;
            const hasTransferWalk = legs.some(l => l.type === 'WALK' && !l.isUncoveredSegment);
            const transfersCount = transitCount <= 1 ? (hasTransferWalk && transitCount === 1 && legs.length > 2 ? 1 : 0) : transitCount - 1;

            results.push({
              id: `itin-r${k}-${egr.stopIndex}`,
              category: transfersCount === 0 ? 'FEWEST_TRANSFERS' : 'FASTEST',
              totalDurationMinutes: totalMin,
              nominalDurationMinutes: totalMin,
              trafficDelayMinutes: 0,
              departureTime: this.formatTime(departureSecondsOfDay),
              arrivalTime: this.formatTime(raw.earliestArrival[k][egr.stopIndex] + egr.walkSeconds),
              standardFareIdr: fare.standardFareIdr,
              integratedFareIdr: fare.integratedFareIdr,
              transfersCount,
              legs,
              badges: transfersCount === 0 ? ['0 TRANSFERS', 'DIRECT ROUTE'] : ['FASTEST']
            });
          }
        }
      }
    }

    const seen = new Set<string>();
    const unique = results.filter(itin => {
      const sig = itin.legs.map(l => `${l.type}:${l.fromStopName}->${l.toStopName}`).join('|');
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });

    return { itineraries: unique.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes) };
  }

  /**
   * Build closest-approach itinerary when destination is unreachable
   */
  public buildClosestApproachItinerary(
    origin: SimpleLocation,
    dest: SimpleLocation,
    accessStops: AccessStop[],
    bestStopIdx: number,
    raw: RawRaptorResult,
    departureSecondsOfDay: number
  ): Itinerary | null {
    const { stops } = this.network;
    let bestRound = 1;
    let earliestArr = Infinity;

    for (let k = 1; k <= raw.maxRounds; k++) {
      if (raw.earliestArrival[k][bestStopIdx] < earliestArr) {
        earliestArr = raw.earliestArrival[k][bestStopIdx];
        bestRound = k;
      }
    }

    if (earliestArr === Infinity) return null;

    const transitLegs = this.backtrackLegs(
      raw.parentTransit,
      raw.parentTransfer,
      raw.earliestArrival,
      bestRound,
      bestStopIdx,
      departureSecondsOfDay
    );

    if (transitLegs.length === 0) return null;

    const firstLeg = transitLegs[0];
    const firstStopIdx = stops.findIndex(s => s[0] === firstLeg.fromStopId);
    const accessMap = new Map<number, AccessStop>();
    accessStops.forEach(a => accessMap.set(a.stopIndex, a));
    const acc = accessMap.get(firstStopIdx);

    const legs: Leg[] = [];
    if (acc && acc.distanceMeters > 0) {
      legs.push(this.createWalkLeg(
        origin.name || `${origin.lat.toFixed(4)}, ${origin.lon.toFixed(4)}`,
        undefined,
        stops[firstStopIdx][1],
        stops[firstStopIdx][0],
        departureSecondsOfDay,
        acc.walkSeconds,
        acc.distanceMeters
      ));
    }

    legs.push(...transitLegs);

    // Explicit remaining uncovered segment
    const straightRemaining = haversineMeters(stops[bestStopIdx][2], stops[bestStopIdx][3], dest.lat, dest.lon);
    const uncoveredMeters = Math.round(straightRemaining * WALK_CONSTANTS.WALK_DETOUR_FACTOR);
    const uncoveredSec = Math.round(uncoveredMeters / WALK_CONSTANTS.WALK_SPEED_MPS);
    const uncoveredMin = Math.max(1, Math.round(uncoveredSec / 60));

    legs.push({
      type: 'WALK',
      fromStopName: stops[bestStopIdx][1],
      fromStopId: stops[bestStopIdx][0],
      toStopName: dest.name || `${dest.lat.toFixed(4)}, ${dest.lon.toFixed(4)}`,
      departureTime: this.formatTime(earliestArr),
      arrivalTime: this.formatTime(earliestArr + uncoveredSec),
      durationSeconds: uncoveredSec,
      distanceMeters: uncoveredMeters,
      isUncoveredSegment: true
    });

    const totalSec = earliestArr + uncoveredSec - departureSecondsOfDay;
    const totalMin = Math.round(totalSec / 60);
    const fare = calculateItineraryFare(transitLegs);
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${stops[bestStopIdx][2]},${stops[bestStopIdx][3]}&destination=${dest.lat},${dest.lon}`;

    return {
      id: `itin-closest-${bestStopIdx}`,
      category: 'FASTEST',
      totalDurationMinutes: totalMin,
      nominalDurationMinutes: totalMin,
      trafficDelayMinutes: 0,
      departureTime: this.formatTime(departureSecondsOfDay),
      arrivalTime: this.formatTime(earliestArr + uncoveredSec),
      standardFareIdr: fare.standardFareIdr,
      integratedFareIdr: fare.integratedFareIdr,
      transfersCount: transitLegs.filter(l => l.type === 'TRANSIT').length - 1,
      legs,
      badges: ['PENDEKATAN TERDEKAT', 'CLOSEST APPROACH'],
      answerKind: 'closest-approach' as AnswerKind,
      uncoveredDistanceMeters: uncoveredMeters,
      uncoveredDurationMinutes: uncoveredMin,
      uncoveredOriginLat: stops[bestStopIdx][2],
      uncoveredOriginLon: stops[bestStopIdx][3],
      uncoveredDestLat: dest.lat,
      uncoveredDestLon: dest.lon,
      googleMapsUrl: gmapsUrl
    };
  }

  /**
   * Classic Stop-to-Stop journey planner (Maintains 100% backward compatibility for audit tests)
   */
  public planJourney(
    originStopIdx: number,
    destStopIdx: number,
    departureSecondsOfDay: number = 8 * 3600,
    maxTransfers: number = WALK_CONSTANTS.DEFAULT_MAX_TRANSFERS
  ): Itinerary[] {
    if (originStopIdx === destStopIdx || originStopIdx < 0 || destStopIdx < 0) {
      return [];
    }

    const { stops } = this.network;
    const originLoc = { stopIndex: originStopIdx, lat: stops[originStopIdx][2], lon: stops[originStopIdx][3], name: stops[originStopIdx][1] };
    const destLoc = { stopIndex: destStopIdx, lat: stops[destStopIdx][2], lon: stops[destStopIdx][3], name: stops[destStopIdx][1] };
    const acc = [{ stopIndex: originStopIdx, distanceMeters: 0, walkSeconds: 0 }];
    const egr = [{ stopIndex: destStopIdx, distanceMeters: 0, walkSeconds: 0 }];

    const result = this.planRouteWithAccessPoints(originLoc, destLoc, acc, egr, departureSecondsOfDay, maxTransfers);
    return result.itineraries;
  }

  private backtrackLegs(
    parentTransit: (TransitParent | null)[][],
    parentTransfer: (TransferParent | null)[][],
    earliestArrival: number[][],
    startRound: number,
    destIdx: number,
    depSec: number
  ): Leg[] {
    const legs: Leg[] = [];
    const { stops, routes } = this.network;

    let currStop = destIdx;
    let currRound = startRound;

    while (currRound >= 1) {
      // 1. Transfer arriving at currStop in currRound
      const pTrans = parentTransfer[currRound][currStop];
      let fromTransitStop = currStop;

      if (pTrans) {
        legs.unshift({
          type: 'WALK',
          fromStopName: stops[pTrans.fromStopIdx][1],
          fromStopId: stops[pTrans.fromStopIdx][0],
          toStopName: stops[currStop][1],
          toStopId: stops[currStop][0],
          departureTime: this.formatTime(earliestArrival[currRound][pTrans.fromStopIdx]),
          arrivalTime: this.formatTime(earliestArrival[currRound][currStop]),
          durationSeconds: pTrans.walkSec,
          distanceMeters: pTrans.distM,
          isPaidAreaTransfer: pTrans.isPaidArea,
          isSheltered: pTrans.isSheltered,
          isStepFree: pTrans.isStepFree
        });
        fromTransitStop = pTrans.fromStopIdx;
      }

      // 2. Transit arriving at fromTransitStop in currRound
      const pTransit = parentTransit[currRound][fromTransitStop];
      if (pTransit) {
        const route = routes[pTransit.routeIdx];
        const stopSeq = route[4];
        const fromPos = stopSeq.indexOf(pTransit.fromStopIdx);
        const toPos = stopSeq.indexOf(fromTransitStop);
        const hopCount = Math.max(1, toPos - fromPos);
        const intermediateStopCount = Math.max(0, hopCount - 1);
        const intermediateStopNames: string[] = [];

        for (let p = fromPos + 1; p < toPos; p++) {
          intermediateStopNames.push(stops[stopSeq[p]][1]);
        }

        const stopDistances = route[6];
        let distanceMeters = 0;
        if (stopDistances && stopDistances[toPos] !== undefined && stopDistances[fromPos] !== undefined) {
          distanceMeters = Math.abs(stopDistances[toPos] - stopDistances[fromPos]);
        } else {
          for (let p = fromPos; p < toPos; p++) {
            const s1 = stops[stopSeq[p]];
            const s2 = stops[stopSeq[p + 1]];
            distanceMeters += haversineMeters(s1[2], s1[3], s2[2], s2[3]);
          }
        }

        const durationSeconds = Math.max(60, pTransit.alightTime - pTransit.boardTime);
        const prevTransfer = parentTransfer[currRound - 1]?.[pTransit.fromStopIdx] || parentTransfer[0]?.[pTransit.fromStopIdx];
        const isPaidAreaTransit = Boolean(prevTransfer && prevTransfer.isPaidArea);

        legs.unshift({
          type: 'TRANSIT',
          mode: stops[pTransit.fromStopIdx][4] as TransitModeType,
          routeId: route[0],
          routeShortName: route[1],
          routeColor: route[3],
          fromStopName: stops[pTransit.fromStopIdx][1],
          fromStopId: stops[pTransit.fromStopIdx][0],
          toStopName: stops[fromTransitStop][1],
          toStopId: stops[fromTransitStop][0],
          departureTime: this.formatTime(pTransit.boardTime),
          arrivalTime: this.formatTime(pTransit.alightTime),
          durationSeconds,
          distanceMeters,
          intermediateStopCount,
          intermediateStopNames,
          isPaidAreaTransfer: isPaidAreaTransit,
          headwaySeconds: route[5]
        });

        currStop = pTransit.fromStopIdx;
      }

      currRound--;
    }

    // Check round 0 transfer into the first transit stop
    const r0Trans = parentTransfer[0][currStop];
    if (r0Trans) {
      legs.unshift({
        type: 'WALK',
        fromStopName: stops[r0Trans.fromStopIdx][1],
        fromStopId: stops[r0Trans.fromStopIdx][0],
        toStopName: stops[currStop][1],
        toStopId: stops[currStop][0],
        departureTime: this.formatTime(depSec),
        arrivalTime: this.formatTime(depSec + r0Trans.walkSec),
        durationSeconds: r0Trans.walkSec,
        distanceMeters: r0Trans.distM,
        isPaidAreaTransfer: r0Trans.isPaidArea,
        isSheltered: r0Trans.isSheltered,
        isStepFree: r0Trans.isStepFree
      });
    }

    return legs;
  }

  private createWalkLeg(
    fromName: string,
    fromId: string | undefined,
    toName: string,
    toId: string | undefined,
    departureSec: number,
    durationSec: number,
    distMeters: number,
    isPaid = false,
    isSheltered = false,
    isStepFree = false
  ): Leg {
    return {
      type: 'WALK',
      fromStopName: fromName,
      fromStopId: fromId,
      toStopName: toName,
      toStopId: toId,
      departureTime: this.formatTime(departureSec),
      arrivalTime: this.formatTime(departureSec + durationSec),
      durationSeconds: durationSec,
      distanceMeters: distMeters,
      isPaidAreaTransfer: isPaid,
      isSheltered,
      isStepFree
    };
  }

  public formatTime(sec: number): string {
    const rounded = Math.round(sec / 60) * 60;
    const h = Math.floor(rounded / 3600) % 24;
    const m = Math.floor((rounded % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
