/**
 * Headless Logic & Routing Audit Script for TJ-Navigator
 * Runs RaptorRouter, JourneyPlanner, FareEngine, and Data Validation against real Jakarta transit trips.
 *
 * Execution:
 *   node scripts/audit-trips.mjs  (or npx vite-node scripts/audit-trips.ts)
 */

import fs from 'node:fs';
import path from 'node:path';
import { RaptorRouter } from '../src/lib/router/raptor';
import { JourneyPlanner } from '../src/lib/router/journey-planner';
import { calculateItineraryFare } from '../src/lib/fare/fare-engine';
import type { CompiledTransitNetwork, Itinerary, AnswerKind } from '../src/types/transit';

const DATA_PATH = path.resolve('public/data/jakarta-transit-network.json');
if (!fs.existsSync(DATA_PATH)) {
  console.error(`❌ Transit network data not found at ${DATA_PATH}`);
  process.exit(1);
}

const network: CompiledTransitNetwork = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
const router = new RaptorRouter(network);
const planner = new JourneyPlanner(router);

function findStopIndexById(id: string): number {
  return network.stops.findIndex(s => s[0] === id);
}

interface TestCase {
  id: string;
  name: string;
  originId?: string;
  destId?: string;
  originCoord?: { lat: number; lon: number; name: string };
  destCoord?: { lat: number; lon: number; name: string };
  expectedRoute: string;
  expectedDurationMin: string;
  maxTransfers?: number;
  expectedTransfers?: number;
  expectedStandardFareIdr?: number;
  maxFareIdr?: number;
  expectedIntegratedFareIdr?: number;
  notes: string;
}

const TEST_TRIPS: TestCase[] = [
  {
    id: 'TRIP-01',
    name: 'Blok M -> Kota (Pure BRT Corridor 1)',
    originId: 'tj:1-1',
    destId: 'tj:1-22',
    expectedRoute: 'Corridor 1 (direct, 16 stops)',
    expectedDurationMin: '40-55 min',
    expectedTransfers: 0,
    expectedStandardFareIdr: 3500,
    expectedIntegratedFareIdr: 3500,
    notes: 'Published TJ flat fare: Rp 3.500. JakLingko integrated fare not applicable for single mode.'
  },
  {
    id: 'TRIP-02',
    name: 'Tebet -> Bundaran HI (Multi-Modal KRL -> MRT)',
    originId: 'krl:TEB',
    destId: 'mrt:BHI',
    expectedRoute: 'KRL Tebet->Manggarai->Sudirman + Walk Skywalk Dukuh Atas + MRT Dukuh Atas BNI->Bundaran HI',
    expectedDurationMin: '30-40 min',
    expectedTransfers: 2,
    expectedStandardFareIdr: 7000,
    expectedIntegratedFareIdr: 7000,
    notes: 'KRL is operated by KCI (not JakLingko). MRT 1 station is Rp 4.000.'
  },
  {
    id: 'TRIP-03',
    name: 'Bekasi -> Sudirman (Direct KRL Cikarang Line)',
    originId: 'krl:BKS',
    destId: 'krl:SUD',
    expectedRoute: 'KRL Cikarang Line direct (Bekasi -> Sudirman, 8 stops)',
    expectedDurationMin: '35-45 min',
    expectedTransfers: 0,
    expectedStandardFareIdr: 4000,
    expectedIntegratedFareIdr: 4000,
    notes: 'Published KCI fare table: Bekasi to Sudirman is Rp 4.000.'
  },
  {
    id: 'TRIP-04',
    name: 'Bogor -> Manggarai (Direct KRL Bogor Line)',
    originId: 'krl:BOG',
    destId: 'krl:MRI',
    expectedRoute: 'KRL Bogor Line direct (16 stops)',
    expectedDurationMin: '50-60 min',
    expectedTransfers: 0,
    expectedStandardFareIdr: 5000,
    expectedIntegratedFareIdr: 5000,
    notes: 'Published KCI fare table: Bogor to Manggarai is Rp 5.000.'
  },
  {
    id: 'TRIP-05',
    name: 'Sudirman -> Dukuh Atas BNI (Pure Walk Transfer)',
    originId: 'krl:SUD',
    destId: 'mrt:DKA',
    expectedRoute: 'Pedestrian concourse walk (280m, ~4 min)',
    expectedDurationMin: '4-6 min',
    expectedTransfers: 0,
    expectedStandardFareIdr: 0,
    expectedIntegratedFareIdr: 0,
    notes: 'Underground walkway connecting heavy rail to metro station.'
  },
  {
    id: 'TRIP-06',
    name: 'Dukuh Atas 1 -> Sudirman (Reverse Walk Transfer)',
    originId: 'tj:1-12',
    destId: 'krl:SUD',
    expectedRoute: 'Pedestrian walk Dukuh Atas 1 BRT to Sudirman KRL (180m, ~3 min)',
    expectedDurationMin: '3-5 min',
    expectedTransfers: 0,
    expectedStandardFareIdr: 0,
    expectedIntegratedFareIdr: 0,
    notes: 'Reverse edge of Sudirman -> Dukuh Atas 1.'
  },
  {
    id: 'TRIP-07',
    name: 'Pinang Ranti -> Pluit (Pure BRT Corridor 9)',
    originId: 'tj:9-1',
    destId: 'tj:9-25',
    expectedRoute: 'Corridor 9 direct (10 stops in graph)',
    expectedDurationMin: '50-70 min',
    expectedTransfers: 0,
    expectedStandardFareIdr: 3500,
    expectedIntegratedFareIdr: 3500,
    notes: 'Published TJ flat fare: Rp 3.500.'
  },
  {
    id: 'TRIP-08',
    name: 'CSW 1 -> Velbak (BRT Corridor 1 -> 13 at CSW Hub)',
    originId: 'tj:1-4',
    destId: 'tj:13-2',
    expectedRoute: 'CSW 1 walk/escalator to CSW 13 + Corridor 13 to Velbak',
    expectedDurationMin: '10-15 min',
    expectedTransfers: 1,
    expectedStandardFareIdr: 3500,
    expectedIntegratedFareIdr: 3500,
    notes: 'Transfer inside CSW transit hub is paid-area (free Rp 0).'
  },
  {
    id: 'TRIP-09',
    name: 'Lebak Bulus -> Bundaran HI (MRT North-South Line)',
    originId: 'mrt:LBB',
    destId: 'mrt:BHI',
    expectedRoute: 'MRT North-South direct (13 stations, full line)',
    expectedDurationMin: '28-30 min',
    expectedTransfers: 0,
    expectedStandardFareIdr: 14000,
    expectedIntegratedFareIdr: 14000,
    notes: 'Published MRT Jakarta fare: Lebak Bulus to Bundaran HI is exactly Rp 14.000.'
  },
  {
    id: 'TRIP-10',
    name: 'Pegangsaan Dua -> Ragunan (No Sensible Direct Route)',
    originId: 'lrt:PGD',
    destId: 'tj:6-1',
    expectedRoute: 'No route / Empty route state ("Tidak ada rute")',
    expectedDurationMin: 'N/A',
    expectedTransfers: 0,
    expectedStandardFareIdr: 0,
    expectedIntegratedFareIdr: 0,
    notes: 'LRT Jakarta is isolated from Corridor 6 in raw RAPTOR. Returns 0 itineraries in raw RAPTOR.'
  },
  {
    id: 'TRIP-11',
    name: 'Stasiun Tebet -> Stasiun Tebet (Origin = Destination)',
    originId: 'krl:TEB',
    destId: 'krl:TEB',
    expectedRoute: '0 min / Already at destination',
    expectedDurationMin: '0 min',
    expectedTransfers: 0,
    expectedStandardFareIdr: 0,
    expectedIntegratedFareIdr: 0,
    notes: 'Origin and destination are identical.'
  },
  // --- REAL COMMUTE & UPGRADE SUITE (TRIP-12 to TRIP-16) ---
  {
    id: 'TRIP-12',
    name: 'Flavor Bliss -> Penjaringan (Real Owner Commute via Kota Bambu)',
    originId: 'tj:B08106P',
    destId: 'tj:G00075',
    expectedRoute: 'S61 to Kota Bambu + walk across + Corridor 9/7R to Penjaringan',
    expectedDurationMin: '35-50 min',
    maxTransfers: 2,
    maxFareIdr: 7000,
    notes: 'Proximity footpath links Kota Bambu South to North. Total fare Rp 7.000 (S61 Rp 3.500 + BRT Rp 3.500).'
  },
  {
    id: 'TRIP-13',
    name: 'Taman Anggrek -> Penjaringan (Alternative Owner Commute via 7R)',
    originId: 'tj:B05570P',
    destId: 'tj:G00075',
    expectedRoute: 'Walk to Tanjung Duren Arah Barat + Corridor 7R direct to Penjaringan',
    expectedDurationMin: '15-25 min',
    maxTransfers: 1,
    maxFareIdr: 3500,
    notes: 'Direct 7R from Tanjung Duren to Penjaringan with <= 1 transfer.'
  },
  {
    id: 'TRIP-14',
    name: 'Coordinate Alam Sutera -> Coordinate Penjaringan (Access/Egress Walking)',
    originCoord: { lat: -6.2360, lon: 106.6570, name: 'Rumah Alam Sutera' },
    destCoord: { lat: -6.1240, lon: 106.7910, name: 'Kantor Penjaringan' },
    expectedRoute: 'Walk to bus stop + Transjakarta routes + walk to destination',
    expectedDurationMin: '40-65 min',
    maxTransfers: 3,
    maxFareIdr: 10500,
    notes: 'Pure coordinate routing with access walk, transit legs, and egress walk.'
  },
  {
    id: 'TRIP-15',
    name: 'Tangerang BSD (Serpong BSD) -> Blok M (Greater Jakarta Feeder)',
    originId: 'tj:B04683P',
    destId: 'tj:1-1',
    expectedRoute: 'S11 from Serpong BSD connecting towards Blok M',
    expectedDurationMin: '70-100 min',
    maxTransfers: 2,
    maxFareIdr: 10500,
    notes: 'Suburban Tangerang connection into central transit spine.'
  },
  {
    id: 'TRIP-16',
    name: 'Sarinah -> MH Thamrin C6 (Central Footpath Transfer)',
    originId: 'tj:1-16',
    destId: 'tj:G00035',
    expectedRoute: 'Short footpath walk transfer between Corridor 1 and Corridor 6 (179m)',
    expectedDurationMin: '2-5 min',
    maxTransfers: 1,
    maxFareIdr: 0,
    notes: 'Proximity transfer connects different corridors without riding.'
  }
];

interface AuditResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  actualSummary: string;
  expectedSummary: string;
  defects: string[];
  severity: '🔴' | '🟡' | '🟢' | '✅';
}

console.log('='.repeat(90));
console.log('  TJ-NAVIGATOR HEADLESS ENGINE & LOGIC AUDIT');
console.log('  Testing RaptorRouter, JourneyPlanner, FareEngine, and Network Graph');
console.log('='.repeat(90));
console.log(`\nNetwork Statistics:`);
console.log(`- Total stops: ${network.stops.length}`);
console.log(`- Total routes: ${network.routes.length}`);
console.log(`- Total transfers: ${network.transfers.length}`);

// Data Health Pre-check
const usedStops = new Set<number>();
network.routes.forEach(r => r[4].forEach(s => usedStops.add(s)));
const orphanStopsCount = network.stops.length - usedStops.size;
console.log(`- Active stops: ${usedStops.size} (${((usedStops.size / network.stops.length) * 100).toFixed(1)}%)`);
console.log(`- Orphan stops (0 routes): ${orphanStopsCount} (${((orphanStopsCount / network.stops.length) * 100).toFixed(1)}%)`);

const auditResults: AuditResult[] = [];

for (const tc of TEST_TRIPS) {
  const departureSeconds = 8 * 3600; // 08:00 AM
  const defects: string[] = [];
  let severity: '🔴' | '🟡' | '🟢' | '✅' = '✅';
  let itineraries: Itinerary[] = [];

  // Coordinate-based trip (TRIP-14)
  if (tc.originCoord && tc.destCoord) {
    const ladderRes = planner.plan(tc.originCoord, tc.destCoord, departureSeconds);
    itineraries = ladderRes.itineraries;
    if (itineraries.length === 0) {
      defects.push('JourneyPlanner returned 0 itineraries for coordinates');
      severity = '🔴';
    } else {
      const best = itineraries[0];
      if (tc.maxTransfers !== undefined && best.transfersCount > tc.maxTransfers) {
        defects.push(`Transfers: ${best.transfersCount} (expected <= ${tc.maxTransfers})`);
        severity = '🔴';
      }
      if (tc.maxFareIdr !== undefined && best.standardFareIdr > tc.maxFareIdr) {
        defects.push(`Fare: Rp ${best.standardFareIdr} (expected <= Rp ${tc.maxFareIdr})`);
        severity = '🔴';
      }
      const hasWalkOrigin = best.legs[0]?.type === 'WALK';
      const hasWalkDest = best.legs[best.legs.length - 1]?.type === 'WALK';
      if (!hasWalkOrigin || !hasWalkDest) {
        defects.push('Missing access/egress walk legs in coordinate itinerary');
        severity = '🔴';
      }
    }

    const status = defects.length === 0 ? 'PASS' : 'FAIL';
    const actualSummary = itineraries.length > 0
      ? `${itineraries[0].totalDurationMinutes}m | ${itineraries[0].transfersCount} xfers | Fare: Rp ${itineraries[0].standardFareIdr} | Legs: ${itineraries[0].legs.map(l => `${l.type}(${l.fromStopName}->${l.toStopName})`).join(' + ')}`
      : '0 itineraries returned';

    auditResults.push({
      id: tc.id,
      name: tc.name,
      status,
      actualSummary,
      expectedSummary: tc.expectedRoute,
      defects,
      severity
    });
    continue;
  }

  // Stop-based trips
  const origIdx = findStopIndexById(tc.originId!);
  const destIdx = findStopIndexById(tc.destId!);

  if (origIdx === -1 || destIdx === -1) {
    auditResults.push({
      id: tc.id,
      name: tc.name,
      status: 'FAIL',
      actualSummary: `Stop ID missing from graph: ${origIdx === -1 ? tc.originId : ''} ${destIdx === -1 ? tc.destId : ''}`,
      expectedSummary: tc.expectedRoute,
      defects: ['Stop ID not found in network stops array'],
      severity: '🔴'
    });
    continue;
  }

  itineraries = router.planJourney(origIdx, destIdx, departureSeconds);

  if (tc.id === 'TRIP-10' || tc.id === 'TRIP-11') {
    if (itineraries.length > 0) {
      defects.push(`Expected 0 itineraries in raw RAPTOR, but got ${itineraries.length}`);
      severity = '🔴';
    }
    auditResults.push({
      id: tc.id,
      name: tc.name,
      status: defects.length === 0 ? 'PASS' : 'FAIL',
      actualSummary: itineraries.length === 0 ? '0 itineraries found (RAPTOR raw)' : `${itineraries.length} itineraries found`,
      expectedSummary: tc.expectedRoute,
      defects,
      severity
    });
    continue;
  }

  if (itineraries.length === 0) {
    defects.push('RAPTOR returned 0 itineraries (No route found)');
    severity = '🔴';
    auditResults.push({
      id: tc.id,
      name: tc.name,
      status: 'FAIL',
      actualSummary: '0 itineraries returned by RAPTOR',
      expectedSummary: tc.expectedRoute,
      defects,
      severity
    });
    continue;
  }

  const best = itineraries[0];
  const fareResult = calculateItineraryFare(best.legs);

  // Check 1: Route integrity / missing origin
  const firstLeg = best.legs[0];
  if (firstLeg && firstLeg.fromStopName !== network.stops[origIdx][1]) {
    defects.push(`Backtrack corrupted: journey starts at "${firstLeg.fromStopName}" instead of origin "${network.stops[origIdx][1]}".`);
    severity = '🔴';
  }

  // Check 2: Transit leg hardcoded values
  for (const leg of best.legs) {
    if (leg.type === 'TRANSIT') {
      if (leg.durationSeconds === 600 && leg.distanceMeters === 4500 && leg.intermediateStopCount === 4) {
        defects.push(`Transit leg has hardcoded metrics: duration=600s, distance=4500m, stops=4.`);
        if (severity !== '🔴') severity = '🟡';
      }
    }
  }

  // Check 3: Transfers constraint for new trips (TRIP-12..16)
  if (tc.maxTransfers !== undefined && best.transfersCount > tc.maxTransfers) {
    defects.push(`Transfers: ${best.transfersCount} (expected <= ${tc.maxTransfers})`);
    severity = '🔴';
  }

  // Check 4: Fare calculation
  if (tc.expectedStandardFareIdr !== undefined && best.standardFareIdr !== tc.expectedStandardFareIdr) {
    defects.push(`Standard Fare: Rp ${best.standardFareIdr} (expected Rp ${tc.expectedStandardFareIdr})`);
    severity = '🔴';
  } else if (tc.maxFareIdr !== undefined && best.standardFareIdr > tc.maxFareIdr) {
    defects.push(`Standard Fare: Rp ${best.standardFareIdr} (expected <= Rp ${tc.maxFareIdr})`);
    severity = '🔴';
  }

  const status = defects.length === 0 ? 'PASS' : 'FAIL';
  const actualSummary = `${best.totalDurationMinutes}m | ${best.transfersCount} xfers | Fare: Rp ${best.standardFareIdr} | Legs: ${best.legs.map(l => `${l.type}(${l.fromStopName}->${l.toStopName})`).join(' + ')}`;

  auditResults.push({
    id: tc.id,
    name: tc.name,
    status,
    actualSummary,
    expectedSummary: tc.expectedRoute,
    defects,
    severity
  });
}

console.log('\n' + '='.repeat(90));
console.log('TRIP AUDIT RESULTS TABLE (TRIP-01 to TRIP-16)');
console.log('='.repeat(90));

let passCount = 0;
for (const res of auditResults) {
  const isPass = res.status === 'PASS';
  if (isPass) passCount++;
  console.log(`\n[${res.id}] ${res.name} -> ${isPass ? '✅ PASS' : '❌ FAIL'} (${res.severity})`);
  console.log(`  Expected: ${res.expectedSummary}`);
  console.log(`  Actual:   ${res.actualSummary}`);
  if (res.defects.length > 0) {
    console.log(`  Defects:`);
    res.defects.forEach(d => console.log(`    - ${d}`));
  }
}

console.log(`\nTrip Audit Summary: ${passCount} / ${auditResults.length} Passed (${((passCount / auditResults.length) * 100).toFixed(1)}%)`);

// =========================================================================
// GRACEFUL-DEGRADATION LADDER AUDIT
// =========================================================================
console.log('\n' + '='.repeat(90));
console.log('GRACEFUL-DEGRADATION LADDER AUDIT');
console.log('Testing each step of the ladder: same-place, walk-only, direct, relaxed, closest-approach');
console.log('='.repeat(90));

const ladderCases = [
  {
    step: 'Level 5: Same Place',
    expectedKind: 'same-place' as AnswerKind,
    run: () => {
      const idx = findStopIndexById('krl:TEB');
      return planner.plan(
        { stopIndex: idx, lat: network.stops[idx][2], lon: network.stops[idx][3], name: 'Tebet' },
        { stopIndex: idx, lat: network.stops[idx][2], lon: network.stops[idx][3], name: 'Tebet' }
      );
    }
  },
  {
    step: 'Level 4: Walk Only (< 1.5 km)',
    expectedKind: 'walk-only' as AnswerKind,
    run: () => {
      // 770 meters apart in suburban area without immediate transit
      return planner.plan(
        { lat: -6.2500, lon: 106.6000, name: 'Kompleks Ruko Serpong' },
        { lat: -6.2550, lon: 106.6050, name: 'Perumahan Gading' }
      );
    }
  },
  {
    step: 'Level 1: Direct Transit',
    expectedKind: 'direct' as AnswerKind,
    run: () => {
      const orig = findStopIndexById('tj:1-1');
      const dest = findStopIndexById('tj:1-22');
      return planner.plan(
        { stopIndex: orig, lat: network.stops[orig][2], lon: network.stops[orig][3], name: 'Blok M' },
        { stopIndex: dest, lat: network.stops[dest][2], lon: network.stops[dest][3], name: 'Kota' }
      );
    }
  },
  {
    step: 'Level 2: Auto-Relaxed Search',
    expectedKind: 'relaxed' as AnswerKind,
    run: () => {
      const dest = findStopIndexById('tj:1-22');
      return planner.plan(
        { lat: -6.2500, lon: 106.6000, name: 'Gading Serpong Barat' }, // ~2.04 km to nearest stop
        { stopIndex: dest, lat: network.stops[dest][2], lon: network.stops[dest][3], name: 'Kota' }
      );
    }
  },
  {
    step: 'Level 3: Closest Approach (Disconnected Components)',
    expectedKind: 'closest-approach' as AnswerKind,
    run: () => {
      const pgd = findStopIndexById('lrt:PGD');
      const rag = findStopIndexById('tj:6-1');
      return planner.plan(
        { stopIndex: pgd, lat: network.stops[pgd][2], lon: network.stops[pgd][3], name: 'Pegangsaan Dua' },
        { stopIndex: rag, lat: network.stops[rag][2], lon: network.stops[rag][3], name: 'Ragunan' }
      );
    }
  }
];

let ladderPass = 0;
for (const lc of ladderCases) {
  const res = lc.run();
  const pass = res.answerKind === lc.expectedKind;
  if (pass) ladderPass++;
  console.log(`[LADDER] ${lc.step} -> ${pass ? '✅ PASS' : '❌ FAIL'} (answerKind: '${res.answerKind}', level: ${res.ladderLevel}, itins: ${res.itineraries.length})`);
  if (res.answerKind === 'closest-approach' && res.itineraries[0]) {
    const it = res.itineraries[0];
    console.log(`  Uncovered: ${it.uncoveredDistanceMeters}m (${it.uncoveredDurationMinutes} min walk)`);
    console.log(`  Google Maps Deep Link: ${it.googleMapsUrl}`);
  }
}
console.log(`Ladder Audit Summary: ${ladderPass} / ${ladderCases.length} Passed`);

// =========================================================================
// 300-PAIR RANDOM SANITY SWEEP (mulberry32 seeded with 42)
// =========================================================================
console.log('\n' + '='.repeat(90));
console.log('300-PAIR SANITY SWEEP (mulberry32 seeded with 42)');
console.log('Testing full graph reachability and graceful degradation');
console.log('='.repeat(90));

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);
const activeStopIndices: number[] = [];
for (let i = 0; i < network.stops.length; i++) {
  if (usedStops.has(i)) activeStopIndices.push(i);
}

const SWEEP_COUNT = 300;
let sweepEmptyCount = 0;
const countsByKind: Record<string, number> = {
  direct: 0,
  relaxed: 0,
  'closest-approach': 0,
  'walk-only': 0,
  'same-place': 0
};
const transfersDist = { 0: 0, 1: 0, 2: 0, '3+': 0 };
let totalDuration = 0;
let routedCount = 0;

const sweepStartTime = Date.now();

for (let i = 0; i < SWEEP_COUNT; i++) {
  const origIdx = activeStopIndices[Math.floor(rng() * activeStopIndices.length)];
  const destIdx = activeStopIndices[Math.floor(rng() * activeStopIndices.length)];

  const origStop = network.stops[origIdx];
  const destStop = network.stops[destIdx];

  const res = planner.plan(
    { stopIndex: origIdx, lat: origStop[2], lon: origStop[3], name: origStop[1] },
    { stopIndex: destIdx, lat: destStop[2], lon: destStop[3], name: destStop[1] }
  );

  countsByKind[res.answerKind] = (countsByKind[res.answerKind] || 0) + 1;

  if (res.answerKind === 'same-place') {
    // Already at destination
  } else if (res.itineraries.length === 0) {
    sweepEmptyCount++;
  } else {
    routedCount++;
    const best = res.itineraries[0];
    totalDuration += best.totalDurationMinutes;
    const xfers = best.transfersCount;
    if (xfers === 0) transfersDist[0]++;
    else if (xfers === 1) transfersDist[1]++;
    else if (xfers === 2) transfersDist[2]++;
    else transfersDist['3+']++;
  }
}

const sweepElapsedMs = Date.now() - sweepStartTime;
console.log(`- Total pairs tested: ${SWEEP_COUNT}`);
console.log(`- Sweep execution time: ${sweepElapsedMs} ms (${(sweepElapsedMs / SWEEP_COUNT).toFixed(1)} ms/pair)`);
console.log(`- Empty answers ("No route"): ${sweepEmptyCount} (${((sweepEmptyCount / SWEEP_COUNT) * 100).toFixed(1)}%) -> ${sweepEmptyCount === 0 ? '✅ 0% EMPTY REQUIREMENT MET' : '❌ FAILED'}`);
console.log(`- Direct answers: ${countsByKind.direct} (${((countsByKind.direct / SWEEP_COUNT) * 100).toFixed(1)}%)`);
console.log(`- Degraded answers: ${SWEEP_COUNT - countsByKind.direct} (${(((SWEEP_COUNT - countsByKind.direct) / SWEEP_COUNT) * 100).toFixed(1)}%)`);
console.log(`    * Relaxed search:     ${countsByKind.relaxed} (${((countsByKind.relaxed / SWEEP_COUNT) * 100).toFixed(1)}%)`);
console.log(`    * Closest approach:   ${countsByKind['closest-approach']} (${((countsByKind['closest-approach'] / SWEEP_COUNT) * 100).toFixed(1)}%)`);
console.log(`    * Walk-only:          ${countsByKind['walk-only']} (${((countsByKind['walk-only'] / SWEEP_COUNT) * 100).toFixed(1)}%)`);
console.log(`    * Same place:         ${countsByKind['same-place']} (${((countsByKind['same-place'] / SWEEP_COUNT) * 100).toFixed(1)}%)`);
if (routedCount > 0) {
  console.log(`- Average journey duration: ${(totalDuration / routedCount).toFixed(1)} min`);
  console.log(`- Transfers distribution: 0 transfers: ${transfersDist[0]}, 1 transfer: ${transfersDist[1]}, 2 transfers: ${transfersDist[2]}, 3+ transfers: ${transfersDist['3+']}`);
}
console.log('='.repeat(90));
