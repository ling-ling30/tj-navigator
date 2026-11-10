import type { CompiledTransitNetwork, Itinerary, Leg, TransitModeType } from '../../types/transit';
import { TransitMode } from '../../types/transit';

interface MarkedStops {
  [stopIndex: number]: boolean;
}

export class RaptorRouter {
  private network: CompiledTransitNetwork;

  constructor(network: CompiledTransitNetwork) {
    this.network = network;
  }

  /**
   * Find Pareto-optimal candidate itineraries between origin and destination stop
   */
  public planJourney(
    originStopIdx: number,
    destStopIdx: number,
    departureSecondsOfDay: number = 22 * 3600 + 30 * 60
  ): Itinerary[] {
    const { stops, routes, stopRoutes, transfers } = this.network;
    const MAX_ROUNDS = 3; // Up to 3 transfers

    // earliestArrival[round][stopIndex] = arrivalSeconds
    const earliestArrival: number[][] = Array.from({ length: MAX_ROUNDS + 1 }, () =>
      new Array(stops.length).fill(Infinity)
    );

    // bestArrival[stopIndex] = best arrival time found across all rounds
    const bestArrival = new Array(stops.length).fill(Infinity);

    // Backtrack pointers: parent[round][stopIndex] = { fromStopIdx, routeIdx, boardTime, walkSec }
    interface ParentPointer {
      fromStopIdx: number;
      routeIdx?: number;
      boardTime?: number;
      walkSec?: number;
      isTransfer?: boolean;
    }
    const parent: (ParentPointer | null)[][] = Array.from({ length: MAX_ROUNDS + 1 }, () =>
      new Array(stops.length).fill(null)
    );

    earliestArrival[0][originStopIdx] = departureSecondsOfDay;
    bestArrival[originStopIdx] = departureSecondsOfDay;

    let markedStops: MarkedStops = { [originStopIdx]: true };

    // Explore initial walking transfers from origin stop
    for (const transfer of transfers) {
      const [fromIdx, toIdx, walkSec] = transfer;
      if (fromIdx === originStopIdx) {
        const arr = departureSecondsOfDay + walkSec;
        if (arr < earliestArrival[0][toIdx]) {
          earliestArrival[0][toIdx] = arr;
          bestArrival[toIdx] = arr;
          markedStops[toIdx] = true;
          parent[0][toIdx] = { fromStopIdx: originStopIdx, walkSec, isTransfer: true };
        }
      }
    }

    // RAPTOR Rounds
    for (let k = 1; k <= MAX_ROUNDS; k++) {
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

      // 2. Scan each accumulated route
      for (const rIdx of queueRoutes) {
        const route = routes[rIdx];
        const [rId, rShort, rLong, rColor, stopSeq, headwaySec] = route;

        let boardingStopIdx: number | null = null;
        let boardTime = Infinity;

        for (let p = 0; p < stopSeq.length; p++) {
          const currentStop = stopSeq[p];

          // Check if we can improve arrival at currentStop using the currently boarded trip
          if (boardingStopIdx !== null && boardTime < Infinity) {
            // Nominal transit runtime between boarding and current stop
            const hopCount = p - stopSeq.indexOf(boardingStopIdx);
            const transitTimeSec = hopCount * 120; // Avg 2 min per transit stop
            const arrTime = boardTime + transitTimeSec;

            if (arrTime < bestArrival[currentStop]) {
              earliestArrival[k][currentStop] = arrTime;
              bestArrival[currentStop] = arrTime;
              markedStops[currentStop] = true;
              parent[k][currentStop] = {
                fromStopIdx: boardingStopIdx,
                routeIdx: rIdx,
                boardTime
              };
            }
          }

          // Check if we can board at currentStop
          const prevRoundArrival = earliestArrival[k - 1][currentStop];
          if (prevRoundArrival < Infinity) {
            // Next departure based on headway
            const nextDeparture = prevRoundArrival + Math.max(60, headwaySec / 2);
            if (boardingStopIdx === null || nextDeparture < boardTime) {
              boardingStopIdx = currentStop;
              boardTime = nextDeparture;
            }
          }
        }
      }

      // 3. Process footpaths / transfer edges for stops updated in this round
      for (const transfer of transfers) {
        const [fromIdx, toIdx, walkSec, distM, isPaid, gateBuf, peakPen] = transfer;
        const totalWalk = walkSec + gateBuf + peakPen;

        if (earliestArrival[k][fromIdx] < Infinity) {
          const arr = earliestArrival[k][fromIdx] + totalWalk;
          if (arr < earliestArrival[k][toIdx] && arr < bestArrival[toIdx]) {
            earliestArrival[k][toIdx] = arr;
            bestArrival[toIdx] = arr;
            markedStops[toIdx] = true;
            parent[k][toIdx] = {
              fromStopIdx: fromIdx,
              walkSec: totalWalk,
              isTransfer: true
            };
          }
        }
      }

      if (Object.keys(markedStops).length === 0) break;
    }

    // Reconstruct itineraries from target stop
    const results: Itinerary[] = [];

    // Find best round reaching destination
    for (let k = 1; k <= MAX_ROUNDS; k++) {
      if (earliestArrival[k][destStopIdx] < Infinity) {
        const legs = this.backtrackLegs(parent, k, originStopIdx, destStopIdx, departureSecondsOfDay);
        if (legs.length > 0) {
          const totalSec = earliestArrival[k][destStopIdx] - departureSecondsOfDay;
          const totalMin = Math.round(totalSec / 60);

          results.push({
            id: `itin-r${k}-${destStopIdx}`,
            category: k === 1 ? 'FEWEST_TRANSFERS' : 'FASTEST',
            totalDurationMinutes: totalMin,
            nominalDurationMinutes: totalMin,
            trafficDelayMinutes: 0,
            departureTime: this.formatTime(departureSecondsOfDay),
            arrivalTime: this.formatTime(earliestArrival[k][destStopIdx]),
            standardFareIdr: k === 1 ? 3500 : 6500,
            integratedFareIdr: 3500,
            transfersCount: k - 1,
            legs,
            badges: k === 1 ? ['0 TRANSFERS', '🟢 DIRECT ROUTE'] : ['⚡ FASTEST', '☂️ COVERED SKYWALK']
          });
        }
      }
    }

    return results;
  }

  private backtrackLegs(
    parent: any[][],
    startRound: number,
    originIdx: number,
    destIdx: number,
    depSec: number
  ): Leg[] {
    const legs: Leg[] = [];
    const { stops, routes } = this.network;

    let currStop = destIdx;
    let currRound = startRound;

    while (currStop !== originIdx && currRound >= 0) {
      const p = parent[currRound][currStop];
      if (!p) {
        currRound--;
        continue;
      }

      const fromStopName = stops[p.fromStopIdx][1];
      const toStopName = stops[currStop][1];

      if (p.isTransfer) {
        legs.unshift({
          type: 'WALK',
          fromStopName,
          toStopName,
          departureTime: this.formatTime(depSec),
          arrivalTime: this.formatTime(depSec + (p.walkSec || 180)),
          durationSeconds: p.walkSec || 180,
          distanceMeters: Math.round((p.walkSec || 180) * 1.0),
          isPaidAreaTransfer: true,
          isSheltered: true,
          isStepFree: true
        });
      } else if (p.routeIdx !== undefined) {
        const route = routes[p.routeIdx];
        legs.unshift({
          type: 'TRANSIT',
          mode: stops[p.fromStopIdx][4] as TransitModeType,
          routeId: route[0],
          routeShortName: route[1],
          routeColor: route[3],
          fromStopName,
          toStopName,
          departureTime: this.formatTime(p.boardTime),
          arrivalTime: this.formatTime(p.boardTime + 600),
          durationSeconds: 600,
          distanceMeters: 4500,
          intermediateStopCount: 4
        });
      }

      currStop = p.fromStopIdx;
      currRound--;
    }

    return legs;
  }

  private formatTime(sec: number): string {
    const h = Math.floor(sec / 3600) % 24;
    const m = Math.floor((sec % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
