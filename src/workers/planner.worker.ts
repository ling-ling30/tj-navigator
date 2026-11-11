/** Web Worker that owns the routing engine (v2), so a search never blocks the screen. */
import * as Comlink from 'comlink';
import { createPlannerApi } from '../lib/router/v2/planner-api';

Comlink.expose(createPlannerApi());
