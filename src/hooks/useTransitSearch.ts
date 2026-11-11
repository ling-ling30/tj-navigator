import { useState, useMemo } from 'react';
import { useTransitStore } from '../lib/store/transit-store';
import type { Itinerary } from '../types/transit';

export interface SearchFilters {
  maxTransfers: number | null;
  sortBy: 'fastest' | 'fewest_transfers' | 'cheapest';
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
    error
  } = useTransitStore();

  const [filters, setFilters] = useState<SearchFilters>({
    maxTransfers: null,
    sortBy: 'fastest'
  });

  const filteredItineraries = useMemo<Itinerary[]>(() => {
    let result = [...itineraries];

    if (filters.maxTransfers !== null) {
      result = result.filter(itin => itin.transfersCount <= filters.maxTransfers!);
    }

    if (filters.sortBy === 'fastest') {
      result.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
    } else if (filters.sortBy === 'fewest_transfers') {
      result.sort((a, b) => a.transfersCount - b.transfersCount);
    } else if (filters.sortBy === 'cheapest') {
      result.sort((a, b) => (a.integratedFareIdr || a.standardFareIdr) - (b.integratedFareIdr || b.standardFareIdr));
    }

    return result;
  }, [itineraries, filters]);

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
    routingStatus: (useTransitStore() as any).routingStatus
  };
}
