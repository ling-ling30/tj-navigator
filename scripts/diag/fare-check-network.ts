import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH = path.resolve('public/data/jakarta-transit-network.json');
const network = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

console.log('Total stops:', network.stops.length);
console.log('Total routes:', network.routes.length);

// Check modes present in stops
const stopModes = new Set(network.stops.map((s: any) => s[4]));
console.log('Stop modes:', Array.from(stopModes));

// Check if Royaltrans or premium routes exist
const premiumRoutes = network.routes.filter((r: any) => {
  const short = r[1];
  const id = r[0];
  return ['1K', '1T', '6P', 'B13', 'B14', 'D31', 'D32', 'S12', 'S14', 'S31', 'SH2'].some(p => short === p || id.includes(p));
});
console.log('Premium routes in graph:', premiumRoutes.map((r: any) => ({ id: r[0], short: r[1], long: r[2] })));

// Check LRT Jabodebek
const lrtJabodebek = network.routes.filter((r: any) => {
  const id = r[0].toLowerCase();
  const name = (r[2] || '').toLowerCase();
  return id.includes('jabodebek') || name.includes('harjamukti') || name.includes('jati mulya');
});
console.log('LRT Jabodebek routes in graph:', lrtJabodebek.map((r: any) => ({ id: r[0], short: r[1], long: r[2] })));

// Check Mikrotrans routes
const mikroRoutes = network.routes.filter((r: any) => {
  const short = (r[1] || '').toUpperCase();
  const id = (r[0] || '').toLowerCase();
  return short.startsWith('JAK') || id.includes('jak');
});
console.log('Mikrotrans routes in graph count:', mikroRoutes.length);

// Find Flavor bliss and Penjaringan
console.log('Flavor bliss stops:');
network.stops.forEach((s: any, idx: number) => {
  if (s[0].includes('B08106P') || s[1].toLowerCase().includes('flavor bliss')) {
    console.log(`idx: ${idx}, id: ${s[0]}, name: ${s[1]}, mode: ${s[4]}`);
  }
});
console.log('Penjaringan stops:');
network.stops.forEach((s: any, idx: number) => {
  if (s[0].includes('G00074') || s[1].toLowerCase().includes('penjaringan')) {
    console.log(`idx: ${idx}, id: ${s[0]}, name: ${s[1]}, mode: ${s[4]}`);
  }
});
