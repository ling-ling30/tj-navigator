/** The engine's surface for the app: one object that the worker exposes, and that also runs on the main thread as a fallback. */
import type { NetworkV2 } from '../../../types/network-v2';
import type { TravelOptions } from './cost-profiles';
import { Planner, type PlaceInput } from './planner';
import { secondsOfDay } from './time-model';
import { toPlanView, type PlanView } from './to-itinerary';

export interface PlanRequest {
  origin: PlaceInput & { name: string };
  destination: PlaceInput & { name: string };
  /** Epoch milliseconds. */
  departAtMs: number;
  /** Mode groups switched on; null = all. */
  modes: number[] | null;
  options: TravelOptions;
}

export function createPlannerApi() {
  let planner: Planner | null = null;
  let stamp: string | null = null;

  return {
    init(net: NetworkV2): boolean {
      if (!planner || stamp !== net.generatedAt) {
        planner = new Planner(net);
        stamp = net.generatedAt;
      }
      return true;
    },

    plan(request: PlanRequest): PlanView {
      if (!planner) throw new Error('The routing engine is not initialised');
      const departAt = new Date(request.departAtMs);
      const started = performance.now();
      const result = planner.plan({
        origin: request.origin, destination: request.destination, departAt,
        modes: request.modes, options: request.options
      });
      if (import.meta.env?.DEV) {
        console.log(`[Planner] ${result.options.length} option(s), ${result.answerKind}, ${(performance.now() - started).toFixed(0)} ms`);
      }
      const used = result.laterDepartureMs !== undefined ? new Date(result.laterDepartureMs) : departAt;
      return toPlanView(planner.ix, result, secondsOfDay(used), request.origin, request.destination);
    }
  };
}

export type PlannerApi = ReturnType<typeof createPlannerApi>;
