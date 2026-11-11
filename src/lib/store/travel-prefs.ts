/** The traveller's standing choices (mode groups and travel options), remembered on this device. */
import { ModeGroup } from '../../types/network-v2';
import { DEFAULT_TRAVEL_OPTIONS, type TravelOptions } from '../router/v2/cost-profiles';

export const ALL_MODE_GROUPS: number[] = Object.values(ModeGroup);
const STORAGE_KEY = 'tj.travelPrefs.v1';

export interface TravelPrefs { modes: number[]; options: TravelOptions }

export function loadTravelPrefs(): TravelPrefs {
  const fallback: TravelPrefs = { modes: [...ALL_MODE_GROUPS], options: { ...DEFAULT_TRAVEL_OPTIONS } };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<TravelPrefs>;
    const modes = Array.isArray(saved.modes) ? saved.modes.filter(m => ALL_MODE_GROUPS.includes(m)) : fallback.modes;
    return { modes: modes.length > 0 ? modes : fallback.modes, options: { ...DEFAULT_TRAVEL_OPTIONS, ...saved.options } };
  } catch {
    return fallback;
  }
}

export function saveTravelPrefs(prefs: TravelPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked or full: the choice simply lasts for this visit
  }
}
