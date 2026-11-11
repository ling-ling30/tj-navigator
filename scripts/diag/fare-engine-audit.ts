import fs from 'node:fs';
import path from 'node:path';
import { RaptorRouter } from '../../src/lib/router/raptor';
import { JourneyPlanner } from '../../src/lib/router/journey-planner';
import { calculateItineraryFare } from '../../src/lib/fare/fare-engine';
import { TransitMode, type CompiledTransitNetwork, type Leg } from '../../src/types/transit';

const DATA_PATH = path.resolve('public/data/jakarta-transit-network.json');
const network: CompiledTransitNetwork = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
const router = new RaptorRouter(network);
const planner = new JourneyPlanner(router);

function findStopIdx(id: string): number {
  return network.stops.findIndex(s => s[0] === id);
}

interface TestItineraryCase {
  id: string;
  name: string;
  type: 'plan' | 'direct-stops' | 'manual-legs';
  originId?: string;
  destId?: string;
  legs?: Leg[];
  expectedStandardFare: number;
  expectedIntegratedFare: number;
  notes: string;
}

const testCases: TestItineraryCase[] = [
  {
    id: 'CASE-01',
    name: 'Flavor Bliss to Penjaringan (Two TJ bus legs with walk transfer)',
    type: 'direct-stops',
    originId: 'tj:B08106P', // Flavor Bliss
    destId: 'tj:G00074',   // Penjaringan
    expectedStandardFare: 7000, // S61 non-BRT (Rp 3.500) + tap-in at BRT Halte Kota Bambu to Corridor 9 (Rp 3.500) = Rp 7.000
    expectedIntegratedFare: 7000, // Same operator TJ, not multi-modal integrated
    notes: 'Non-BRT S61 alights on street, walk to BRT halte, tap-in again'
  },
  {
    id: 'CASE-02',
    name: 'CSW 1 to Velbak (BRT Corridor 1 -> Corridor 13 inside CSW interchange)',
    type: 'direct-stops',
    originId: 'tj:1-4', // CSW 1
    destId: 'tj:13-2', // Velbak
    expectedStandardFare: 3500, // In-halte transfer is free (paid-area)
    expectedIntegratedFare: 3500,
    notes: 'Paid area transfer between Corridors 1 and 13 at CSW'
  },
  {
    id: 'CASE-03',
    name: 'Blok M to Pulo Gadung via Semanggi & Senen (Three BRT bus legs inside paid area)',
    type: 'manual-legs',
    legs: [
      {
        type: 'TRANSIT',
        mode: TransitMode.BRT,
        routeId: 'tj:corridor-1',
        routeShortName: '1',
        fromStopId: 'tj:1-1',
        fromStopName: 'Blok M',
        toStopId: 'tj:1-8',
        toStopName: 'Bendungan Hilir',
        departureTime: '08:00',
        arrivalTime: '08:20',
        durationSeconds: 1200,
        distanceMeters: 6000,
        isPaidAreaTransfer: false
      },
      {
        type: 'WALK',
        fromStopId: 'tj:1-8',
        fromStopName: 'Bendungan Hilir',
        toStopId: 'tj:9-14',
        toStopName: 'Semanggi',
        departureTime: '08:20',
        arrivalTime: '08:25',
        durationSeconds: 300,
        distanceMeters: 250,
        isPaidAreaTransfer: true
      },
      {
        type: 'TRANSIT',
        mode: TransitMode.BRT,
        routeId: 'tj:corridor-9',
        routeShortName: '9',
        fromStopId: 'tj:9-14',
        fromStopName: 'Semanggi',
        toStopId: 'tj:9-9',
        toStopName: 'Cawang',
        departureTime: '08:26',
        arrivalTime: '08:45',
        durationSeconds: 1140,
        distanceMeters: 5500,
        isPaidAreaTransfer: true
      },
      {
        type: 'WALK',
        fromStopId: 'tj:9-9',
        fromStopName: 'Cawang',
        toStopId: 'tj:7-5',
        toStopName: 'Cawang BNN',
        departureTime: '08:45',
        arrivalTime: '08:48',
        durationSeconds: 180,
        distanceMeters: 100,
        isPaidAreaTransfer: true
      },
      {
        type: 'TRANSIT',
        mode: TransitMode.BRT,
        routeId: 'tj:corridor-7',
        routeShortName: '7',
        fromStopId: 'tj:7-5',
        fromStopName: 'Cawang BNN',
        toStopId: 'tj:7-1',
        toStopName: 'Kampung Rambutan',
        departureTime: '08:50',
        arrivalTime: '09:15',
        durationSeconds: 1500,
        distanceMeters: 8000,
        isPaidAreaTransfer: true
      }
    ],
    expectedStandardFare: 3500, // Contiguous paid area BRT transfers are all free Rp 0
    expectedIntegratedFare: 3500,
    notes: '3 consecutive BRT legs connected by paid-area transfers'
  },
  {
    id: 'CASE-04',
    name: 'Three consecutive TJ legs with outdoor street walk (e.g. Non-BRT -> Non-BRT -> BRT)',
    type: 'manual-legs',
    legs: [
      {
        type: 'TRANSIT',
        mode: TransitMode.NON_BRT,
        routeId: 'tj:1A',
        routeShortName: '1A',
        fromStopId: 'tj:s1',
        fromStopName: 'Stop A',
        toStopId: 'tj:s2',
        toStopName: 'Stop B',
        departureTime: '08:00',
        arrivalTime: '08:15',
        durationSeconds: 900,
        distanceMeters: 4000,
        isPaidAreaTransfer: false
      },
      {
        type: 'WALK',
        fromStopId: 'tj:s2',
        fromStopName: 'Stop B',
        toStopId: 'tj:s3',
        toStopName: 'Stop C',
        departureTime: '08:15',
        arrivalTime: '08:20',
        durationSeconds: 300,
        distanceMeters: 200,
        isPaidAreaTransfer: false
      },
      {
        type: 'TRANSIT',
        mode: TransitMode.NON_BRT,
        routeId: 'tj:1B',
        routeShortName: '1B',
        fromStopId: 'tj:s3',
        fromStopName: 'Stop C',
        toStopId: 'tj:s4',
        toStopName: 'Stop D',
        departureTime: '08:25',
        arrivalTime: '08:40',
        durationSeconds: 900,
        distanceMeters: 4000,
        isPaidAreaTransfer: false
      },
      {
        type: 'WALK',
        fromStopId: 'tj:s4',
        fromStopName: 'Stop D',
        toStopId: 'tj:1-1',
        toStopName: 'Blok M Halte',
        departureTime: '08:40',
        arrivalTime: '08:45',
        durationSeconds: 300,
        distanceMeters: 250,
        isPaidAreaTransfer: false
      },
      {
        type: 'TRANSIT',
        mode: TransitMode.BRT,
        routeId: 'tj:corridor-1',
        routeShortName: '1',
        fromStopId: 'tj:1-1',
        fromStopName: 'Blok M Halte',
        toStopId: 'tj:1-10',
        toStopName: 'Bundaran HI',
        departureTime: '08:50',
        arrivalTime: '09:10',
        durationSeconds: 1200,
        distanceMeters: 5000,
        isPaidAreaTransfer: false
      }
    ],
    expectedStandardFare: 10500, // 3 separate boardings: 3500 + 3500 + 3500 = 10500
    expectedIntegratedFare: 10500, // Same operator TJ, not multi-modal
    notes: 'Three outdoor TJ bus boardings, each requiring separate tap-in'
  },
  {
    id: 'CASE-05',
    name: 'Tebet to Bundaran HI (KRL + MRT via Sudirman / Dukuh Atas)',
    type: 'direct-stops',
    originId: 'krl:TEB',
    destId: 'mrt:BHI',
    expectedStandardFare: 7000, // KRL Tebet-Sudirman (Rp 3.000) + MRT Dukuh Atas BNI-Bundaran HI (Rp 4.000)
    expectedIntegratedFare: 7000, // KRL is not in JakLingko; only 1 JakLingko mode (MRT) so standard applies
    notes: 'Multi-operator KRL + MRT'
  },
  {
    id: 'CASE-06',
    name: 'MRT Lebak Bulus to Kota via Corridor 1 (MRT + BRT)',
    type: 'manual-legs',
    legs: [
      {
        type: 'TRANSIT',
        mode: TransitMode.MRT,
        routeId: 'mrt:north-south',
        routeShortName: 'M',
        fromStopId: 'mrt:LBB',
        fromStopName: 'Lebak Bulus',
        toStopId: 'mrt:BLM',
        toStopName: 'Blok M BCA',
        departureTime: '08:00',
        arrivalTime: '08:14',
        durationSeconds: 840,
        distanceMeters: 8000,
        intermediateStopCount: 4,
        isPaidAreaTransfer: false
      },
      {
        type: 'WALK',
        fromStopId: 'mrt:BLM',
        fromStopName: 'Blok M BCA',
        toStopId: 'tj:1-1',
        toStopName: 'Blok M Halte',
        departureTime: '08:14',
        arrivalTime: '08:18',
        durationSeconds: 240,
        distanceMeters: 150,
        isPaidAreaTransfer: false
      },
      {
        type: 'TRANSIT',
        mode: TransitMode.BRT,
        routeId: 'tj:corridor-1',
        routeShortName: '1',
        fromStopId: 'tj:1-1',
        fromStopName: 'Blok M Halte',
        toStopId: 'tj:1-22',
        toStopName: 'Kota',
        departureTime: '08:20',
        arrivalTime: '09:05',
        durationSeconds: 2700,
        distanceMeters: 14000,
        intermediateStopCount: 15,
        isPaidAreaTransfer: false
      }
    ],
    expectedStandardFare: 11500, // MRT LBB-BLM (Rp 8.000) + BRT Corridor 1 (Rp 3.500) = Rp 11.500
    expectedIntegratedFare: 8000, // Base 2500 + 22km * 250 = 2500 + 5500 = 8000 (capped at 10000)
    notes: 'Multi-modal MRT + BRT eligible for JakLingko integrated tariff'
  },
  {
    id: 'CASE-07',
    name: 'Mikrotrans JAK.01 + BRT Corridor 1',
    type: 'manual-legs',
    legs: [
      {
        type: 'TRANSIT',
        mode: TransitMode.MIKROTRANS,
        routeId: 'tj:JAK.01',
        routeShortName: 'JAK.01',
        fromStopId: 'tj:j1',
        fromStopName: 'Tanjung Duren',
        toStopId: 'tj:j2',
        toStopName: 'Grogol',
        departureTime: '08:00',
        arrivalTime: '08:15',
        durationSeconds: 900,
        distanceMeters: 3000,
        isPaidAreaTransfer: false
      },
      {
        type: 'WALK',
        fromStopId: 'tj:j2',
        fromStopName: 'Grogol',
        toStopId: 'tj:1-1',
        toStopName: 'Grogol 1',
        departureTime: '08:15',
        arrivalTime: '08:18',
        durationSeconds: 180,
        distanceMeters: 100,
        isPaidAreaTransfer: false
      },
      {
        type: 'TRANSIT',
        mode: TransitMode.BRT,
        routeId: 'tj:corridor-1',
        routeShortName: '1',
        fromStopId: 'tj:1-1',
        fromStopName: 'Grogol 1',
        toStopId: 'tj:1-22',
        toStopName: 'Kota',
        departureTime: '08:20',
        arrivalTime: '08:45',
        durationSeconds: 1500,
        distanceMeters: 6000,
        intermediateStopCount: 7,
        isPaidAreaTransfer: false
      }
    ],
    expectedStandardFare: 3500, // Mikrotrans Rp 0 + BRT Rp 3.500 = Rp 3.500
    expectedIntegratedFare: 3500,
    notes: 'Mikrotrans (Rp 0) + BRT (Rp 3.500)'
  },
  {
    id: 'CASE-08',
    name: 'Bogor to Jakarta Kota (Long Distance KRL ~54 km)',
    type: 'direct-stops',
    originId: 'krl:BOG',
    destId: 'krl:JAK',
    expectedStandardFare: 6000, // KRL: 25 km = 3000; next 29.8km = 3x1000 = 3000; Total = Rp 6.000
    expectedIntegratedFare: 6000,
    notes: 'KRL 54 km trip (first 25km Rp 3000 + 3 tiers of 10km @ Rp 1000 = Rp 6000)'
  },
  {
    id: 'CASE-09',
    name: 'Royaltrans S14 (Summarecon Serpong to Lebak Bulus)',
    type: 'direct-stops',
    originId: 'tj:B07339P', // Scientia Square Park
    destId: 'tj:B05492P',   // St. MRT Lebak Bulus
    expectedStandardFare: 35000, // Official Royaltrans S14 fare is Rp 35.000
    expectedIntegratedFare: 35000,
    notes: 'Premium Royaltrans route S14'
  },
  {
    id: 'CASE-10',
    name: 'LRT Jabodebek (Dukuh Atas to Harjamukti ~26 km)',
    type: 'direct-stops',
    originId: 'lrt:DUK', // Dukuh Atas
    destId: 'lrt:HJM', // Harjamukti
    expectedStandardFare: 20000, // Peak hour max Rp 20.000 (Base 5000 + 25*700 = 22500 -> capped at 20000 peak / 10000 off-peak)
    expectedIntegratedFare: 20000, // LRT Jabodebek is not part of JakLingko integrated tariff
    notes: 'LRT Jabodebek Kemenhub KM 67/2023 distance tariff'
  },
  {
    id: 'CASE-11',
    name: 'Pure MRT Full North-South Line (Lebak Bulus to Bundaran HI)',
    type: 'direct-stops',
    originId: 'mrt:LBB',
    destId: 'mrt:BHI',
    expectedStandardFare: 14000, // Official MRT Jakarta maximum fare
    expectedIntegratedFare: 14000,
    notes: 'Full MRT North-South line 13 stations'
  },
  {
    id: 'CASE-12',
    name: 'LRT Jakarta (Pegangsaan Dua to Velodrome)',
    type: 'direct-stops',
    originId: 'lrt:PGD',
    destId: 'lrt:VEL',
    expectedStandardFare: 5000, // Pergub 34/2019 flat Rp 5.000
    expectedIntegratedFare: 5000,
    notes: 'LRT Jakarta flat fare'
  }
];

console.log('='.repeat(80));
console.log('FARES AUDIT: 12 TEST CASES');
console.log('='.repeat(80));

for (const tc of testCases) {
  let legs: Leg[] = [];

  if (tc.type === 'manual-legs' && tc.legs) {
    legs = tc.legs;
  } else if (tc.originId && tc.destId) {
    const origIdx = findStopIdx(tc.originId);
    const destIdx = findStopIdx(tc.destId);
    if (origIdx === -1 || destIdx === -1) {
      console.log(`\n❌ [${tc.id}] ${tc.name}: Stop not found (orig: ${origIdx}, dest: ${destIdx})`);
      continue;
    }
    const itins = router.planJourney(origIdx, destIdx, 8 * 3600);
    if (itins.length === 0) {
      console.log(`\n❌ [${tc.id}] ${tc.name}: No itinerary found by router`);
      continue;
    }
    legs = itins[0].legs;
  }

  const result = calculateItineraryFare(legs);

  console.log(`\n--- [${tc.id}] ${tc.name} ---`);
  console.log(`Legs: ${legs.map(l => `${l.type}(${l.fromStopName} -> ${l.toStopName}, mode=${(l as any).mode}, paidArea=${l.isPaidAreaTransfer})`).join(' + ')}`);
  console.log(`Computed Standard: Rp ${result.standardFareIdr} | Expected: Rp ${tc.expectedStandardFare}`);
  console.log(`Computed Integrated: Rp ${result.integratedFareIdr} | Expected: Rp ${tc.expectedIntegratedFare}`);
  console.log(`JakLingko Eligible: ${result.isJakLingkoEligible} | Savings: Rp ${result.savingsIdr}`);
  console.log(`Status Standard: ${result.standardFareIdr === tc.expectedStandardFare ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Status Integrated: ${result.integratedFareIdr === tc.expectedIntegratedFare ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Notes: ${tc.notes}`);
}
