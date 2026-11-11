/** Assigns stable indexes to stops as patterns use them, so unused stops never enter the graph. */
import type { StopV2 } from '../../src/types/network-v2.ts';

export class StopRegistry {
  readonly stops: StopV2[] = [];
  private readonly indexOf = new Map<string, number>();

  add(id: string, name: string, lat: number, lon: number, halte: string): number {
    const known = this.indexOf.get(id);
    if (known !== undefined) return known;
    const index = this.stops.length;
    this.stops.push([id, name, round6(lat), round6(lon), halte]);
    this.indexOf.set(id, index);
    return index;
  }

  get(id: string): number | undefined {
    return this.indexOf.get(id);
  }
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** Counters the builder fills in and the build prints. */
export interface BuildStats {
  hopsAlongShape: number;
  hopsFallback: number;
  patternsWithoutService: number;
  unknownStops: Set<string>;
  fareInherited: string[];
  fareDefaulted: string[];
  unknownRouteDesc: Set<string>;
  hubEdgesRepointed: string[];
  hubEdgesDropped: string[];
}

export function newStats(): BuildStats {
  return {
    hopsAlongShape: 0, hopsFallback: 0, patternsWithoutService: 0, unknownStops: new Set(),
    fareInherited: [], fareDefaulted: [], unknownRouteDesc: new Set(),
    hubEdgesRepointed: [], hubEdgesDropped: []
  };
}
