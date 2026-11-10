import * as Comlink from 'comlink';
import { RaptorRouter } from '../lib/router/raptor';
import type { CompiledTransitNetwork, Itinerary } from '../types/transit';

let routerInstance: RaptorRouter | null = null;

export const workerApi = {
  init(network: CompiledTransitNetwork) {
    routerInstance = new RaptorRouter(network);
    console.log(`🚀 [Worker] RAPTOR initialized with ${network.stops.length} stops and ${network.routes.length} routes.`);
    return true;
  },

  planJourney(originStopIdx: number, destStopIdx: number, departureSeconds: number): Itinerary[] {
    if (!routerInstance) throw new Error('Worker RAPTOR not initialized');
    const start = performance.now();
    const results = routerInstance.planJourney(originStopIdx, destStopIdx, departureSeconds);
    const duration = performance.now() - start;
    console.log(`⏱️ [Worker] Journey computed in ${duration.toFixed(2)}ms (${results.length} Pareto options).`);
    return results;
  }
};

Comlink.expose(workerApi);
