import fs from 'node:fs';
import path from 'node:path';
import { RaptorRouter } from '../../src/lib/router/raptor';
import { calculateItineraryFare } from '../../src/lib/fare/fare-engine';
import type { CompiledTransitNetwork } from '../../src/types/transit';

const DATA_PATH = path.resolve('public/data/jakarta-transit-network.json');
const network: CompiledTransitNetwork = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
const router = new RaptorRouter(network);

function testRoute(name: string, fromId: string, toId: string) {
  const fIdx = network.stops.findIndex(s => s[0] === fromId);
  const tIdx = network.stops.findIndex(s => s[0] === toId);
  if (fIdx === -1 || tIdx === -1) {
    console.log(`Stop not found for ${name}`);
    return;
  }
  const itins = router.planJourney(fIdx, tIdx, 8 * 3600);
  console.log(`\n========================================`);
  console.log(`TRIP: ${name} (${fromId} -> ${toId})`);
  console.log(`Itineraries found: ${itins.length}`);
  itins.forEach((itin, i) => {
    console.log(`\n  Option ${i + 1}: Duration ${itin.totalDurationMinutes}m, Transfers: ${itin.transfersCount}`);
    console.log(`  Standard Fare: Rp ${itin.standardFareIdr}, Integrated Fare: Rp ${itin.integratedFareIdr}`);
    itin.legs.forEach((leg, j) => {
      console.log(`    Leg ${j + 1}: ${leg.type} [${(leg as any).mode || 'WALK'}] ${(leg as any).routeShortName || ''} (${leg.fromStopName} -> ${leg.toStopName}) | paidArea=${leg.isPaidAreaTransfer}`);
    });
    const fareRes = calculateItineraryFare(itin.legs);
    console.log(`    Recalculated fare: standard=${fareRes.standardFareIdr}, integrated=${fareRes.integratedFareIdr}`);
  });
}

// Test 1: Blok M to Pluit (transfer corridor 1 to corridor 9 at Bendungan Hilir)
testRoute('Blok M to Pluit (BRT transfer at Benhil)', 'tj:1-1', 'tj:9-25');

// Test 2: Ragunan to Harmoni (corridor 6 to corridor 1)
testRoute('Ragunan to Juanda', 'tj:6-1', 'tj:1-17');

// Test 3: Pulogebang to Kota (corridor 11 to corridor 1)
testRoute('Pulogebang to Kota', 'tj:11-1', 'tj:1-22');

// Test 4: Flavor Bliss to Penjaringan
testRoute('Flavor Bliss to Penjaringan', 'tj:B08106P', 'tj:G00074');
