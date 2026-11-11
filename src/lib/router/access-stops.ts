import type { CompiledTransitNetwork } from '../../types/transit';

export const WALK_CONSTANTS = {
  DEFAULT_WALK_RADIUS_METERS: 1500,
  RELAXED_WALK_RADIUS_TIER1: 3000,
  RELAXED_WALK_RADIUS_TIER2: 5000,
  WALK_SPEED_MPS: 4500 / 3600, // 4.5 km/h = 1.25 m/s
  WALK_DETOUR_FACTOR: 1.3,
  MAX_ACCESS_STOPS: 8,
  RELAXED_ACCESS_STOPS: 12,
  DEFAULT_MAX_TRANSFERS: 3,
  RELAXED_MAX_TRANSFERS: 5,
  MIN_TRANSFER_BUFFER_SECONDS: 60
} as const;

export interface AccessStop {
  stopIndex: number;
  distanceMeters: number;
  walkSeconds: number;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function findNearbyAccessStops(
  network: CompiledTransitNetwork,
  lat: number,
  lon: number,
  radiusMeters: number = WALK_CONSTANTS.DEFAULT_WALK_RADIUS_METERS,
  maxStops: number = WALK_CONSTANTS.MAX_ACCESS_STOPS
): AccessStop[] {
  const { stops } = network;
  const candidates: AccessStop[] = [];

  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const straightDist = haversineMeters(lat, lon, s[2], s[3]);
    if (straightDist <= radiusMeters) {
      const distanceMeters = Math.round(straightDist * WALK_CONSTANTS.WALK_DETOUR_FACTOR);
      const walkSeconds = Math.round(distanceMeters / WALK_CONSTANTS.WALK_SPEED_MPS);
      candidates.push({ stopIndex: i, distanceMeters, walkSeconds });
    }
  }

  candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return candidates.slice(0, maxStops);
}

export function calculateWalkMetrics(straightDistanceMeters: number) {
  const distanceMeters = Math.round(straightDistanceMeters * WALK_CONSTANTS.WALK_DETOUR_FACTOR);
  const walkSeconds = Math.round(distanceMeters / WALK_CONSTANTS.WALK_SPEED_MPS);
  const walkMinutes = Math.max(1, Math.round(walkSeconds / 60));
  return { distanceMeters, walkSeconds, walkMinutes };
}
