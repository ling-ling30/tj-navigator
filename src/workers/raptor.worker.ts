import * as Comlink from 'comlink';
import { RaptorRouter } from '../lib/router/raptor';
import { JourneyPlanner, type LocationInput, type LadderResult } from '../lib/router/journey-planner';
import type { CompiledTransitNetwork, Itinerary } from '../types/transit';

let routerInstance: RaptorRouter | null = null;
let plannerInstance: JourneyPlanner | null = null;
let initializedVersion: string | null = null;

export const workerApi = {
  init(network: CompiledTransitNetwork) {
    if (routerInstance && initializedVersion === network.version) {
      return true;
    }
    routerInstance = new RaptorRouter(network);
    plannerInstance = new JourneyPlanner(routerInstance);
    initializedVersion = network.version;
    if (import.meta.env?.DEV) {
      console.log(`[Worker] RAPTOR initialized with ${network.stops.length} stops and ${network.routes.length} routes.`);
    }
    return true;
  },

  planJourney(originStopIdx: number, destStopIdx: number, departureSeconds: number): Itinerary[] {
    if (!routerInstance) throw new Error('Worker RAPTOR not initialized');
    const start = performance.now();
    const results = routerInstance.planJourney(originStopIdx, destStopIdx, departureSeconds);
    const duration = performance.now() - start;
    if (import.meta.env?.DEV) {
      console.log(`[Worker] Journey computed in ${duration.toFixed(2)}ms (${results.length} Pareto options).`);
    }
    return results;
  },

  planJourneyWithLadder(origin: LocationInput, dest: LocationInput, departureSeconds: number): LadderResult {
    if (!plannerInstance) throw new Error('Worker JourneyPlanner not initialized');
    const start = performance.now();
    const result = plannerInstance.plan(origin, dest, departureSeconds);
    const duration = performance.now() - start;
    if (import.meta.env?.DEV) {
      console.log(`[Worker] Ladder journey computed in ${duration.toFixed(2)}ms (${result.itineraries.length} options, level: ${result.ladderLevel}, kind: ${result.answerKind}).`);
    }
    return result;
  }
};

Comlink.expose(workerApi);
