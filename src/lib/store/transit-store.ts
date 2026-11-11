import { create } from 'zustand';
import * as Comlink from 'comlink';
import type { CompiledTransitNetwork, StopEntity, Itinerary } from '../../types/transit';
import { loadTransitNetwork } from '../storage/transit-db';
import { RaptorRouter } from '../router/raptor';
import { calculateItineraryFare } from '../fare/fare-engine';
import { jakartaTelemetry, type ConnectionStatus } from '../telemetry/mqtt-client';
import { liveSegmentEngine, type VehicleTelemetryPing } from '../telemetry/live-segment-engine';

export type RoutingStatus = 'idle' | 'computing' | 'success' | 'no-route' | 'same-place' | 'error';
export type { AnswerKind } from '../../types/transit';
import type { AnswerKind } from '../../types/transit';
import { JourneyPlanner, type LocationInput } from '../router/journey-planner';

interface TransitStoreState {
  network: CompiledTransitNetwork | null;
  isLoading: boolean;
  error: string | null;
  routingStatus: RoutingStatus;
  answerKind: AnswerKind | null;
  
  originStop: StopEntity | null;
  destinationStop: StopEntity | null;
  itineraries: Itinerary[];
  selectedItinerary: Itinerary | null;
  isComputingRoute: boolean;
  
  vehicles: VehicleTelemetryPing[];
  connectionStatus: ConnectionStatus;
  
  activeScreen: 'HOME' | 'RESULTS' | 'RADAR';
  selectedVehicleId: string | null;
  isSearchingOrigin: boolean;
  isSearchingDest: boolean;
  
  loadInitialData: () => Promise<void>;
  setOriginStop: (stop: StopEntity) => void;
  setDestinationStop: (stop: StopEntity) => void;
  swapStops: () => void;
  calculateJourney: () => Promise<void>;
  selectItinerary: (itinerary: Itinerary) => void;
  openLiveRadar: (vehicleId?: string) => void;
  closeLiveRadar: () => void;
  setScreen: (screen: 'HOME' | 'RESULTS' | 'RADAR') => void;
  setIsSearchingOrigin: (open: boolean) => void;
  setIsSearchingDest: (open: boolean) => void;
}

// Fallback direct synchronous RAPTOR instance in case Web Worker is delayed or offline
let syncRouter: RaptorRouter | null = null;
let syncPlanner: JourneyPlanner | null = null;
let workerApi: any = null;
let initPromise: Promise<void> | null = null;

try {
  const worker = new Worker(new URL('../../workers/raptor.worker.ts', import.meta.url), { type: 'module' });
  workerApi = Comlink.wrap(worker);
} catch {
  if (import.meta.env?.DEV) {
    console.log('[Worker] Worker creation fallback to main thread');
  }
}

export const useTransitStore = create<TransitStoreState>((set, get) => ({
  network: null,
  isLoading: true,
  error: null,
  routingStatus: 'idle',
  answerKind: null,

  originStop: null,
  destinationStop: null,
  itineraries: [],
  selectedItinerary: null,
  isComputingRoute: false,

  vehicles: [],
  connectionStatus: 'CONNECTING',

  activeScreen: 'HOME',
  selectedVehicleId: 'TJ-0842',
  isSearchingOrigin: false,
  isSearchingDest: false,

  loadInitialData: async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        set({ isLoading: true, error: null });
        const network = await loadTransitNetwork();
        if (!syncRouter) {
          syncRouter = new RaptorRouter(network);
          syncPlanner = new JourneyPlanner(syncRouter);
        }

      if (workerApi) {
        try {
          await workerApi.init(network);
        } catch {}
      }

      // Pre-seed default commuter route: Stasiun Tebet -> Halte Tosari (Grand Indonesia)
      const tebetIdx = network.stops.findIndex(s => s[0] === 'krl:TEB');
      const tosariIdx = network.stops.findIndex(s => s[0] === 'tj:1-14');

      const originStop: StopEntity = tebetIdx !== -1 ? {
        index: tebetIdx,
        id: network.stops[tebetIdx][0],
        name: network.stops[tebetIdx][1],
        lat: network.stops[tebetIdx][2],
        lon: network.stops[tebetIdx][3],
        mode: network.stops[tebetIdx][4] as any
      } : {
        index: 0,
        id: 'krl:TEB',
        name: 'Stasiun Tebet',
        lat: -6.2263,
        lon: 106.8582,
        mode: 2
      };

      const destStop: StopEntity = tosariIdx !== -1 ? {
        index: tosariIdx,
        id: network.stops[tosariIdx][0],
        name: network.stops[tosariIdx][1],
        lat: network.stops[tosariIdx][2],
        lon: network.stops[tosariIdx][3],
        mode: network.stops[tosariIdx][4] as any
      } : {
        index: 1,
        id: 'tj:1-14',
        name: 'Tosari (Grand Indonesia)',
        lat: -6.1955,
        lon: 106.8231,
        mode: 0
      };

      set({
        network,
        isLoading: false,
        originStop,
        destinationStop: destStop
      });

      // Subscribe to MQTT telemetry
      jakartaTelemetry.subscribeStatus((status) => {
        set({ connectionStatus: status });
      });

      jakartaTelemetry.subscribeTelemetry((vehicles) => {
        set({ vehicles });
      });

      jakartaTelemetry.scopeToCorridors(['1', '6', '6C', '9', '13']);
      jakartaTelemetry.connect();

      // Compute initial journey
      get().calculateJourney();
    } catch (err: any) {
      console.error('Failed to load transit data:', err);
      set({ isLoading: false, error: err.message || 'Failed to load transit graph' });
    }
    })();
    return initPromise;
  },

  setOriginStop: (stop: StopEntity) => {
    set({ originStop: stop, isSearchingOrigin: false });
    get().calculateJourney();
  },

  setDestinationStop: (stop: StopEntity) => {
    set({ destinationStop: stop, isSearchingDest: false });
    get().calculateJourney();
  },

  swapStops: () => {
    const { originStop, destinationStop } = get();
    set({
      originStop: destinationStop,
      destinationStop: originStop
    });
    get().calculateJourney();
  },

  calculateJourney: async () => {
    const { originStop, destinationStop, network } = get();
    if (!originStop || !destinationStop || !network) return;

    // Same place check (origin === destination)
    if (originStop.id === destinationStop.id || originStop.index === destinationStop.index) {
      set({
        routingStatus: 'same-place',
        itineraries: [],
        selectedItinerary: null,
        isComputingRoute: false,
        error: null
      });
      return;
    }

    set({ isComputingRoute: true, routingStatus: 'computing', error: null });
    const now = new Date();
    const departureSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const originLoc: LocationInput = {
      stopIndex: originStop.index,
      lat: originStop.lat,
      lon: originStop.lon,
      name: originStop.name,
      isCustomPoint: originStop.isCustomPoint
    };

    const destLoc: LocationInput = {
      stopIndex: destinationStop.index,
      lat: destinationStop.lat,
      lon: destinationStop.lon,
      name: destinationStop.name,
      isCustomPoint: destinationStop.isCustomPoint
    };

    try {
      let ladderResult: { itineraries: Itinerary[]; answerKind: AnswerKind; ladderLevel: number } | null = null;
      if (workerApi) {
        try {
          ladderResult = await workerApi.planJourneyWithLadder(originLoc, destLoc, departureSeconds);
        } catch {
          ladderResult = syncPlanner ? syncPlanner.plan(originLoc, destLoc, departureSeconds) : null;
        }
      } else if (syncPlanner) {
        ladderResult = syncPlanner.plan(originLoc, destLoc, departureSeconds);
      }

      if (!ladderResult) {
        throw new Error('Router engine unavailable');
      }

      if (ladderResult.answerKind === 'same-place') {
        set({
          routingStatus: 'same-place',
          answerKind: 'same-place',
          itineraries: [],
          selectedItinerary: null,
          isComputingRoute: false,
          error: null
        });
        return;
      }

      if (ladderResult.itineraries.length === 0) {
        set({
          routingStatus: 'no-route',
          answerKind: null,
          itineraries: [],
          selectedItinerary: null,
          isComputingRoute: false,
          error: null
        });
        return;
      }

      // Apply JakLingko fare engine to ensure 100% accurate tariffs & savings
      const calibrated = ladderResult.itineraries.map(itin => {
        const fare = calculateItineraryFare(itin.legs);
        return {
          ...itin,
          standardFareIdr: fare.standardFareIdr,
          integratedFareIdr: fare.integratedFareIdr
        };
      });

      set({
        routingStatus: 'success',
        answerKind: ladderResult.answerKind,
        itineraries: calibrated,
        selectedItinerary: calibrated[0] || null,
        isComputingRoute: false,
        error: null
      });
    } catch (err: any) {
      console.error('Routing computation error:', err);
      set({
        routingStatus: 'error',
        answerKind: null,
        error: err?.message || 'Routing computation failed',
        itineraries: [],
        selectedItinerary: null,
        isComputingRoute: false
      });
    }
  },

  selectItinerary: (itinerary: Itinerary) => {
    set({ selectedItinerary: itinerary, activeScreen: 'RESULTS' });
  },

  openLiveRadar: (vehicleId = 'TJ-0842') => {
    set({ selectedVehicleId: vehicleId, activeScreen: 'RADAR' });
  },

  closeLiveRadar: () => {
    const { itineraries } = get();
    set({
      activeScreen: itineraries.length > 0 ? 'RESULTS' : 'HOME'
    });
  },

  setScreen: (screen) => set({ activeScreen: screen }),
  setIsSearchingOrigin: (open) => set({ isSearchingOrigin: open }),
  setIsSearchingDest: (open) => set({ isSearchingDest: open })
}));
