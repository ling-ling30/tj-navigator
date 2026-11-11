/**
 * The stop picker and search screens still read the old graph shape (stops with a mode, routes per stop).
 * This builds that view from graph v2, so those screens work unchanged. Stop indexes are the v2 indexes.
 */
import { ModeGroup, type NetworkV2 } from '../../../types/network-v2';
import { TransitMode, type CompiledTransitNetwork, type RouteTuple, type StopTuple } from '../../../types/transit';

const LEGACY_MODE: Record<number, number> = {
  [ModeGroup.BRT]: TransitMode.BRT,
  [ModeGroup.BUS]: TransitMode.NON_BRT,
  [ModeGroup.MIKROTRANS]: TransitMode.MIKROTRANS,
  [ModeGroup.KRL]: TransitMode.COMMUTER_RAIL,
  [ModeGroup.MRT]: TransitMode.MRT,
  [ModeGroup.LRT]: TransitMode.LRT
};
/** When a stop serves several mode groups, the one shown on its badge: rail first, then BRT, bus, Mikrotrans. */
const BADGE_PRIORITY = [ModeGroup.MRT, ModeGroup.KRL, ModeGroup.LRT, ModeGroup.BRT, ModeGroup.BUS, ModeGroup.MIKROTRANS];

export function toLegacyNetwork(net: NetworkV2): CompiledTransitNetwork {
  const linesAtStop: Array<Set<number>> = net.stops.map(() => new Set<number>());
  for (const pattern of net.patterns) {
    for (const stop of pattern[3]) linesAtStop[stop].add(pattern[0]);
  }

  const stops: StopTuple[] = net.stops.map((s, i) => {
    const groups = new Set([...linesAtStop[i]].map(line => net.lines[line][4]));
    const group = BADGE_PRIORITY.find(g => groups.has(g)) ?? ModeGroup.BUS;
    return [s[0], s[1], s[2], s[3], LEGACY_MODE[group]];
  });
  const routes: RouteTuple[] = net.lines.map(l => [l[0], l[1], l[2], l[3], [], 0]);

  return {
    version: net.version,
    generatedAt: net.generatedAt,
    stops,
    routes,
    stopRoutes: linesAtStop.map(set => [...set]),
    transfers: [],
    routeShapes: {}
  };
}
