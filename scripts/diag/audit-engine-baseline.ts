import fs from 'node:fs';
import path from 'node:path';
import { RaptorRouter } from '../../src/lib/router/raptor';
import { JourneyPlanner } from '../../src/lib/router/journey-planner';
import { TransitMode } from '../../src/types/transit';
import type { CompiledTransitNetwork, Itinerary, Leg } from '../../src/types/transit';

const DATA_PATH = path.resolve('public/data/jakarta-transit-network.json');
const GTFS_DIR = path.resolve('scripts/diag/gtfs');

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath: string): Array<Record<string, string>> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < headers.length) continue;
    const row: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) row[headers[h]] = vals[h];
    rows.push(row);
  }
  return rows;
}

function timeStrToSec(t: string): number {
  if (!t) return NaN;
  const parts = t.split(':').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return NaN;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

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

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  console.log('=== AUDITING ENGINE BASELINE ===');
  const network: CompiledTransitNetwork = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const router = new RaptorRouter(network);
  const planner = new JourneyPlanner(router);

  // 1. IN-VEHICLE TIME ERROR AGAINST GTFS TIMES
  console.log('\n--- 1. IN-VEHICLE TIME ERROR ANALYSIS ---');
  const stopTimesRaw = parseCSV(path.join(GTFS_DIR, 'stop_times.txt'));
  const tripsRaw = parseCSV(path.join(GTFS_DIR, 'trips.txt'));
  const routesRaw = parseCSV(path.join(GTFS_DIR, 'routes.txt'));
  const stopsRaw = parseCSV(path.join(GTFS_DIR, 'stops.txt'));

  const routeMap = new Map(routesRaw.map(r => [r.route_id, r]));
  const tripMap = new Map(tripsRaw.map(t => [t.trip_id, t]));
  const stopMap = new Map(stopsRaw.map(s => [s.stop_id, s]));

  const tripStops = new Map<string, Array<{ seq: number; stopId: string; arr: number; dep: number }>>();
  for (const st of stopTimesRaw) {
    if (!tripStops.has(st.trip_id)) tripStops.set(st.trip_id, []);
    tripStops.get(st.trip_id)!.push({
      seq: parseInt(st.stop_sequence, 10),
      stopId: st.stop_id,
      arr: timeStrToSec(st.arrival_time),
      dep: timeStrToSec(st.departure_time)
    });
  }
  for (const list of tripStops.values()) list.sort((a, b) => a.seq - b.seq);

  // Group by canonical route pattern
  interface RouteErrorStats {
    routeId: string;
    shortName: string;
    longName: string;
    directionId: string;
    hops: number;
    gtfsSeconds: number;
    engineSeconds: number;
    errorSeconds: number; // engine - gtfs
    errorPercent: number; // (engine - gtfs) / gtfs * 100
    absErrorSec: number;
  }

  const routeErrorList: RouteErrorStats[] = [];

  for (const [tripId, stops] of tripStops.entries()) {
    const t = tripMap.get(tripId);
    if (!t) continue;
    const r = routeMap.get(t.route_id);
    if (!r) continue;

    const gtfsDuration = stops[stops.length - 1].arr - stops[0].dep;
    const hops = stops.length - 1;
    if (hops <= 0 || gtfsDuration <= 0) continue;

    // Check mode as build-graph determines it
    const desc = (r.route_desc || '').toLowerCase();
    let mode = TransitMode.BRT;
    if (desc.includes('mikrotrans')) mode = TransitMode.MIKROTRANS;
    else if (desc.includes('integrasi') || desc.includes('feeder') || desc.includes('non brt') || desc.includes('wisata')) mode = TransitMode.NON_BRT;

    // In engine, perHopSec is:
    // mode === TransitMode.MRT ? 140 : mode === TransitMode.COMMUTER_RAIL ? 160 : mode === TransitMode.LRT ? 150 : mode === TransitMode.BRT ? 170 : 180;
    const perHopSec = mode === TransitMode.BRT ? 170 : 180;
    const engineDuration = hops * perHopSec;

    const errorSec = engineDuration - gtfsDuration;
    const errorPct = (errorSec / gtfsDuration) * 100;

    routeErrorList.push({
      routeId: t.route_id,
      shortName: r.route_short_name,
      longName: r.route_long_name,
      directionId: t.direction_id,
      hops,
      gtfsSeconds: gtfsDuration,
      engineSeconds: engineDuration,
      errorSeconds: errorSec,
      errorPercent: errorPct,
      absErrorSec: Math.abs(errorSec)
    });
  }

  const allAbsErrors = routeErrorList.map(r => r.absErrorSec);
  const allRawErrors = routeErrorList.map(r => r.errorSeconds);
  const allPctErrors = routeErrorList.map(r => r.errorPercent);

  console.log(`Analyzed ${routeErrorList.length} trips across Transjakarta network.`);
  console.log(`In-vehicle time error (Engine - GTFS):`);
  console.log(`  Raw Error (sec): median=${percentile(allRawErrors, 50).toFixed(0)}s (${(percentile(allRawErrors, 50)/60).toFixed(1)}m), p90=${percentile(allRawErrors, 90).toFixed(0)}s (${(percentile(allRawErrors, 90)/60).toFixed(1)}m)`);
  console.log(`  Absolute Error (sec): median=${percentile(allAbsErrors, 50).toFixed(0)}s (${(percentile(allAbsErrors, 50)/60).toFixed(1)}m), p90=${percentile(allAbsErrors, 90).toFixed(0)}s (${(percentile(allAbsErrors, 90)/60).toFixed(1)}m)`);
  console.log(`  Percentage Error (%): median=${percentile(allPctErrors, 50).toFixed(1)}%, p90=${percentile(allPctErrors, 90).toFixed(1)}%`);

  // Worst 15 routes by absolute error
  const worst15 = [...routeErrorList].sort((a, b) => b.absErrorSec - a.absErrorSec).slice(0, 15);
  console.log('\nTop 15 worst routes by absolute time error:');
  worst15.forEach((w, idx) => {
    console.log(`  ${idx + 1}. [${w.shortName}] dir ${w.directionId} (${w.hops} hops): GTFS=${(w.gtfsSeconds/60).toFixed(1)}m, Engine=${(w.engineSeconds/60).toFixed(1)}m, Error=${w.errorSeconds > 0 ? '+' : ''}${(w.errorSeconds/60).toFixed(1)}m (${w.errorPercent.toFixed(1)}%) [${w.longName}]`);
  });

  // Named routes: S61, S11, S12, S14, Corridor 1, Corridor 9
  const namedShortNames = ['S61', 'S11', 'S12', 'S14', '1', '9'];
  console.log('\nNamed routes audit:');
  for (const name of namedShortNames) {
    const matches = routeErrorList.filter(r => r.shortName.toUpperCase() === name.toUpperCase());
    if (matches.length === 0) {
      console.log(`  Route ${name}: NOT FOUND in GTFS trips`);
    } else {
      matches.forEach(m => {
        console.log(`  Route ${m.shortName} (dir ${m.directionId}, ${m.hops} hops): GTFS=${(m.gtfsSeconds/60).toFixed(1)}m (${m.gtfsSeconds}s), Engine=${(m.engineSeconds/60).toFixed(1)}m (${m.engineSeconds}s), Error=${m.errorSeconds > 0 ? '+' : ''}${(m.errorSeconds/60).toFixed(1)}m (${m.errorPercent.toFixed(1)}%)`);
      });
    }
  }

  // 2. 300 ORIGIN-DESTINATION PAIRS BENCHMARK
  console.log('\n--- 2. 300-PAIR QUERY BENCHMARK (OPTIONS, CIRCUITY, QUERY TIME) ---');
  const rng = mulberry32(42);

  // Active stops (stops used by at least 1 route)
  const activeStops = new Set<number>();
  network.routes.forEach(r => r[4].forEach(s => activeStops.add(s)));
  const activeStopList = Array.from(activeStops);

  console.log(`Sampling from ${activeStopList.length} active stops using mulberry32(42)...`);
  const SAMPLE_SIZE = 300;

  interface QueryBenchmarkResult {
    pairIndex: number;
    origStopIdx: number;
    destStopIdx: number;
    origName: string;
    destName: string;
    straightDistM: number;
    queryTimeMs: number;
    answerKind: string;
    itinerariesCount: number;
    distinctOptionsCount: number;
    distinctOptionSignatures: string[];
    bestItinerary?: {
      durationMin: number;
      transfersCount: number;
      legsCount: number;
      walkTransfersInRow: number;
      totalDistanceM: number;
      straightDistM: number;
      circuity: number;
      routesUsed: string[];
      summary: string;
    };
  }

  const queryResults: QueryBenchmarkResult[] = [];
  const optionsDistribution = { 0: 0, 1: 0, 2: 0, '3+': 0 };

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const origIdx = activeStopList[Math.floor(rng() * activeStopList.length)];
    let destIdx = activeStopList[Math.floor(rng() * activeStopList.length)];
    while (destIdx === origIdx) {
      destIdx = activeStopList[Math.floor(rng() * activeStopList.length)];
    }

    const origStop = network.stops[origIdx];
    const destStop = network.stops[destIdx];
    const straightDist = haversineMeters(origStop[2], origStop[3], destStop[2], destStop[3]);

    const t0 = performance.now();
    const planRes = planner.plan(
      { stopIndex: origIdx, lat: origStop[2], lon: origStop[3], name: origStop[1] },
      { stopIndex: destIdx, lat: destStop[2], lon: destStop[3], name: destStop[1] },
      8 * 3600 // 08:00
    );
    const t1 = performance.now();
    const queryTimeMs = t1 - t0;

    // Genuinely different options: compare set of route short names used, ignoring walking legs
    const distinctOptionSignatures = new Set<string>();
    for (const it of planRes.itineraries) {
      const transitRoutes = it.legs
        .filter(l => l.type === 'TRANSIT')
        .map(l => l.routeShortName || l.routeId || 'UNKNOWN')
        .sort()
        .join('+');
      if (transitRoutes.length > 0) {
        distinctOptionSignatures.add(transitRoutes);
      } else {
        // Pure walk
        distinctOptionSignatures.add('WALK');
      }
    }

    const distinctCount = distinctOptionSignatures.size;
    if (distinctCount === 0) optionsDistribution[0]++;
    else if (distinctCount === 1) optionsDistribution[1]++;
    else if (distinctCount === 2) optionsDistribution[2]++;
    else optionsDistribution['3+']++;

    let bestInfo: QueryBenchmarkResult['bestItinerary'];
    if (planRes.itineraries.length > 0) {
      const best = planRes.itineraries[0];
      let totalDist = 0;
      let maxWalkInRow = 0;
      let currentWalkInRow = 0;
      const routesUsed: string[] = [];

      for (const leg of best.legs) {
        totalDist += (leg.distanceMeters || 0);
        if (leg.type === 'WALK') {
          currentWalkInRow++;
          if (currentWalkInRow > maxWalkInRow) maxWalkInRow = currentWalkInRow;
        } else {
          currentWalkInRow = 0;
          routesUsed.push(leg.routeShortName || leg.routeId || '');
        }
      }

      const circuity = straightDist > 0 ? (totalDist / straightDist) : 1;

      bestInfo = {
        durationMin: best.totalDurationMinutes,
        transfersCount: best.transfersCount,
        legsCount: best.legs.length,
        walkTransfersInRow: maxWalkInRow,
        totalDistanceM: totalDist,
        straightDistM: straightDist,
        circuity,
        routesUsed,
        summary: best.legs.map(l => l.type === 'WALK' ? `Walk(${l.distanceMeters}m)` : `${l.routeShortName}(${l.fromStopName}->${l.toStopName})`).join(' -> ')
      };
    }

    queryResults.push({
      pairIndex: i,
      origStopIdx: origIdx,
      destStopIdx: destIdx,
      origName: origStop[1],
      destName: destStop[1],
      straightDistM: straightDist,
      queryTimeMs,
      answerKind: planRes.answerKind,
      itinerariesCount: planRes.itineraries.length,
      distinctOptionsCount: distinctCount,
      distinctOptionSignatures: Array.from(distinctOptionSignatures),
      bestItinerary: bestInfo
    });
  }

  console.log(`\nOptions distribution across ${SAMPLE_SIZE} queries:`);
  console.log(`  0 options: ${optionsDistribution[0]} (${((optionsDistribution[0]/SAMPLE_SIZE)*100).toFixed(1)}%)`);
  console.log(`  1 distinct option: ${optionsDistribution[1]} (${((optionsDistribution[1]/SAMPLE_SIZE)*100).toFixed(1)}%)`);
  console.log(`  2 distinct options: ${optionsDistribution[2]} (${((optionsDistribution[2]/SAMPLE_SIZE)*100).toFixed(1)}%)`);
  console.log(`  3+ distinct options: ${optionsDistribution['3+']} (${((optionsDistribution['3+']/SAMPLE_SIZE)*100).toFixed(1)}%)`);

  // Query times
  const queryTimes = queryResults.map(q => q.queryTimeMs);
  console.log(`\nQuery execution time (ms):`);
  console.log(`  p50: ${percentile(queryTimes, 50).toFixed(2)} ms`);
  console.log(`  p90: ${percentile(queryTimes, 90).toFixed(2)} ms`);
  console.log(`  p95: ${percentile(queryTimes, 95).toFixed(2)} ms`);
  console.log(`  max: ${Math.max(...queryTimes).toFixed(2)} ms`);

  // Circuity analysis
  const validCircuities = queryResults
    .filter(q => q.bestItinerary && q.straightDistM >= 1000) // minimum 1km straight line to avoid division anomalies
    .map(q => q.bestItinerary!.circuity);

  console.log(`\nCircuity distribution (trips >= 1 km straight distance, n=${validCircuities.length}):`);
  console.log(`  min: ${Math.min(...validCircuities).toFixed(2)}`);
  console.log(`  p50: ${percentile(validCircuities, 50).toFixed(2)}`);
  console.log(`  p90: ${percentile(validCircuities, 90).toFixed(2)}`);
  console.log(`  max: ${Math.max(...validCircuities).toFixed(2)}`);

  // Legs and walking transfers in a row
  const validResults = queryResults.filter(q => q.bestItinerary);
  const legsList = validResults.map(q => q.bestItinerary!.legsCount);
  const walkRowList = validResults.map(q => q.bestItinerary!.walkTransfersInRow);
  console.log(`\nLegs count distribution:`);
  console.log(`  p50: ${percentile(legsList, 50)}, p90: ${percentile(legsList, 90)}, max: ${Math.max(...legsList)}`);
  console.log(`Walking transfers in a row:`);
  console.log(`  p50: ${percentile(walkRowList, 50)}, p90: ${percentile(walkRowList, 90)}, max: ${Math.max(...walkRowList)}`);

  // 20 worst circuity cases with cause
  const worstCircuities = queryResults
    .filter(q => q.bestItinerary && q.straightDistM >= 1000)
    .sort((a, b) => b.bestItinerary!.circuity - a.bestItinerary!.circuity)
    .slice(0, 20);

  console.log('\nTop 20 worst circuity cases:');
  worstCircuities.forEach((q, idx) => {
    const b = q.bestItinerary!;
    console.log(`  ${idx + 1}. Circuity=${b.circuity.toFixed(2)}x: ${q.origName} -> ${q.destName} (Straight: ${(b.straightDistM/1000).toFixed(1)}km, Travelled: ${(b.totalDistanceM/1000).toFixed(1)}km, Dur: ${b.durationMin}m, Kind: ${q.answerKind})`);
    console.log(`     Route: ${b.summary}`);
  });

  // 3. THE OWNER'S COMMUTE
  console.log('\n--- 3. THE OWNER COMMUTE BENCHMARK ---');
  // Flavor Bliss: tj:B08106P
  // Penjaringan stops: tj:G00074, tj:G00075
  const fbIdx = network.stops.findIndex(s => s[0] === 'tj:B08106P');
  const pj74Idx = network.stops.findIndex(s => s[0] === 'tj:G00074');
  const pj75Idx = network.stops.findIndex(s => s[0] === 'tj:G00075');

  console.log(`Stop indices: Flavor Bliss=${fbIdx}, Penjaringan(G00074)=${pj74Idx}, Penjaringan(G00075)=${pj75Idx}`);

  // Test 1: Stop to stop to tj:G00074
  console.log('\n[Commute 1A] Stop-to-stop: Flavor Bliss -> Penjaringan (tj:G00074):');
  const itins74 = router.planJourney(fbIdx, pj74Idx, 8 * 3600);
  if (itins74.length === 0) console.log('  No route found by planJourney!');
  else {
    itins74.forEach((it, idx) => {
      console.log(`  Itinerary #${idx + 1} (${it.totalDurationMinutes} min, ${it.transfersCount} transfers, fare Rp ${it.standardFareIdr}):`);
      it.legs.forEach(l => {
        console.log(`    - [${l.type}] ${l.type === 'TRANSIT' ? `Route ${l.routeShortName} (${l.routeId})` : 'WALK'}: ${l.fromStopName} -> ${l.toStopName} | dist: ${l.distanceMeters}m | stops: ${l.intermediateStopCount ?? 0} | dur: ${Math.round(l.durationSeconds/60)}m (${l.durationSeconds}s)`);
      });
    });
  }

  // Test 2: Stop to stop to tj:G00075
  console.log('\n[Commute 1B] Stop-to-stop: Flavor Bliss -> Penjaringan (tj:G00075):');
  const itins75 = router.planJourney(fbIdx, pj75Idx, 8 * 3600);
  if (itins75.length === 0) console.log('  No route found by planJourney!');
  else {
    itins75.forEach((it, idx) => {
      console.log(`  Itinerary #${idx + 1} (${it.totalDurationMinutes} min, ${it.transfersCount} transfers, fare Rp ${it.standardFareIdr}):`);
      it.legs.forEach(l => {
        console.log(`    - [${l.type}] ${l.type === 'TRANSIT' ? `Route ${l.routeShortName} (${l.routeId})` : 'WALK'}: ${l.fromStopName} -> ${l.toStopName} | dist: ${l.distanceMeters}m | stops: ${l.intermediateStopCount ?? 0} | dur: ${Math.round(l.durationSeconds/60)}m (${l.durationSeconds}s)`);
      });
    });
  }

  // Test 3: Point to point (~1.2 km from Flavor Bliss to ~400 m from Penjaringan)
  // Flavor Bliss is at lat: -6.244152, lon: 106.650826
  // Point 1.2 km away: e.g., -6.2360, 106.6570 (TRIP-14 in audit-trips.ts is ~1.1 km away)
  // Penjaringan stop G00075 is at lat: -6.126303, lon: 106.792088
  // Point ~400m away: e.g., -6.1240, 106.7910 (TRIP-14 dest is ~300m away)
  console.log('\n[Commute 2] Point-to-point (Coordinate ~1.2km from Flavor Bliss -> ~400m from Penjaringan):');
  const p2pRes = planner.plan(
    { lat: -6.2360, lon: 106.6570, name: 'Rumah Alam Sutera' },
    { lat: -6.1240, lon: 106.7910, name: 'Kantor Penjaringan' },
    8 * 3600
  );
  console.log(`  Answer kind: ${p2pRes.answerKind}, Level: ${p2pRes.ladderLevel}, Itineraries: ${p2pRes.itineraries.length}`);
  p2pRes.itineraries.forEach((it, idx) => {
    console.log(`  Itinerary #${idx + 1} (${it.totalDurationMinutes} min, ${it.transfersCount} transfers, fare Rp ${it.standardFareIdr}):`);
    it.legs.forEach(l => {
      console.log(`    - [${l.type}] ${l.type === 'TRANSIT' ? `Route ${l.routeShortName} (${l.routeId})` : 'WALK'}: ${l.fromStopName} -> ${l.toStopName} | dist: ${l.distanceMeters}m | stops: ${l.intermediateStopCount ?? 0} | dur: ${Math.round(l.durationSeconds/60)}m (${l.durationSeconds}s)`);
    });
  });

  // What does GTFS stop_times say for the legs of the owner commute?
  // Let's inspect S61 and Corridor 9 or 7R in GTFS
  console.log('\nGTFS stop_times duration for the commute components:');
  // S61: Flavor Bliss -> Kota Bambu
  const s61Trips = Array.from(tripStops.entries()).filter(([tId]) => tripMap.get(tId)?.route_id === 'S61');
  console.log(`S61 trips in GTFS: ${s61Trips.length}`);
  for (const [tId, stops] of s61Trips) {
    const t = tripMap.get(tId)!;
    const fbPos = stops.findIndex(s => s.stopId === 'B08106P');
    const kbPos = stops.findIndex(s => s.stopId === 'B05570P' || s.stopId.includes('B0557') || stopMap.get(s.stopId)?.stop_name.toLowerCase().includes('kota bambu'));
    console.log(`  Trip ${tId} (dir ${t.direction_id}): total stops ${stops.length}, FB pos: ${fbPos}`);
    if (fbPos >= 0) {
      // Find stops after FB
      stops.slice(fbPos, fbPos + 10).forEach(s => {
        console.log(`    Stop ${s.seq}: ${stopMap.get(s.stopId)?.stop_name} (${s.stopId}) arr=${s.arr} dep=${s.dep}`);
      });
      // Check last stop
      const last = stops[stops.length - 1];
      console.log(`    Last stop ${last.seq}: ${stopMap.get(last.stopId)?.stop_name} (${last.stopId}) arr=${last.arr}`);
      console.log(`    Duration FB -> last: ${(last.arr - stops[fbPos].dep)/60} min (${last.arr - stops[fbPos].dep}s)`);
    }
  }

  // Corridor 9: Kota Bambu -> Penjaringan
  const c9Trips = Array.from(tripStops.entries()).filter(([tId]) => tripMap.get(tId)?.route_id === '9');
  console.log(`\nCorridor 9 trips in GTFS: ${c9Trips.length}`);
  for (const [tId, stops] of c9Trips) {
    const t = tripMap.get(tId)!;
    console.log(`  Trip ${tId} (dir ${t.direction_id}): total stops ${stops.length}`);
    stops.forEach(s => {
      const name = stopMap.get(s.stopId)?.stop_name || s.stopId;
      if (name.toLowerCase().includes('bambu') || name.toLowerCase().includes('penjaringan') || name.toLowerCase().includes('pluit')) {
        console.log(`    ${s.seq}: ${name} (${s.stopId}) arr=${s.arr} dep=${s.dep}`);
      }
    });
  }

  // 4. HAND-WRITTEN ROUTES DUPLICATION & WINNING
  console.log('\n--- 4. HAND-WRITTEN ROUTES DUPLICATION AUDIT ---');
  // Check which handwritten routes duplicate GTFS routes
  // Handwritten: tj:corridor-1, tj:corridor-6, tj:feeder-6c, tj:corridor-9, tj:corridor-13, tj:jak-48a
  // GTFS routes: tj:1-0, tj:1-1, tj:6-0, tj:6-1, tj:6C-0, tj:9-0, tj:9-1, tj:13-0, tj:JAK.48A-0
  const hwRoutes = network.routes.filter(r =>
    r[0].startsWith('tj:corridor-') || r[0].startsWith('tj:feeder-') || r[0].startsWith('tj:jak-')
  );

  console.log(`Handwritten routes in compiled network: ${hwRoutes.length}`);
  hwRoutes.forEach(r => {
    console.log(`  [Handwritten] ID: ${r[0]}, Short: ${r[1]}, Long: ${r[2]}, Stops: ${r[4].length}`);
    // Find matching GTFS route
    const gtfsMatches = network.routes.filter(gr => gr[1] === r[1] && !gr[0].startsWith('tj:corridor-') && !gr[0].startsWith('tj:feeder-') && !gr[0].startsWith('tj:jak-'));
    gtfsMatches.forEach(gm => {
      console.log(`    vs [GTFS Route] ID: ${gm[0]}, Short: ${gm[1]}, Long: ${gm[2]}, Stops: ${gm[4].length}`);
    });
  });

  // Test queries where handwritten route wins vs GTFS route
  console.log('\nTesting queries between stops served by both:');
  // Blok M (tj:1-1) to Kota (tj:1-22)
  const blokMIdx = network.stops.findIndex(s => s[0] === 'tj:1-1');
  const kotaIdx = network.stops.findIndex(s => s[0] === 'tj:1-22');
  console.log(`Blok M (${blokMIdx}) -> Kota (${kotaIdx}):`);
  const blokMKota = router.planJourney(blokMIdx, kotaIdx, 8 * 3600);
  blokMKota.forEach((it, idx) => {
    console.log(`  Itin #${idx+1}: dur=${it.totalDurationMinutes}m, routes=${it.legs.filter(l => l.type === 'TRANSIT').map(l => `${l.routeShortName} (${l.routeId})`).join(', ')}`);
  });

  // Pinang Ranti (tj:9-1) to Pluit (tj:9-25)
  const prIdx = network.stops.findIndex(s => s[0] === 'tj:9-1');
  const pluitIdx = network.stops.findIndex(s => s[0] === 'tj:9-25');
  console.log(`\nPinang Ranti (${prIdx}) -> Pluit (${pluitIdx}):`);
  const prPluit = router.planJourney(prIdx, pluitIdx, 8 * 3600);
  prPluit.forEach((it, idx) => {
    console.log(`  Itin #${idx+1}: dur=${it.totalDurationMinutes}m, routes=${it.legs.filter(l => l.type === 'TRANSIT').map(l => `${l.routeShortName} (${l.routeId})`).join(', ')}`);
  });

  console.log('\n=== ENGINE BASELINE AUDIT COMPLETE ===');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
