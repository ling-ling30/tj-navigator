import { useMemo } from 'react';
import { useTransitStore } from '../lib/store/transit-store';
import type { StopEntity } from '../types/transit';

export interface EnrichedStop extends StopEntity {
  description: string;
  routeCodes?: string[];
}

const POPULAR_HUBS = [
  { name: 'Stasiun Tebet', id: 'krl:TEB', mode: 2, desc: 'KRL Commuter Line Bogor' },
  { name: 'Halte Tosari (Grand Indonesia)', id: 'tj:1-14', mode: 0, desc: 'Koridor 1 · Sudirman' },
  { name: 'Stasiun MRT Dukuh Atas BNI', id: 'mrt:DKA', mode: 3, desc: 'Hub MRT, KRL, LRT & TJ' },
  { name: 'Stasiun Sudirman', id: 'krl:SUD', mode: 2, desc: 'Commuter Line Cikarang' },
  { name: 'Halte CSW 1 (ASEAN)', id: 'tj:1-4', mode: 0, desc: 'Integrasi CSW Skybridge' },
  { name: 'Stasiun Bundaran HI', id: 'mrt:BHI', mode: 3, desc: 'MRT Jalur Utara-Selatan' },
  { name: 'Halte Blok M', id: 'tj:1-1', mode: 0, desc: 'Terminal Blok M · Koridor 1' },
  { name: 'Stasiun Manggarai', id: 'krl:MRI', mode: 2, desc: 'Sentral Integrasi Commuter Line' },
  { name: 'Stasiun Tanah Abang', id: 'krl:THB', mode: 2, desc: 'Transit KRL Rangkasbitung & Cikarang' },
  { name: 'Stasiun Duri', id: 'krl:DU', mode: 2, desc: 'Transit KRL Tangerang & Cikarang' },
  { name: 'Stasiun Bekasi', id: 'krl:BKS', mode: 2, desc: 'Commuter Line Cikarang' }
];

export function cleanText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function parseCoordinateQuery(query: string): { lat: number; lon: number } | null {
  const text = query.trim();
  if (!text) return null;

  // 1. Google Maps @lat,lng
  const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lon = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  // 2. Google Maps URL ?q=lat,lng or &q=lat,lng
  const qMatch = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lon = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  // 3. Google Maps URL destination=lat,lng
  const destMatch = text.match(/[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (destMatch) {
    const lat = parseFloat(destMatch[1]);
    const lon = parseFloat(destMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  // 4. Plain lat, lng text e.g. "-6.24415, 106.65082"
  const plainMatch = text.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1]);
    const lon = parseFloat(plainMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  return null;
}

export function useStopAutocomplete(query: string, modeFilter: number | null = null) {
  const network = useTransitStore(state => state.network);

  const parsedCoordinate = useMemo(() => {
    return parseCoordinateQuery(query);
  }, [query]);

  const curatedStops = useMemo<EnrichedStop[]>(() => {
    if (!network || !network.stops) return [];

    return POPULAR_HUBS.map(hub => {
      const idx = network.stops.findIndex(
        s => s[0] === hub.id || s[1].toLowerCase().includes(hub.name.toLowerCase())
      );

      if (idx !== -1) {
        const raw = network.stops[idx];
        const rIndices = network.stopRoutes[idx] || [];
        const routeCodes = Array.from(new Set(rIndices.map(rIdx => network.routes[rIdx]?.[1]).filter(Boolean))).slice(0, 4);

        return {
          index: idx,
          id: raw[0],
          name: raw[1],
          lat: raw[2],
          lon: raw[3],
          mode: raw[4] as any,
          description: hub.desc,
          routeCodes
        };
      }

      return {
        index: 0,
        id: hub.id,
        name: hub.name,
        lat: -6.2088,
        lon: 106.8227,
        mode: hub.mode as any,
        description: hub.desc
      };
    }).filter(stop => modeFilter === null || stop.mode === modeFilter);
  }, [network, modeFilter]);

  const results = useMemo<EnrichedStop[]>(() => {
    const qClean = cleanText(query);
    if (!network || !network.stops) return [];
    if (!qClean) return curatedStops;

    // Check if query is a coordinate point
    if (parsedCoordinate) {
      return [
        {
          index: -1,
          id: `coord:${parsedCoordinate.lat.toFixed(5)},${parsedCoordinate.lon.toFixed(5)}`,
          name: `${parsedCoordinate.lat.toFixed(5)}, ${parsedCoordinate.lon.toFixed(5)}`,
          lat: parsedCoordinate.lat,
          lon: parsedCoordinate.lon,
          mode: 0,
          isCustomPoint: true,
          description: 'Titik koordinat kustom'
        }
      ];
    }

    const queryTokens = qClean.split(/\s+/).filter(Boolean);
    const matches: EnrichedStop[] = [];
    const prefixMatches: EnrichedStop[] = [];

    // Synonym expansion: e.g. "summarecon serpong" -> "gading serpong"
    let targetTokens = queryTokens;
    if (qClean.includes('summarecon') && !qClean.includes('gading')) {
      targetTokens = [...queryTokens, 'gading', 'serpong'];
    }

    for (let i = 0; i < network.stops.length; i++) {
      const s = network.stops[i];
      const name = s[1];
      const mode = s[4];

      if (modeFilter !== null && mode !== modeFilter) {
        continue;
      }

      const nameClean = cleanText(name);
      const rIndices = network.stopRoutes[i] || [];
      const routeCodes = Array.from(new Set(rIndices.map(rIdx => network.routes[rIdx]?.[1]).filter(Boolean)));
      const routeCodeClean = routeCodes.map(c => cleanText(c));

      // Match all tokens anywhere in stop name OR in route codes (e.g. searching "S61" or "gading serpong")
      const matchesAllTokens = targetTokens.every(tok =>
        nameClean.includes(tok) || routeCodeClean.some(rc => rc === tok || rc.startsWith(tok))
      );

      if (!matchesAllTokens) continue;

      const desc =
        s[0].startsWith('tj:') ? 'TransJakarta BRT' :
        s[0].startsWith('krl:') ? 'KRL Commuter' :
        s[0].startsWith('mrt:') ? 'MRT Jakarta' :
        s[0].startsWith('lrt:') ? 'LRT' : 'Transit';

      const enriched: EnrichedStop = {
        index: i,
        id: s[0],
        name,
        lat: s[2],
        lon: s[3],
        mode: mode as any,
        description: desc,
        routeCodes: routeCodes.slice(0, 4)
      };

      if (nameClean.startsWith(qClean)) {
        prefixMatches.push(enriched);
      } else {
        matches.push(enriched);
      }

      if (prefixMatches.length + matches.length >= 35) break;
    }

    return [...prefixMatches, ...matches].slice(0, 25);
  }, [network, query, modeFilter, curatedStops, parsedCoordinate]);

  return { results, curatedStops, parsedCoordinate };
}
