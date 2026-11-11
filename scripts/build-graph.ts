import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

// Mode enumeration
export const Mode = {
  BRT: 0,
  NON_BRT: 1,
  COMMUTER_RAIL: 2,
  MRT: 3,
  LRT: 4,
  MIKROTRANS: 5
} as const;

interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  mode: number;
}

interface Route {
  id: string;
  shortName: string;
  longName: string;
  color: string;
  stopIndices: number[];
  headwaySeconds: number;
  stopDistances: number[]; // Cumulative distance in meters
}

interface TransferEdge {
  fromStopIndex: number;
  toStopIndex: number;
  walkSeconds: number;
  distanceMeters: number;
  isPaidAreaTransfer: boolean;
  gateBufferSeconds: number;
  peakPenaltySeconds: number;
  isSheltered: boolean;
  isStepFree: boolean;
}

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const SEEDS_DIR = path.join(ROOT_DIR, 'data', 'seeds');
const TMP_DIR = path.join(ROOT_DIR, 'tmp_gtfs');
const GTFS_URL = 'https://gtfs.transjakarta.co.id/files/file_gtfs.zip';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

async function fetchWithTimeout(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  console.log('🚀 Starting TJ-Navigator Multi-Modal Data Compilation Pipeline...');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const stopMap = new Map<string, number>(); // id -> index
  let stops: Stop[] = [];
  const routes: Route[] = [];
  let transfers: TransferEdge[] = [];
  const routeShapes: Record<string, string> = {};

  // 1. Ingest MRT Jakarta
  console.log('📦 Loading MRT Jakarta Network Seed...');
  const mrtData = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, 'mrt-network.json'), 'utf-8'));
  for (const route of mrtData.routes) {
    const stopIndices: number[] = [];
    const stopDistances: number[] = [];
    for (let i = 0; i < route.stations.length; i++) {
      const st = route.stations[i];
      let idx = stopMap.get(st.id);
      if (idx === undefined) {
        idx = stops.length;
        stops.push({ id: st.id, name: st.name, lat: st.lat, lon: st.lon, mode: Mode.MRT });
        stopMap.set(st.id, idx);
      }
      stopIndices.push(idx);
      const d = st.km !== undefined ? Math.round(st.km * 1000) : (i === 0 ? 0 : stopDistances[i - 1] + 1200);
      stopDistances.push(d);
    }
    routes.push({
      id: route.id,
      shortName: route.shortName,
      longName: route.longName,
      color: route.color,
      stopIndices,
      headwaySeconds: route.peakHeadwaySeconds,
      stopDistances
    });

    // Return route
    const revDistances: number[] = [];
    const maxD = stopDistances[stopDistances.length - 1];
    for (let i = stopDistances.length - 1; i >= 0; i--) {
      revDistances.push(maxD - stopDistances[i]);
    }
    routes.push({
      id: `${route.id}-rev`,
      shortName: route.shortName,
      longName: `${route.longName} (Return)`,
      color: route.color,
      stopIndices: [...stopIndices].reverse(),
      headwaySeconds: route.peakHeadwaySeconds,
      stopDistances: revDistances
    });
  }

  // 2. Ingest LRT (Jabodebek & Jakarta)
  console.log('📦 Loading LRT Network Seed...');
  const lrtData = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, 'lrt-network.json'), 'utf-8'));
  for (const route of lrtData.routes) {
    const stopIndices: number[] = [];
    const stopDistances: number[] = [0];
    for (let i = 0; i < route.stations.length; i++) {
      const st = route.stations[i];
      let idx = stopMap.get(st.id);
      if (idx === undefined) {
        idx = stops.length;
        stops.push({ id: st.id, name: st.name, lat: st.lat, lon: st.lon, mode: Mode.LRT });
        stopMap.set(st.id, idx);
      }
      stopIndices.push(idx);
      if (i > 0) {
        const prev = route.stations[i - 1];
        const d = haversineMeters(prev.lat, prev.lon, st.lat, st.lon);
        stopDistances.push(stopDistances[i - 1] + d);
      }
    }
    routes.push({
      id: route.id,
      shortName: route.shortName,
      longName: route.longName,
      color: route.color,
      stopIndices,
      headwaySeconds: route.peakHeadwaySeconds,
      stopDistances
    });

    // Return route
    const revDistances: number[] = [];
    const maxD = stopDistances[stopDistances.length - 1];
    for (let i = stopDistances.length - 1; i >= 0; i--) {
      revDistances.push(maxD - stopDistances[i]);
    }
    routes.push({
      id: `${route.id}-rev`,
      shortName: route.shortName,
      longName: `${route.longName} (Return)`,
      color: route.color,
      stopIndices: [...stopIndices].reverse(),
      headwaySeconds: route.peakHeadwaySeconds,
      stopDistances: revDistances
    });
  }

  // 3. Ingest KRL Commuterline
  console.log('📦 Loading KRL Commuterline Network Seed...');
  const krlData = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, 'krl-network.json'), 'utf-8'));
  for (const route of krlData.routes) {
    const stopIndices: number[] = [];
    const stopDistances: number[] = [];
    for (let i = 0; i < route.stations.length; i++) {
      const st = route.stations[i];
      let idx = stopMap.get(st.id);
      if (idx === undefined) {
        idx = stops.length;
        stops.push({ id: st.id, name: st.name, lat: st.lat, lon: st.lon, mode: Mode.COMMUTER_RAIL });
        stopMap.set(st.id, idx);
      }
      stopIndices.push(idx);
      const d = st.km !== undefined ? Math.round(st.km * 1000) : (i === 0 ? 0 : stopDistances[i - 1] + 2500);
      stopDistances.push(d);
    }
    routes.push({
      id: route.id,
      shortName: route.shortName,
      longName: route.longName,
      color: route.color,
      stopIndices,
      headwaySeconds: route.peakHeadwaySeconds,
      stopDistances
    });

    // Return route
    const revDistances: number[] = [];
    const maxD = stopDistances[stopDistances.length - 1];
    for (let i = stopDistances.length - 1; i >= 0; i--) {
      revDistances.push(maxD - stopDistances[i]);
    }
    routes.push({
      id: `${route.id}-rev`,
      shortName: route.shortName,
      longName: `${route.longName} (Return)`,
      color: route.color,
      stopIndices: [...stopIndices].reverse(),
      headwaySeconds: route.peakHeadwaySeconds,
      stopDistances: revDistances
    });
  }

  // 4. Ingest Transjakarta GTFS (stops, routes, trips, stop_times)
  console.log('🌐 Checking Transjakarta GTFS bundle...');
  let hasGTFS = false;
  const localZipPath = path.join(ROOT_DIR, 'tmp_gtfs.zip');
  const tempZipPath = path.join(TMP_DIR, 'tj_gtfs.zip');

  if (fs.existsSync(localZipPath)) {
    console.log('📦 Using local cached tmp_gtfs.zip...');
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
    execSync(`tar -xf "${localZipPath}" -C "${TMP_DIR}"`);
    hasGTFS = true;
  } else {
    try {
      const res = await fetchWithTimeout(GTFS_URL, 15000);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
        fs.writeFileSync(localZipPath, Buffer.from(buffer));
        console.log(`✅ Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB GTFS zip. Cached to tmp_gtfs.zip and unpacking...`);
        execSync(`tar -xf "${localZipPath}" -C "${TMP_DIR}"`);
        hasGTFS = true;
      }
    } catch (err: any) {
      console.warn(`⚠️ Note: Live GTFS fetch skipped (${err.message}).`);
    }
  }

  if (hasGTFS) {
    console.log('🔄 Parsing Transjakarta GTFS routes, trips, and stop sequences...');
    const stopsFile = path.join(TMP_DIR, 'stops.txt');
    const routesFile = path.join(TMP_DIR, 'routes.txt');
    const tripsFile = path.join(TMP_DIR, 'trips.txt');
    const stopTimesFile = path.join(TMP_DIR, 'stop_times.txt');

    if (fs.existsSync(stopsFile) && fs.existsSync(routesFile) && fs.existsSync(tripsFile) && fs.existsSync(stopTimesFile)) {
      // 4.1 Parse stops.txt into memory
      const stopRawMap = new Map<string, { id: string; name: string; lat: number; lon: number }>();
      const stopLines = fs.readFileSync(stopsFile, 'utf-8').trim().split('\n');
      const sH = parseCSVLine(stopLines[0]);
      const sIdIdx = sH.indexOf('stop_id');
      const sNameIdx = sH.indexOf('stop_name');
      const sLatIdx = sH.indexOf('stop_lat');
      const sLonIdx = sH.indexOf('stop_lon');

      for (let i = 1; i < stopLines.length; i++) {
        const row = parseCSVLine(stopLines[i]);
        if (row.length <= Math.max(sIdIdx, sNameIdx, sLatIdx, sLonIdx)) continue;
        const rawId = row[sIdIdx];
        const name = row[sNameIdx];
        const lat = parseFloat(row[sLatIdx]);
        const lon = parseFloat(row[sLonIdx]);
        if (!isNaN(lat) && !isNaN(lon)) {
          stopRawMap.set(rawId, { id: `tj:${rawId}`, name, lat, lon });
        }
      }

      // 4.2 Parse routes.txt
      const routeRawMap = new Map<string, { id: string; shortName: string; longName: string; color: string; desc: string }>();
      const routeLines = fs.readFileSync(routesFile, 'utf-8').trim().split('\n');
      const rH = parseCSVLine(routeLines[0]);
      const rIdIdx = rH.indexOf('route_id');
      const rShortIdx = rH.indexOf('route_short_name');
      const rLongIdx = rH.indexOf('route_long_name');
      const rColorIdx = rH.indexOf('route_color');
      const rDescIdx = rH.indexOf('route_desc');

      for (let i = 1; i < routeLines.length; i++) {
        const row = parseCSVLine(routeLines[i]);
        if (row.length <= Math.max(rIdIdx, rShortIdx, rLongIdx)) continue;
        const rId = row[rIdIdx];
        const shortName = row[rShortIdx];
        const longName = row[rLongIdx];
        const color = row[rColorIdx] ? `#${row[rColorIdx]}` : '#0055A5';
        const desc = row[rDescIdx] || '';
        routeRawMap.set(rId, { id: rId, shortName, longName, color, desc });
      }

      // 4.3 Parse trips.txt
      const tripToRoute = new Map<string, { routeId: string; headsign: string; direction: string }>();
      const tripLines = fs.readFileSync(tripsFile, 'utf-8').trim().split('\n');
      const tH = parseCSVLine(tripLines[0]);
      const tTripIdx = tH.indexOf('trip_id');
      const tRouteIdx = tH.indexOf('route_id');
      const tHeadsignIdx = tH.indexOf('trip_headsign');
      const tDirIdx = tH.indexOf('direction_id');

      for (let i = 1; i < tripLines.length; i++) {
        const row = parseCSVLine(tripLines[i]);
        if (row.length <= Math.max(tTripIdx, tRouteIdx)) continue;
        tripToRoute.set(row[tTripIdx], {
          routeId: row[tRouteIdx],
          headsign: row[tHeadsignIdx] || '',
          direction: row[tDirIdx] || '0'
        });
      }

      // 4.4 Parse stop_times.txt
      const tripStops = new Map<string, Array<{ seq: number; stopId: string }>>();
      const stLines = fs.readFileSync(stopTimesFile, 'utf-8').trim().split('\n');
      const stH = parseCSVLine(stLines[0]);
      const stTripIdx = stH.indexOf('trip_id');
      const stSeqIdx = stH.indexOf('stop_sequence');
      const stStopIdx = stH.indexOf('stop_id');

      for (let i = 1; i < stLines.length; i++) {
        const row = parseCSVLine(stLines[i]);
        if (row.length <= Math.max(stTripIdx, stSeqIdx, stStopIdx)) continue;
        const tripId = row[stTripIdx];
        const seq = parseInt(row[stSeqIdx], 10);
        const stopId = row[stStopIdx];
        if (!tripStops.has(tripId)) tripStops.set(tripId, []);
        tripStops.get(tripId)!.push({ seq, stopId });
      }

      // 4.5 Group canonical route stop patterns
      const routeGroups = new Map<string, { tripMeta: { routeId: string; headsign: string; direction: string }; trips: string[][] }>();
      for (const [tripId, stopList] of tripStops.entries()) {
        const tripMeta = tripToRoute.get(tripId);
        if (!tripMeta) continue;
        stopList.sort((a, b) => a.seq - b.seq);
        const groupKey = `${tripMeta.routeId}__dir${tripMeta.direction}`;
        if (!routeGroups.has(groupKey)) {
          routeGroups.set(groupKey, { tripMeta, trips: [] });
        }
        routeGroups.get(groupKey)!.trips.push(stopList.map(s => s.stopId));
      }

      for (const group of routeGroups.values()) {
        const { tripMeta, trips: groupTrips } = group;
        const routeInfo = routeRawMap.get(tripMeta.routeId);
        if (!routeInfo) continue;

        // Find most frequent / comprehensive stop pattern
        const patternCounts = new Map<string, number>();
        for (const t of groupTrips) {
          const k = t.join(';');
          patternCounts.set(k, (patternCounts.get(k) || 0) + 1);
        }
        const sorted = Array.from(patternCounts.entries()).sort((a, b) => b[1] - a[1]);
        const canonicalStopRawIds = sorted[0][0].split(';');

        // Determine mode
        let mode: number = Mode.BRT;
        const desc = (routeInfo.desc || '').toLowerCase();
        if (desc.includes('mikrotrans')) mode = Mode.MIKROTRANS;
        else if (desc.includes('integrasi') || desc.includes('feeder') || desc.includes('non brt') || desc.includes('wisata')) mode = Mode.NON_BRT;

        const routeStopIndices: number[] = [];
        const routeStopDistances: number[] = [0];

        for (let sIdx = 0; sIdx < canonicalStopRawIds.length; sIdx++) {
          const rawId = canonicalStopRawIds[sIdx];
          const rawStop = stopRawMap.get(rawId);
          if (!rawStop) continue;

          let stopIndex = stopMap.get(rawStop.id);
          if (stopIndex === undefined) {
            stopIndex = stops.length;
            stops.push({ id: rawStop.id, name: rawStop.name, lat: rawStop.lat, lon: rawStop.lon, mode });
            stopMap.set(rawStop.id, stopIndex);
          }
          routeStopIndices.push(stopIndex);

          if (routeStopIndices.length > 1) {
            const prev = stops[routeStopIndices[routeStopIndices.length - 2]];
            const curr = stops[stopIndex];
            const d = haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);
            routeStopDistances.push(routeStopDistances[routeStopDistances.length - 1] + d);
          }
        }

        if (routeStopIndices.length >= 2) {
          routes.push({
            id: `tj:${tripMeta.routeId}-${tripMeta.direction}`,
            shortName: routeInfo.shortName,
            longName: `${routeInfo.longName}${tripMeta.headsign ? ` (${tripMeta.headsign})` : ''}`,
            color: routeInfo.color,
            stopIndices: routeStopIndices,
            headwaySeconds: mode === Mode.BRT ? 180 : 360,
            stopDistances: routeStopDistances
          });
        }
      }

      console.log(`✅ Parsed ${routes.length} total operable transit routes across Jakarta.`);
    }

    // Cleanup tmp dir
    try {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch {}
  }

  // 4b. Core Transjakarta Corridors & Feeders (ALWAYS populated & mapped to stops)
  console.log('🚌 Populating Core Transjakarta Corridors & Key Feeder Routes...');

  const addRouteHelper = (
    routeId: string,
    shortName: string,
    longName: string,
    color: string,
    mode: number,
    headwaySeconds: number,
    stopDefinitions: { id: string; name: string; lat: number; lon: number }[]
  ) => {
    const indices: number[] = [];
    const stopDistances: number[] = [0];
    for (let i = 0; i < stopDefinitions.length; i++) {
      const st = stopDefinitions[i];
      let idx = stopMap.get(st.id);
      if (idx === undefined) {
        idx = stops.length;
        stops.push({ id: st.id, name: st.name, lat: st.lat, lon: st.lon, mode });
        stopMap.set(st.id, idx);
      }
      indices.push(idx);
      if (i > 0) {
        const prev = stopDefinitions[i - 1];
        const d = haversineMeters(prev.lat, prev.lon, st.lat, st.lon);
        stopDistances.push(stopDistances[i - 1] + d);
      }
    }
    routes.push({
      id: routeId,
      shortName,
      longName,
      color,
      stopIndices: indices,
      headwaySeconds,
      stopDistances
    });

    // Add return route direction
    const revDistances: number[] = [];
    const maxD = stopDistances[stopDistances.length - 1];
    for (let i = stopDistances.length - 1; i >= 0; i--) {
      revDistances.push(maxD - stopDistances[i]);
    }
    routes.push({
      id: `${routeId}-rev`,
      shortName,
      longName: `${longName} (Return)`,
      color,
      stopIndices: [...indices].reverse(),
      headwaySeconds,
      stopDistances: revDistances
    });
  };

  // Corridor 1: Blok M - Kota
  addRouteHelper(
    'tj:corridor-1',
    '1',
    'Corridor 1 (Blok M - Kota)',
    '#0066FF',
    Mode.BRT,
    180,
    [
      { id: 'tj:1-1', name: 'Blok M', lat: -6.2443, lon: 106.7981 },
      { id: 'tj:1-2', name: 'Masjid Agung', lat: -6.2385, lon: 106.7995 },
      { id: 'tj:1-4', name: 'CSW 1', lat: -6.2384, lon: 106.7979 },
      { id: 'tj:1-5', name: 'Bundaran Senayan', lat: -6.2268, lon: 106.8016 },
      { id: 'tj:1-6', name: 'Gelora Bung Karno', lat: -6.2215, lon: 106.8065 },
      { id: 'tj:1-7', name: 'Polda Metro Jaya', lat: -6.2238, lon: 106.8087 },
      { id: 'tj:1-8', name: 'Bendungan Hilir', lat: -6.2162, lon: 106.8188 },
      { id: 'tj:1-10', name: 'Karet Sudirman', lat: -6.2088, lon: 106.8219 },
      { id: 'tj:1-12', name: 'Dukuh Atas 1', lat: -6.2008, lon: 106.8227 },
      { id: 'tj:1-14', name: 'Tosari (Grand Indonesia)', lat: -6.1955, lon: 106.8231 },
      { id: 'tj:1-15', name: 'Bundaran HI', lat: -6.1923, lon: 106.8231 },
      { id: 'tj:1-16', name: 'Sarinah', lat: -6.1865, lon: 106.8235 },
      { id: 'tj:1-17', name: 'Bank Indonesia', lat: -6.1812, lon: 106.8236 },
      { id: 'tj:1-18', name: 'Monumen Nasional (Monas)', lat: -6.1754, lon: 106.8271 },
      { id: 'tj:1-19', name: 'Harmoni', lat: -6.1667, lon: 106.8185 },
      { id: 'tj:1-22', name: 'Jakarta Kota', lat: -6.1376, lon: 106.8146 }
    ]
  );

  // Corridor 6: Ragunan - Galunggung (Dukuh Atas 2)
  addRouteHelper(
    'tj:corridor-6',
    '6',
    'Corridor 6 (Ragunan - Galunggung / Dukuh Atas)',
    '#20B2AA',
    Mode.BRT,
    240,
    [
      { id: 'tj:6-1', name: 'Ragunan', lat: -6.3112, lon: 106.8205 },
      { id: 'tj:6-4', name: 'Pejaten', lat: -6.2745, lon: 106.8285 },
      { id: 'tj:6-7', name: 'Mampang Prapatan', lat: -6.2485, lon: 106.8275 },
      { id: 'tj:6-8', name: 'Kuningan Barat', lat: -6.2365, lon: 106.8288 },
      { id: 'tj:6-9', name: 'Patra Kuningan', lat: -6.2305, lon: 106.8315 },
      { id: 'tj:6-10', name: 'Departemen Kesehatan', lat: -6.2245, lon: 106.8318 },
      { id: 'tj:6-11', name: 'GOR Soemantri', lat: -6.2195, lon: 106.8315 },
      { id: 'tj:6-12', name: 'Karet Kuningan', lat: -6.2145, lon: 106.8312 },
      { id: 'tj:6-13', name: 'Kuningan Madya', lat: -6.2085, lon: 106.8305 },
      { id: 'tj:6-14', name: 'Halimun', lat: -6.2045, lon: 106.8285 },
      { id: 'tj:4-17', name: 'Galunggung (Dukuh Atas 2)', lat: -6.2015, lon: 106.8245 }
    ]
  );

  // Corridor 6C: Stasiun Tebet - Kuningan - Karet / Tosari
  addRouteHelper(
    'tj:feeder-6c',
    '6C',
    'Feeder 6C (Stasiun Tebet - Kuningan - Karet / Tosari)',
    '#FFA500',
    Mode.NON_BRT,
    300,
    [
      { id: 'tj:6c-tebet', name: 'Stasiun Tebet Pintu Barat', lat: -6.2265, lon: 106.8584 },
      { id: 'tj:6c-palbatu', name: 'Pal Batu', lat: -6.2255, lon: 106.8485 },
      { id: 'tj:6c-casablanca', name: 'Mall Ambassador / Mega Kuningan', lat: -6.2235, lon: 106.8265 },
      { id: 'tj:6-11', name: 'GOR Soemantri', lat: -6.2195, lon: 106.8315 },
      { id: 'tj:1-10', name: 'Karet Sudirman', lat: -6.2088, lon: 106.8219 },
      { id: 'tj:1-14', name: 'Tosari (Grand Indonesia)', lat: -6.1955, lon: 106.8231 }
    ]
  );

  // Corridor 9: Pinang Ranti - Pluit
  addRouteHelper(
    'tj:corridor-9',
    '9',
    'Corridor 9 (Pinang Ranti - Pluit)',
    '#32CD32',
    Mode.BRT,
    240,
    [
      { id: 'tj:9-1', name: 'Pinang Ranti', lat: -6.2895, lon: 106.8835 },
      { id: 'tj:9-5', name: 'Cawang UKI', lat: -6.2575, lon: 106.8715 },
      { id: 'tj:9-7', name: 'Cikoko Stasiun Cawang', lat: -6.2425, lon: 106.8585 },
      { id: 'tj:9-8', name: 'Pancoran', lat: -6.2415, lon: 106.8435 },
      { id: 'tj:6-8', name: 'Kuningan Barat', lat: -6.2365, lon: 106.8288 },
      { id: 'tj:9-10', name: 'Gatot Subroto Jamsostek', lat: -6.2345, lon: 106.8185 },
      { id: 'tj:1-8', name: 'Bendungan Hilir / Semanggi', lat: -6.2162, lon: 106.8188 },
      { id: 'tj:9-14', name: 'Slipi Petamburan', lat: -6.2045, lon: 106.7995 },
      { id: 'tj:9-20', name: 'Grogol 2', lat: -6.1665, lon: 106.7885 },
      { id: 'tj:9-25', name: 'Pluit', lat: -6.1245, lon: 106.7925 }
    ]
  );

  // Corridor 13: Ciledug - Tendean
  addRouteHelper(
    'tj:corridor-13',
    '13',
    'Corridor 13 (Ciledug - Tendean)',
    '#8A2BE2',
    Mode.BRT,
    300,
    [
      { id: 'tj:13-1', name: 'CSW 13', lat: -6.2384, lon: 106.7979 },
      { id: 'tj:13-2', name: 'Velbak (Kebayoran)', lat: -6.2375, lon: 106.7825 },
      { id: 'tj:13-3', name: 'Mayestik', lat: -6.2415, lon: 106.7895 },
      { id: 'tj:13-4', name: 'Tendean', lat: -6.2415, lon: 106.8295 }
    ]
  );

  // Mikrotrans JAK-48A: Tebet - Rawamangun (Rp 0)
  addRouteHelper(
    'tj:jak-48a',
    'JAK-48A',
    'Mikrotrans JAK-48A (Stasiun Tebet - Rusun Klender)',
    '#00CED1',
    Mode.MIKROTRANS,
    360,
    [
      { id: 'tj:6c-tebet', name: 'Stasiun Tebet Pintu Barat', lat: -6.2265, lon: 106.8584 },
      { id: 'tj:jak-barkah', name: 'Barkah', lat: -6.2215, lon: 106.8545 },
      { id: 'tj:jak-manggarai', name: 'Manggarai Utara', lat: -6.2115, lon: 106.8515 },
      { id: 'krl:MRI', name: 'Manggarai', lat: -6.2099, lon: 106.8502 }
    ]
  );

  // 5. Ingest Curated Transfer Hubs & Directional Edges
  console.log('🌉 Linking Directional Transfer Hubs & Skywalks...');
  const hubs = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, 'transfer-hubs.json'), 'utf-8'));
  for (const hub of hubs) {
    for (const edge of hub.edges) {
      const fromIdx = stopMap.get(edge.fromStopId);
      const toIdx = stopMap.get(edge.toStopId);
      if (fromIdx !== undefined && toIdx !== undefined) {
        transfers.push({
          fromStopIndex: fromIdx,
          toStopIndex: toIdx,
          walkSeconds: edge.baseDurationSeconds,
          distanceMeters: edge.distanceMeters,
          isPaidAreaTransfer: edge.isPaidAreaTransfer,
          gateBufferSeconds: edge.gateBufferSeconds,
          peakPenaltySeconds: edge.peakPenaltySeconds,
          isSheltered: edge.isSheltered,
          isStepFree: edge.isStepFree
        });
      }
    }
  }

  // 6. Prune Orphan Stops (stops serving 0 routes and 0 transfers)
  console.log('🧹 Pruning isolated orphan stops with zero routes...');
  const usedStopOldIndices = new Set<number>();
  routes.forEach(r => r.stopIndices.forEach(idx => usedStopOldIndices.add(idx)));
  transfers.forEach(t => {
    usedStopOldIndices.add(t.fromStopIndex);
    usedStopOldIndices.add(t.toStopIndex);
  });

  const oldToNew = new Map<number, number>();
  const prunedStops: Stop[] = [];
  stops.forEach((s, oldIdx) => {
    if (usedStopOldIndices.has(oldIdx)) {
      const newIdx = prunedStops.length;
      prunedStops.push(s);
      oldToNew.set(oldIdx, newIdx);
    }
  });

  // Re-map route stopIndices
  routes.forEach(r => {
    r.stopIndices = r.stopIndices.map(idx => oldToNew.get(idx)!);
  });

  // Re-map transfers
  transfers = transfers.map(t => ({
    ...t,
    fromStopIndex: oldToNew.get(t.fromStopIndex)!,
    toStopIndex: oldToNew.get(t.toStopIndex)!
  }));

  stops = prunedStops;

  // 6b. Generate Proximity Footpath Transfers for ALL stops
  console.log('🚶 Generating Spatial Grid Proximity Footpath Transfers for All Stops...');
  const MAX_PROXIMITY_WALK_METERS = 400;
  const WALK_DETOUR_FACTOR = 1.3;
  const WALK_SPEED_METERS_PER_SEC = 1.2;
  const MAX_PROXIMITY_NEIGHBOURS = 8;
  const GRID_CELL_SIZE = 0.004; // ~440 meters grid cell for O(N) spatial lookup

  const curatedEdgeSet = new Set<string>();
  for (const t of transfers) {
    curatedEdgeSet.add(`${t.fromStopIndex}->${t.toStopIndex}`);
  }

  const grid = new Map<string, number[]>();
  function getCellKey(lat: number, lon: number): string {
    const x = Math.floor(lat / GRID_CELL_SIZE);
    const y = Math.floor(lon / GRID_CELL_SIZE);
    return `${x}:${y}`;
  }

  for (let i = 0; i < stops.length; i++) {
    const key = getCellKey(stops[i].lat, stops[i].lon);
    let cellList = grid.get(key);
    if (!cellList) {
      cellList = [];
      grid.set(key, cellList);
    }
    cellList.push(i);
  }

  function cleanStopNameForComparison(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(halte|stasiun|sbr|seberang|arah|utara|selatan|timur|barat|pintu)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  let proximityTransfersCount = 0;
  for (let i = 0; i < stops.length; i++) {
    const s1 = stops[i];
    const s1Clean = cleanStopNameForComparison(s1.name);
    const cellX = Math.floor(s1.lat / GRID_CELL_SIZE);
    const cellY = Math.floor(s1.lon / GRID_CELL_SIZE);

    interface Candidate {
      index: number;
      straightDist: number;
      isSameName: boolean;
    }
    const candidates: Candidate[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighborCellKey = `${cellX + dx}:${cellY + dy}`;
        const cellStops = grid.get(neighborCellKey);
        if (!cellStops) continue;

        for (const j of cellStops) {
          if (i === j) continue;
          const s2 = stops[j];
          // Proximity transfers link bus stops (tj-to-tj); rail interchanges are governed by curated hub seeds
          if (!s1.id.startsWith('tj:') || !s2.id.startsWith('tj:')) continue;

          const straightDist = haversineMeters(s1.lat, s1.lon, s2.lat, s2.lon);
          if (straightDist <= MAX_PROXIMITY_WALK_METERS) {
            const s2Clean = cleanStopNameForComparison(s2.name);
            const isSameName = (s1Clean.length > 2 && s1Clean === s2Clean);
            candidates.push({ index: j, straightDist, isSameName });
          }
        }
      }
    }

    // Sort by distance ascending
    candidates.sort((a, b) => a.straightDist - b.straightDist);

    // Pick up to MAX_PROXIMITY_NEIGHBOURS, plus any same-name stops within 400m
    const selectedIndices = new Set<number>();
    for (let c = 0; c < candidates.length && selectedIndices.size < MAX_PROXIMITY_NEIGHBOURS; c++) {
      selectedIndices.add(candidates[c].index);
    }
    for (const c of candidates) {
      if (c.isSameName) {
        selectedIndices.add(c.index);
      }
    }

    for (const targetIdx of selectedIndices) {
      const edgeKey = `${i}->${targetIdx}`;
      if (curatedEdgeSet.has(edgeKey)) {
        continue; // Never overwrite curated hub edges (curated hub edges win)
      }

      const cand = candidates.find(c => c.index === targetIdx)!;
      const distanceMeters = Math.round(cand.straightDist * WALK_DETOUR_FACTOR);
      const walkSeconds = Math.round(distanceMeters / WALK_SPEED_METERS_PER_SEC);

      transfers.push({
        fromStopIndex: i,
        toStopIndex: targetIdx,
        walkSeconds,
        distanceMeters,
        isPaidAreaTransfer: false,
        gateBufferSeconds: 0,
        peakPenaltySeconds: 0,
        isSheltered: false,
        isStepFree: false
      });
      proximityTransfersCount++;
    }
  }

  console.log(`✅ Generated ${proximityTransfersCount} proximity transfer edges across all operable stops.`);

  // 7. Build Inverted Index: stopRoutes[stopIndex] -> routeIndex[]
  console.log('⚡ Generating Inverted Stop-to-Route Index for RAPTOR...');
  const stopRoutes: number[][] = Array.from({ length: stops.length }, () => []);
  routes.forEach((route, routeIdx) => {
    route.stopIndices.forEach(stopIdx => {
      if (!stopRoutes[stopIdx].includes(routeIdx)) {
        stopRoutes[stopIdx].push(routeIdx);
      }
    });
  });

  // 8. Assemble and write the compiled network artifact
  const networkOutput = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    stops: stops.map(s => [s.id, s.name, s.lat, s.lon, s.mode]),
    routes: routes.map(r => [r.id, r.shortName, r.longName, r.color, r.stopIndices, r.headwaySeconds, r.stopDistances]),
    stopRoutes,
    transfers: transfers.map(t => [
      t.fromStopIndex,
      t.toStopIndex,
      t.walkSeconds,
      t.distanceMeters,
      t.isPaidAreaTransfer ? 1 : 0,
      t.gateBufferSeconds,
      t.peakPenaltySeconds,
      t.isSheltered ? 1 : 0,
      t.isStepFree ? 1 : 0
    ]),
    routeShapes
  };

  const jsonString = JSON.stringify(networkOutput);
  const jsonPath = path.join(DATA_DIR, 'jakarta-transit-network.json');
  fs.writeFileSync(jsonPath, jsonString);

  // Copy arterial GeoJSON
  fs.copyFileSync(
    path.join(SEEDS_DIR, 'jakarta-arterials.json'),
    path.join(DATA_DIR, 'jakarta-arterials.json')
  );

  // Compute version hash
  const hash = crypto.createHash('sha256').update(jsonString).digest('hex').slice(0, 12);
  const versionMeta = {
    graphVersion: `v1-${hash}`,
    generatedAt: new Date().toISOString(),
    totalStops: stops.length,
    totalRoutes: routes.length,
    totalTransfers: transfers.length,
    sizeBytes: Buffer.byteLength(jsonString)
  };
  fs.writeFileSync(path.join(DATA_DIR, 'version.json'), JSON.stringify(versionMeta, null, 2));

  console.log('\n🎉 Pipeline Complete! Verified Transit Network Artifact:');
  console.log(`- Total Transit Stops/Halte: ${stops.length}`);
  console.log(`- Total Multi-Modal Routes: ${routes.length}`);
  console.log(`- Total Directional Transfer Edges: ${transfers.length}`);
  console.log(`- Graph Size: ${(Buffer.byteLength(jsonString) / 1024).toFixed(1)} KB (${(Buffer.byteLength(jsonString) / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`- Version Hash: ${versionMeta.graphVersion}`);
  console.log(`- Output: ${jsonPath}`);
}

main().catch(err => {
  console.error('❌ Pipeline failed:', err);
  process.exit(1);
});
