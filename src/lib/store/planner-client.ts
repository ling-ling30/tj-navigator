/** Reaches the routing engine: in a Web Worker when possible, on the main thread otherwise. */
import * as Comlink from 'comlink';
import type { NetworkV2 } from '../../types/network-v2';
import type { PlannerApi, PlanRequest } from '../router/v2/planner-api';
import type { PlanView } from '../router/v2/to-itinerary';

type Remote = Comlink.Remote<PlannerApi>;

let remote: Remote | null = null;
let local: PlannerApi | null = null;

async function localApi(): Promise<PlannerApi> {
  if (!local) local = (await import('../router/v2/planner-api')).createPlannerApi();
  return local;
}

export async function initPlanner(net: NetworkV2): Promise<void> {
  try {
    const worker = new Worker(new URL('../../workers/planner.worker.ts', import.meta.url), { type: 'module' });
    const api = Comlink.wrap<PlannerApi>(worker);
    await api.init(net);
    remote = api;
  } catch {
    remote = null;
    (await localApi()).init(net);
  }
}

export async function planJourney(request: PlanRequest): Promise<PlanView> {
  if (remote) {
    try {
      return await remote.plan(request);
    } catch (err) {
      if (!local) throw err;
    }
  }
  return (await localApi()).plan(request);
}
