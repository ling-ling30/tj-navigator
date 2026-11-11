import fs from 'fs';

const lines = fs.readFileSync('scripts/diag/gtfs/routes.txt', 'utf-8').split('\n').filter(Boolean);
const header = lines[0].replace('\r', '').split(',');
const idIdx = header.indexOf('route_id');
const shortIdx = header.indexOf('route_short_name');
const descIdx = header.indexOf('route_desc');

const routeMap = new Map();
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].replace('\r', '').split(',');
  const id = parts[idIdx];
  const shortName = parts[shortIdx];
  const desc = parts[descIdx];
  if (id) routeMap.set(id, desc);
  if (shortName) routeMap.set(shortName, desc);
}

console.log(`Loaded ${routeMap.size} route mappings from routes.txt`);
console.log('Sample mappings:');
console.log('1 ->', routeMap.get('1'));
console.log('JAK.12 ->', routeMap.get('JAK.12'));
console.log('1B ->', routeMap.get('1B'));
console.log('4D ->', routeMap.get('4D'));
console.log('S11 ->', routeMap.get('S11'));
console.log('1K ->', routeMap.get('1K'));
console.log('10A ->', routeMap.get('10A'));
