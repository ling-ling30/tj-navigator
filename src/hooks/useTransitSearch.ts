import { useState, useMemo } from 'react';
import { useTransitStore } from '../lib/store/transit-store';
import type { Itinerary } from '../types/transit';

export type SortStrategy = 'best' | 'fastest' | 'fewest_transfers' | 'cheapest' | 'least_walking';

export interface SearchFilters {
  sortBy: SortStrategy;
}

function totalWalk(itin: Itinerary): number {
  if (itin.walkMeters !== undefined) return itin.walkMeters;
  return itin.legs
    .filter(l => l.type === 'WALK')
    .reduce((sum, l) => sum + (l.distanceMeters || 0), 0);
}

export function useTransitSearch() {
  const {
    originStop,
    destinationStop,
    itineraries,
    selectedItinerary,
    isComputingRoute,
    calculateJourney,
    selectItinerary,
    setScreen,
    error,
    routingStatus,
    answerKind,
    modesGaveNothing,
    suggestion,
    applySuggestion
  } = useTransitStore();

  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'fastest'
  });

  const filteredItineraries = useMemo<Itinerary[]>(() => {
    const list = [...itineraries];

    if (filters.sortBy === 'best') {
      return list;
    }
    if (filters.sortBy === 'fastest') {
      return list.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
    }
    if (filters.sortBy === 'fewest_transfers') {
      return list.sort((a, b) => a.transfersCount - b.transfersCount);
    }
    if (filters.sortBy === 'cheapest') {
      return list.sort(
        (a, b) => (a.integratedFareIdr || a.standardFareIdr) - (b.integratedFareIdr || b.standardFareIdr)
      );
    }
    if (filters.sortBy === 'least_walking') {
      return list.sort((a, b) => totalWalk(a) - totalWalk(b));
    }

    return list;
  }, [itineraries, filters.sortBy]);

  return {
    originStop,
    destinationStop,
    itineraries: filteredItineraries,
    allItinerariesCount: itineraries.length,
    selectedItinerary,
    isComputingRoute,
    calculateJourney,
    selectItinerary,
    setScreen,
    filters,
    setFilters,
    error,
    routingStatus,
    answerKind,
    modesGaveNothing,
    suggestion,
    applySuggestion
  };
}
