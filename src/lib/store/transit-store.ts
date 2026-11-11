import { create } from 'zustand';
import type { AnswerKind, CompiledTransitNetwork, Itinerary, ModeSuggestionView, StopEntity } from '../../types/transit';
import { toLegacyNetwork } from '../router/v2/compat-network';
import type { TravelOptions } from '../router/v2/cost-profiles';
import type { PlanRequest } from '../router/v2/planner-api';
import { loadNetworkV2 } from '../storage/network-v2-db';
import { jakartaTelemetry, type ConnectionStatus } from '../telemetry/mqtt-client';
import type { VehicleTelemetryPing } from '../telemetry/live-segment-engine';
import { initPlanner, planJourney } from './planner-client';
import { ALL_MODE_GROUPS, loadTravelPrefs, saveTravelPrefs } from './travel-prefs';

export type RoutingStatus = 'idle' | 'computing' | 'success' | 'no-route' | 'same-place' | 'error';
export type { AnswerKind } from '../../types/transit';

type Screen = 'HOME' | 'RESULTS' | 'RADAR';

interface TransitStoreState {
  /** Stops and lines in the shape the stop picker reads; built from graph v2. */
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

  /** Mode groups switched on (see ModeGroup in src/types/network-v2.ts). All six = no restriction. */
  selectedModes: number[];
  travelOptions: TravelOptions;
  /** Departure time in epoch milliseconds; null = now. */
  departAtMs: number | null;
  /** A switched-off mode group would be clearly faster. */
  suggestion: ModeSuggestionView | null;
  /** The chosen modes gave nothing; the options shown ignore the mode choice. */
  modesGaveNothing: boolean;

  vehicles: VehicleTelemetryPing[];
  connectionStatus: ConnectionStatus;

  activeScreen: Screen;
  selectedVehicleId: string | null;
  isSearchingOrigin: boolean;
  isSearchingDest: boolean;

  loadInitialData: () => Promise<void>;
  setOriginStop: (stop: StopEntity) => void;
  setDestinationStop: (stop: StopEntity) => void;
  swapStops: () => void;
  calculateJourney: () => Promise<void>;
  selectItinerary: (itinerary: Itinerary) => void;
  toggleMode: (modeGroup: number) => void;
  setSelectedModes: (modeGroups: number[]) => void;
  setTravelOptions: (options: Partial<TravelOptions>) => void;
  setDepartAt: (epochMs: number | null) => void;
  /** Switches on the mode groups of the suggestion and searches again. */
  applySuggestion: () => void;
  openLiveRadar: (vehicleId?: string) => void;
  closeLiveRadar: () => void;
  setScreen: (screen: Screen) => void;
  setIsSearchingOrigin: (open: boolean) => void;
  setIsSearchingDest: (open: boolean) => void;
}

const DEFAULT_ORIGIN_ID = 'krl:TEB';
const DEFAULT_DESTINATION_NAME = 'Tosari';
const LIVE_CORRIDORS = ['1', '6', '6C', '9', '13'];

let initPromise: Promise<void> | null = null;
/** Only the answer to the latest search is shown. */
let searchSeq = 0;

function stopEntity(network: CompiledTransitNetwork, index: number): StopEntity | null {
  if (index < 0) return null;
  const s = network.stops[index];
  return { index, id: s[0], name: s[1], lat: s[2], lon: s[3], mode: s[4] as StopEntity['mode'] };
}

function placeOf(stop: StopEntity): PlanRequest['origin'] {
  const isListedStop = !stop.isCustomPoint && stop.index >= 0;
  return { lat: stop.lat, lon: stop.lon, name: stop.customLabel || stop.name, stopIndex: isListedStop ? stop.index : undefined };
}

const prefs = loadTravelPrefs();

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

  selectedModes: prefs.modes,
  travelOptions: prefs.options,
  departAtMs: null,
  suggestion: null,
  modesGaveNothing: false,

  vehicles: [],
  connectionStatus: 'CONNECTING',

  activeScreen: 'HOME',
  selectedVehicleId: null,
  isSearchingOrigin: false,
  isSearchingDest: false,

  loadInitialData: async () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        set({ isLoading: true, error: null });
        const graph = await loadNetworkV2();
        await initPlanner(graph);
        const network = toLegacyNetwork(graph);

        set({
          network,
          isLoading: false,
          originStop: stopEntity(network, network.stops.findIndex(s => s[0] === DEFAULT_ORIGIN_ID)),
          destinationStop: stopEntity(network, network.stops.findIndex(s => s[1] === DEFAULT_DESTINATION_NAME))
        });

        jakartaTelemetry.subscribeStatus(status => set({ connectionStatus: status }));
        jakartaTelemetry.subscribeTelemetry(vehicles => set({ vehicles }));
        jakartaTelemetry.scopeToCorridors(LIVE_CORRIDORS);
        jakartaTelemetry.connect();

        get().calculateJourney();
      } catch (err) {
        console.error('Failed to load transit data:', err);
        initPromise = null;
        set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load the transit graph' });
      }
    })();
    return initPromise;
  },

  setOriginStop: stop => {
    set({ originStop: stop, isSearchingOrigin: false });
    get().calculateJourney();
  },

  setDestinationStop: stop => {
    set({ destinationStop: stop, isSearchingDest: false });
    get().calculateJourney();
  },

  swapStops: () => {
    const { originStop, destinationStop } = get();
    set({ originStop: destinationStop, destinationStop: originStop });
    get().calculateJourney();
  },

  calculateJourney: async () => {
    const { originStop, destinationStop, network, selectedModes, travelOptions, departAtMs } = get();
    if (!originStop || !destinationStop || !network) return;

    const seq = ++searchSeq;
    set({ isComputingRoute: true, routingStatus: 'computing', error: null });
    try {
      const view = await planJourney({
        origin: placeOf(originStop),
        destination: placeOf(destinationStop),
        departAtMs: departAtMs ?? Date.now(),
        modes: selectedModes.length >= ALL_MODE_GROUPS.length ? null : selectedModes,
        options: travelOptions
      });
      if (seq !== searchSeq) return;

      const routingStatus: RoutingStatus =
        view.answerKind === 'same-place' ? 'same-place' : view.itineraries.length === 0 ? 'no-route' : 'success';
      set({
        routingStatus,
        answerKind: view.answerKind,
        itineraries: view.itineraries,
        selectedItinerary: view.itineraries[0] ?? null,
        suggestion: view.suggestion ?? null,
        modesGaveNothing: view.modesGaveNothing,
        isComputingRoute: false,
        error: null
      });
    } catch (err) {
      if (seq !== searchSeq) return;
      console.error('Routing computation error:', err);
      set({
        routingStatus: 'error',
        answerKind: null,
        error: err instanceof Error ? err.message : 'Routing computation failed',
        itineraries: [],
        selectedItinerary: null,
        suggestion: null,
        modesGaveNothing: false,
        isComputingRoute: false
      });
    }
  },

  selectItinerary: itinerary => {
    set({ selectedItinerary: itinerary, activeScreen: 'RESULTS' });
  },

  toggleMode: modeGroup => {
    const current = get().selectedModes;
    const next = current.includes(modeGroup) ? current.filter(m => m !== modeGroup) : [...current, modeGroup];
    // At least one mode stays on: an empty choice would mean "nothing", which is never what a traveller wants
    if (next.length > 0) get().setSelectedModes(next);
  },

  setSelectedModes: modeGroups => {
    set({ selectedModes: modeGroups });
    saveTravelPrefs({ modes: modeGroups, options: get().travelOptions });
    get().calculateJourney();
  },

  setTravelOptions: options => {
    const travelOptions = { ...get().travelOptions, ...options };
    set({ travelOptions });
    saveTravelPrefs({ modes: get().selectedModes, options: travelOptions });
    get().calculateJourney();
  },

  setDepartAt: epochMs => {
    set({ departAtMs: epochMs });
    get().calculateJourney();
  },

  applySuggestion: () => {
    const { suggestion, selectedModes } = get();
    if (!suggestion) return;
    get().setSelectedModes([...new Set([...selectedModes, ...suggestion.modeGroups])]);
  },

  openLiveRadar: vehicleId => {
    set({ selectedVehicleId: vehicleId ?? null, activeScreen: 'RADAR' });
  },

  closeLiveRadar: () => {
    set({ activeScreen: get().itineraries.length > 0 ? 'RESULTS' : 'HOME' });
  },

  setScreen: screen => set({ activeScreen: screen }),
  setIsSearchingOrigin: open => set({ isSearchingOrigin: open }),
  setIsSearchingDest: open => set({ isSearchingDest: open })
}));
