import { useState, useEffect, useCallback } from 'react';
import { useTransitStore } from '../lib/store/transit-store';
import { liveSegmentEngine, type RecountedArrivalResult } from '../lib/telemetry/live-segment-engine';
import { TransitMode, type TransitModeType } from '../types/transit';

export interface DepartureItem {
  id: string;
  routeShortName: string;
  mode: TransitModeType;
  destination: string;
  platformOrDoor: string;
  minutesAway: number;
  delayMinutes: number;
  crowdLevel: 'low' | 'medium' | 'high';
  vehicleId?: string;
  speedKmh?: number;
}

export interface RadarDiagnostic {
  vehicleId: string;
  routeShortName: string;
  minMinutes: number;
  maxMinutes: number;
  normalMinutes: number;
  delayMinutes: number;
  location: string;
  speedKmh: number;
  occupancyPercent: number;
  isElectric: boolean;
}

export function useLiveRadar(customStopId?: string) {
  const {
    originStop,
    destinationStop,
    selectedVehicleId,
    vehicles,
    connectionStatus,
    setOriginStop,
    setScreen,
    closeLiveRadar
  } = useTransitStore();

  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Determine current active stop for radar
  const currentStop = destinationStop || originStop || {
    index: 0,
    id: 'tj:1-14',
    name: 'Tosari (Grand Indonesia)',
    lat: -6.1955,
    lon: 106.8231,
    mode: TransitMode.BRT
  };

  const activeVehicle = vehicles.find(v => v.vehicleId === selectedVehicleId) || vehicles[0] || {
    vehicleId: 'TJ-0842',
    routeId: 'tj:feeder-6c',
    routeShortName: '6C',
    lat: -6.2235,
    lon: 106.8285,
    speedKmh: 14,
    bearingDeg: 315,
    timestampMs: Date.now(),
    occupancyPercent: 72,
    isElectric: true
  };

  const refresh = useCallback(() => {
    setLastRefreshed(new Date());
  }, []);

  const planFromHere = useCallback(() => {
    setOriginStop(currentStop);
    setScreen('HOME');
  }, [currentStop, setOriginStop, setScreen]);

  // Recount arrival calculation
  const recounted: RecountedArrivalResult = liveSegmentEngine.calculateArrivalEta(
    1,
    3,
    ['Stasiun Tebet', 'Pal Batu / Casablanca', 'GOR Soemantri', currentStop.name],
    3
  );

  const departures: DepartureItem[] = [
    {
      id: 'dep-1',
      routeShortName: '1',
      mode: TransitMode.BRT,
      destination: 'Blok M',
      platformOrDoor: 'Pintu 3',
      minutesAway: 3,
      delayMinutes: 0,
      crowdLevel: 'low',
      vehicleId: 'TJ-0120',
      speedKmh: 24
    },
    {
      id: 'dep-2',
      routeShortName: 'M1',
      mode: TransitMode.MRT,
      destination: 'Lebak Bulus',
      platformOrDoor: 'Peron 2',
      minutesAway: 6,
      delayMinutes: 0,
      crowdLevel: 'medium',
      vehicleId: 'MRT-03',
      speedKmh: 42
    },
    {
      id: 'dep-3',
      routeShortName: activeVehicle.routeShortName || '6C',
      mode: TransitMode.NON_BRT,
      destination: currentStop.name.includes('Tosari') ? 'Tosari' : 'Stasiun Tebet',
      platformOrDoor: 'Pintu 1',
      minutesAway: recounted.minMinutes,
      delayMinutes: recounted.bottleneckDelayMinutes || 8,
      crowdLevel: 'high',
      vehicleId: activeVehicle.vehicleId,
      speedKmh: activeVehicle.speedKmh
    },
    {
      id: 'dep-4',
      routeShortName: '4C',
      mode: TransitMode.BRT,
      destination: 'TU Gas',
      platformOrDoor: 'Pintu 2',
      minutesAway: 12,
      delayMinutes: 0,
      crowdLevel: 'low',
      vehicleId: 'TJ-0408',
      speedKmh: 28
    }
  ];

  const diagnostic: RadarDiagnostic = {
    vehicleId: activeVehicle.vehicleId,
    routeShortName: activeVehicle.routeShortName || '6C',
    minMinutes: recounted.minMinutes,
    maxMinutes: recounted.maxMinutes,
    normalMinutes: recounted.rawApiEtaMinutes,
    delayMinutes: recounted.bottleneckDelayMinutes || 8,
    location: 'Kuningan / Casablanca',
    speedKmh: activeVehicle.speedKmh,
    occupancyPercent: activeVehicle.occupancyPercent || 70,
    isElectric: !!activeVehicle.isElectric
  };

  return {
    currentStop,
    departures,
    diagnostic,
    lastRefreshed,
    connectionStatus,
    refresh,
    planFromHere,
    close: closeLiveRadar
  };
}
