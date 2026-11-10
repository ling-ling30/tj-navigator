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

async function fetchWithTimeout(url: string, timeoutMs = 8000) {
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
  const stops: Stop[] = [];
  const routes: Route[] = [];
  const transfers: TransferEdge[] = [];
  const routeShapes: Record<string, string> = {};

  // 1. Ingest MRT Jakarta
  console.log('📦 Loading MRT Jakarta Network Seed...');
  const mrtData = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, 'mrt-network.json'), 'utf-8'));
  for (const route of mrtData.routes) {
    const stopIndices: number[] = [];
    for (const st of route.stations) {
      let idx = stopMap.get(st.id);
      if (idx === undefined) {
        idx = stops.length;
        stops.push({ id: st.id, name: st.name, lat: st.lat, lon: st.lon, mode: Mode.MRT });
        stopMap.set(st.id, idx);
      }
      stopIndices.push(idx);
    }
    routes.push({
      id: route.id,
      shortName: route.shortName,
      longName: route.longName,
      color: route.color,
      stopIndices,
      headwaySeconds: route.peakHeadwaySeconds
    });

    // Add return route (Bundaran HI -> Lebak Bulus)
    routes.push({
      id: `${route.id}-rev`,
      shortName: route.shortName,
      longName: `${route.longName} (Return)`,
      color: route.color,
      stopIndices: [...stopIndices].reverse(),
      headwaySeconds: route.peakHeadwaySeconds
    });
  }

  // 2. Ingest LRT (Jabodebek & Jakarta)
  console.log('📦 Loading LRT Network Seed...');
  const lrtData = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, 'lrt-network.json'), 'utf-8'));
  for (const route of lrtData.routes) {
    const stopIndices: number[] = [];
    for (const st of route.stations) {
      let idx = stopMap.get(st.id);
      if (idx === undefined) {
        idx = stops.length;
        stops.push({ id: st.id, name: st.name, lat: st.lat, lon: st.lon, mode: Mode.LRT });
        stopMap.set(st.id, idx);
      }
      stopIndices.push(idx);
    }
    routes.push({
      id: route.id,
      shortName: route.shortName,
      longName: route.longName,
      color: route.color,
      stopIndices,
      headwaySeconds: route.peakHeadwaySeconds
    });

    // Add return route (Bundaran HI -> Lebak Bulus)
    routes.push({
      id: `${route.id}-rev`,
      shortName: route.shortName,
      longName: `${route.longName} (Return)`,
      color: route.color,
      stopIndices: [...stopIndices].reverse(),
      headwaySeconds: route.peakHeadwaySeconds
    });
  }

  // 3. Ingest KRL Commuterline
  console.log('📦 Loading KRL Commuterline Network Seed...');
  const krlData = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, 'krl-network.json'), 'utf-8'));
  for (const route of krlData.routes) {
    const stopIndices: number[] = [];
    for (const st of route.stations) {
      let idx = stopMap.get(st.id);
      if (idx === undefined) {
        idx = stops.length;
        stops.push({ id: st.id, name: st.name, lat: st.lat, lon: st.lon, mode: Mode.COMMUTER_RAIL });
        stopMap.set(st.id, idx);
      }
      stopIndices.push(idx);
    }
    routes.push({
      id: route.id,
      shortName: route.shortName,
      longName: route.longName,
      color: route.color,
      stopIndices,
      headwaySeconds: route.peakHeadwaySeconds
    });

    // Add return route (Bundaran HI -> Lebak Bulus)
    routes.push({
      id: `${route.id}-rev`,
      shortName: route.shortName,
      longName: `${route.longName} (Return)`,
      color: route.color,
      stopIndices: [...stopIndices].reverse(),
      headwaySeconds: route.peakHeadwaySeconds
    });
  }

  // 4. Ingest Transjakarta GTFS
  console.log('🌐 Fetching Transjakarta Official GTFS bundle...');
  let hasLiveGTFS = false;
  try {
    const res = await fetchWithTimeout(GTFS_URL, 12000);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
      const zipPath = path.join(TMP_DIR, 'tj_gtfs.zip');
      fs.writeFileSync(zipPath, Buffer.from(buffer));
      console.log(`✅ Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB GTFS zip. Unpacking...`);
      execSync(`tar -xf "${zipPath}" -C "${TMP_DIR}"`);
      hasLiveGTFS = true;
    }
  } catch (err: any) {
    console.warn(`⚠️ Note: Live GTFS fetch skipped (${err.message}). Using local corridor definitions.`);
  }

  if (hasLiveGTFS) {
    console.log('🔄 Parsing live Transjakarta GTFS tables...');
    // Parse stops.txt
    const stopsFile = path.join(TMP_DIR, 'stops.txt');
    if (fs.existsSync(stopsFile)) {
      const lines = fs.readFileSync(stopsFile, 'utf-8').trim().split('\n');
      const headers = parseCSVLine(lines[0]);
      const idIdx = headers.indexOf('stop_id');
      const nameIdx = headers.indexOf('stop_name');
      const latIdx = headers.indexOf('stop_lat');
      const lonIdx = headers.indexOf('stop_lon');

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length <= Math.max(idIdx, nameIdx, latIdx, lonIdx)) continue;
        const rawId = row[idIdx];
        const stopId = `tj:${rawId}`;
        const name = row[nameIdx];
        const lat = parseFloat(row[latIdx]);
        const lon = parseFloat(row[lonIdx]);

        if (!isNaN(lat) && !isNaN(lon)) {
          if (!stopMap.has(stopId)) {
            const idx = stops.length;
            stops.push({ id: stopId, name, lat, lon, mode: Mode.BRT });
            stopMap.set(stopId, idx);
          }
        }
      }
      console.log(`✅ Ingested ${stops.length} transit stops across Jakarta.`);
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
    for (const st of stopDefinitions) {
      let idx = stopMap.get(st.id);
      if (idx === undefined) {
        idx = stops.length;
        stops.push({ id: st.id, name: st.name, lat: st.lat, lon: st.lon, mode });
        stopMap.set(st.id, idx);
      }
      indices.push(idx);
    }
    routes.push({
      id: routeId,
      shortName,
      longName,
      color,
      stopIndices: indices,
      headwaySeconds
    });

    // Add return route direction
    routes.push({
      id: `${routeId}-rev`,
      shortName,
      longName: `${longName} (Return)`,
      color,
      stopIndices: [...indices].reverse(),
      headwaySeconds
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

  // Corridor 6C: Stasiun Tebet - Kuningan - Karet / Tosari (Direct Feeder from Stasiun Tebet!)
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

  // 6. Build Inverted Index: stopRoutes[stopIndex] -> routeIndex[]
  console.log('⚡ Generating Inverted Stop-to-Route Index for RAPTOR...');
  const stopRoutes: number[][] = Array.from({ length: stops.length }, () => []);
  routes.forEach((route, routeIdx) => {
    route.stopIndices.forEach(stopIdx => {
      if (!stopRoutes[stopIdx].includes(routeIdx)) {
        stopRoutes[stopIdx].push(routeIdx);
      }
    });
  });

  // 7. Assemble and write the compiled network artifact
  const networkOutput = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    stops: stops.map(s => [s.id, s.name, s.lat, s.lon, s.mode]),
    routes: routes.map(r => [r.id, r.shortName, r.longName, r.color, r.stopIndices, r.headwaySeconds]),
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
  console.log(`- Graph Size: ${(Buffer.byteLength(jsonString) / 1024).toFixed(1)} KB`);
  console.log(`- Version Hash: ${versionMeta.graphVersion}`);
  console.log(`- Output: ${jsonPath}`);
}

main().catch(err => {
  console.error('❌ Pipeline failed:', err);
  process.exit(1);
});
