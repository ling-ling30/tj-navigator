import fs from 'node:fs';
import path from 'node:path';

const gtfsDir = path.resolve('scripts/diag/gtfs');

function parseCsv(filename) {
  const content = fs.readFileSync(path.join(gtfsDir, filename), 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  const header = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    // Basic CSV parser handling potential quotes or plain commas
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    values.push(current.trim());
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    return obj;
  });
}

const fareAttributes = parseCsv('fare_attributes.txt');
const fareRules = parseCsv('fare_rules.txt');
const routes = parseCsv('routes.txt');

const routeMap = new Map();
routes.forEach(r => {
  routeMap.set(r.route_id, r);
});

console.log('=== FARE ATTRIBUTES ===');
console.table(fareAttributes);

const fareToRoutes = {};
fareAttributes.forEach(fa => {
  fareToRoutes[fa.fare_id] = {
    attribute: fa,
    routes: []
  };
});

fareRules.forEach(rule => {
  if (fareToRoutes[rule.fare_id]) {
    const route = routeMap.get(rule.route_id);
    fareToRoutes[rule.fare_id].routes.push(route ? { id: route.route_id, short: route.route_short_name, long: route.route_long_name, type: route.route_type } : { id: rule.route_id });
  } else {
    console.warn(`Unknown fare_id in rules: ${rule.fare_id}`);
  }
});

for (const [fareId, data] of Object.entries(fareToRoutes)) {
  const shortNames = data.routes.map(r => r.short).filter(Boolean).sort();
  console.log(`\n========================================`);
  console.log(`Fare ID: ${fareId} | Price: Rp ${data.attribute.price} | transfers: "${data.attribute.transfers}" | duration: ${data.attribute.transfer_duration}s`);
  console.log(`Total routes: ${data.routes.length}`);
  console.log(`Routes: ${shortNames.join(', ')}`);
}

// Check if any routes in routes.txt don't have a fare rule
const mappedRouteIds = new Set(fareRules.map(r => r.route_id));
const unmappedRoutes = routes.filter(r => !mappedRouteIds.has(r.route_id));
console.log(`\n========================================`);
console.log(`Unmapped routes in routes.txt: ${unmappedRoutes.length}`);
if (unmappedRoutes.length > 0) {
  console.log(`Unmapped: ${unmappedRoutes.map(r => `${r.route_short_name} (${r.route_id})`).join(', ')}`);
}
