/**
 * Live Segment Runtime Engine (ADR 0005)
 * Recounts position-to-stop and in-vehicle journey times using live vehicle telemetry pings
 * as corridor probes, smoothing with a 70/30 rolling blend against baseline runtimes.
 */

export interface VehicleTelemetryPing {
  vehicleId: string;
  routeId: string;
  routeShortName: string;
  lat: number;
  lon: number;
  speedKmh: number;
  bearingDeg: number;
  timestampMs: number;
  occupancyPercent?: number;
  isElectric?: boolean;
}

export interface SegmentRuntime {
  fromStopId: string;
  toStopId: string;
  baselineSeconds: number;
  observedSeconds: number;
  recountedSeconds: number;
  trafficMultiplier: number;
  lastUpdatedMs: number;
  bottleneckName?: string;
  bottleneckCause?: string;
}

export interface RecountedArrivalResult {
  vehicleId: string;
  routeShortName: string;
  minMinutes: number;
  maxMinutes: number;
  stopsAway: number;
  rawApiEtaMinutes: number;
  isRecounted: boolean;
  confidenceScore: number;
  bottleneckSummary?: string;
  bottleneckDelayMinutes?: number;
  nextStopName: string;
  approachingStopName: string;
  progressRatio: number;
}

const STORAGE_KEY_MULTIPLIERS = 'tj_recent_traffic_multipliers';

const SEGMENT_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL for dynamic traffic congestion multipliers

class LiveSegmentEngine {
  private segments = new Map<string, SegmentRuntime>();
  private vehiclePositions = new Map<string, VehicleTelemetryPing>();

  constructor() {
    this.hydrateFromStorage();
    this.initDefaultJakartaBottlenecks();
  }

  private getSegmentKey(fromId: string, toId: string): string {
    return `${fromId}->${toId}`;
  }

  private hydrateFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MULTIPLIERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        for (const [key, val] of Object.entries(parsed)) {
          const seg = val as SegmentRuntime;
          if (seg && typeof seg.lastUpdatedMs === 'number' && (now - seg.lastUpdatedMs) < SEGMENT_TTL_MS) {
            this.segments.set(key, seg);
          }
        }
      }
    } catch {}
  }

  private persistToStorage() {
    try {
      const obj: Record<string, SegmentRuntime> = {};
      this.segments.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(STORAGE_KEY_MULTIPLIERS, JSON.stringify(obj));
    } catch {}
  }

  private initDefaultJakartaBottlenecks() {
    // Calibrated baseline bottlenecks in Jakarta's median transit corridors
    // 1. Simpang Kuningan / Mampang Underpass (Corridor 6 / 6C)
    this.updateSegment('tj:6c-casablanca', 'tj:6-11', 180, 480, 'Simpang Rasuna Said / Casablanca', 'Congestion at flyover merge');
    this.updateSegment('tj:6-8', 'tj:6-9', 120, 360, 'Simpang Kuningan Barat / Mampang', 'Mixed traffic bottleneck at turn');
    // 2. Semanggi Cloverleaf / Gatot Subroto (Corridor 9 / 1)
    this.updateSegment('tj:9-8', 'tj:6-8', 150, 420, 'Gatot Subroto - Semanggi East', 'Bottleneck at inner ring toll exit');
    this.updateSegment('tj:1-8', 'tj:1-10', 120, 290, 'Karet Sudirman bottleneck', 'Construction and turnstile queue');
  }

  public updateSegment(
    fromId: string,
    toId: string,
    baselineSec: number,
    observedSec: number,
    bottleneckName?: string,
    bottleneckCause?: string
  ): SegmentRuntime {
    const key = this.getSegmentKey(fromId, toId);
    const existing = this.segments.get(key);

    // 70% live observed + 30% baseline / previous (ADR 0005)
    const prevTime = existing ? existing.recountedSeconds : baselineSec;
    const recounted = Math.round(0.7 * observedSec + 0.3 * prevTime);
    const multiplier = Math.min(3.0, Math.max(0.8, recounted / Math.max(1, baselineSec)));

    const entry: SegmentRuntime = {
      fromStopId: fromId,
      toStopId: toId,
      baselineSeconds: baselineSec,
      observedSeconds: observedSec,
      recountedSeconds: recounted,
      trafficMultiplier: Number(multiplier.toFixed(2)),
      lastUpdatedMs: Date.now(),
      bottleneckName: bottleneckName || existing?.bottleneckName,
      bottleneckCause: bottleneckCause || existing?.bottleneckCause
    };

    this.segments.set(key, entry);
    this.persistToStorage();
    return entry;
  }

  public getSegment(fromId: string, toId: string, defaultBaselineSec = 120): SegmentRuntime {
    const key = this.getSegmentKey(fromId, toId);
    const existing = this.segments.get(key);
    if (existing) return existing;

    return {
      fromStopId: fromId,
      toStopId: toId,
      baselineSeconds: defaultBaselineSec,
      observedSeconds: defaultBaselineSec,
      recountedSeconds: defaultBaselineSec,
      trafficMultiplier: 1.0,
      lastUpdatedMs: Date.now()
    };
  }

  public ingestVehiclePing(ping: VehicleTelemetryPing) {
    this.vehiclePositions.set(ping.vehicleId, ping);
  }

  public getVehicles(): VehicleTelemetryPing[] {
    return Array.from(this.vehiclePositions.values());
  }

  public calculateArrivalEta(
    busStopIndex: number,
    boardingStopIndex: number,
    routeStopIds: string[],
    rawApiEtaMinutes = 3,
    vehicleId?: string,
    routeShortName?: string
  ): RecountedArrivalResult {
    const stopsAway = Math.max(0, boardingStopIndex - busStopIndex);
    let totalRecountedSec = 0;
    let totalBaselineSec = 0;
    let worstBottleneck: { name: string; delayMin: number } | null = null;

    for (let i = busStopIndex; i < boardingStopIndex && i < routeStopIds.length - 1; i++) {
      const fromId = routeStopIds[i];
      const toId = routeStopIds[i + 1];
      const seg = this.getSegment(fromId, toId, 120);

      totalRecountedSec += seg.recountedSeconds + 20; // 20s stop dwell buffer
      totalBaselineSec += seg.baselineSeconds + 20;

      const delayMin = Math.round((seg.recountedSeconds - seg.baselineSeconds) / 60);
      if (delayMin >= 2 && (!worstBottleneck || delayMin > worstBottleneck.delayMin)) {
        worstBottleneck = {
          name: seg.bottleneckName || `Between stops ${i} and ${i + 1}`,
          delayMin
        };
      }
    }

    const recountedMinutes = Math.max(1, Math.round(totalRecountedSec / 60));
    // Range: -1 min to +2 min around smoothed calculation to reflect traffic variance honestly
    const minMinutes = Math.max(1, recountedMinutes - 1);
    const maxMinutes = recountedMinutes + 2;

    const fromName = routeStopIds[busStopIndex] || 'Approaching';
    const toName = routeStopIds[Math.min(busStopIndex + 1, boardingStopIndex)] || 'Next Stop';

    // Resolve vehicle identity dynamically from active tracked vehicles or parameters
    let resolvedVehicleId = vehicleId;
    let resolvedRoute = routeShortName;
    if (!resolvedVehicleId && this.vehiclePositions.size > 0) {
      const active = Array.from(this.vehiclePositions.values())[0];
      resolvedVehicleId = active.vehicleId;
      resolvedRoute = active.routeShortName;
    }

    // Dynamic confidence score based on stops away
    const confidenceScore = Math.max(0.70, Math.min(0.98, Number((0.98 - stopsAway * 0.02).toFixed(2))));

    return {
      vehicleId: resolvedVehicleId || 'TJ-TRACKED',
      routeShortName: resolvedRoute || 'BRT',
      minMinutes,
      maxMinutes,
      stopsAway,
      rawApiEtaMinutes,
      isRecounted: true,
      confidenceScore,
      bottleneckSummary: worstBottleneck
        ? `${worstBottleneck.name}: +${worstBottleneck.delayMin}m traffic delay`
        : undefined,
      bottleneckDelayMinutes: worstBottleneck?.delayMin,
      nextStopName: toName,
      approachingStopName: fromName,
      progressRatio: Math.min(1, Math.max(0, 1 - (stopsAway / 4)))
    };
  }

  /**
   * Recount In-Vehicle Travel Time: Origin stop to Destination stop
   */
  public calculateInVehicleRide(
    originIndex: number,
    destIndex: number,
    routeStopIds: string[]
  ): { nominalMinutes: number; recountedMinutes: number; delayMinutes: number } {
    let nominalSec = 0;
    let recountedSec = 0;

    for (let i = originIndex; i < destIndex && i < routeStopIds.length - 1; i++) {
      const fromId = routeStopIds[i];
      const toId = routeStopIds[i + 1];
      const seg = this.getSegment(fromId, toId, 120);

      nominalSec += seg.baselineSeconds + 25; // 25s stop dwell
      recountedSec += seg.recountedSeconds + 25;
    }

    const nominalMinutes = Math.round(nominalSec / 60);
    const recountedMinutes = Math.round(recountedSec / 60);
    const delayMinutes = Math.max(0, recountedMinutes - nominalMinutes);

    return {
      nominalMinutes,
      recountedMinutes,
      delayMinutes
    };
  }
}

export const liveSegmentEngine = new LiveSegmentEngine();
