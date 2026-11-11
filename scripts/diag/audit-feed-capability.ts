import fs from 'node:fs';
import path from 'node:path';

const GTFS_DIR = path.resolve('scripts/diag/gtfs');

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
    for (let h = 0; h < headers.length; h++) {
      row[headers[h]] = vals[h];
    }
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

async function main() {
  console.log('=== AUDITING FEED CAPABILITY ===');

  // Load stops
  console.log('Loading stops.txt...');
  const stopsRaw = parseCSV(path.join(GTFS_DIR, 'stops.txt'));
  const stopsMap = new Map<string, { id: string; name: string; lat: number; lon: number }>();
  stopsRaw.forEach(s => {
    stopsMap.set(s.stop_id, {
      id: s.stop_id,
      name: s.stop_name,
      lat: parseFloat(s.stop_lat),
      lon: parseFloat(s.stop_lon)
    });
  });

  // Load routes
  console.log('Loading routes.txt...');
  const routesRaw = parseCSV(path.join(GTFS_DIR, 'routes.txt'));
  const routesMap = new Map<string, any>();
  routesRaw.forEach(r => routesMap.set(r.route_id, r));

  // Load trips
  console.log('Loading trips.txt...');
  const tripsRaw = parseCSV(path.join(GTFS_DIR, 'trips.txt'));
  const tripsMap = new Map<string, any>();
  tripsRaw.forEach(t => tripsMap.set(t.trip_id, t));

  // Load calendar
  console.log('Loading calendar.txt...');
  const calendarRaw = parseCSV(path.join(GTFS_DIR, 'calendar.txt'));

  // Load frequencies
  console.log('Loading frequencies.txt...');
  const frequenciesRaw = parseCSV(path.join(GTFS_DIR, 'frequencies.txt'));

  // Load stop_times
  console.log('Loading stop_times.txt...');
  const stopTimesRaw = parseCSV(path.join(GTFS_DIR, 'stop_times.txt'));

  console.log(`Loaded: ${stopsRaw.length} stops, ${routesRaw.length} routes, ${tripsRaw.length} trips, ${stopTimesRaw.length} stop_times rows, ${frequenciesRaw.length} frequencies rows, ${calendarRaw.length} calendar rows`);

  // 1. stop_times.txt analysis
  console.log('\n--- 1. STOP_TIMES.TXT CAPABILITY ---');
  let missingArr = 0;
  let missingDep = 0;
  let totalStopTimes = stopTimesRaw.length;

  const tripStopsMap = new Map<string, Array<{
    seq: number;
    stopId: string;
    arrSec: number;
    depSec: number;
  }>>();

  for (const st of stopTimesRaw) {
    const arr = timeStrToSec(st.arrival_time);
    const dep = timeStrToSec(st.departure_time);
    if (isNaN(arr)) missingArr++;
    if (isNaN(dep)) missingDep++;
    if (!tripStopsMap.has(st.trip_id)) {
      tripStopsMap.set(st.trip_id, []);
    }
    tripStopsMap.get(st.trip_id)!.push({
      seq: parseInt(st.stop_sequence, 10),
      stopId: st.stop_id,
      arrSec: arr,
      depSec: dep
    });
  }

  console.log(`Per-stop times present: missing arrival=${missingArr}, missing departure=${missingDep} (out of ${totalStopTimes})`);
  console.log(`Per-stop times present for all trips: ${missingArr === 0 && missingDep === 0}`);

  // Sort each trip's stops by seq
  for (const stops of tripStopsMap.values()) {
    stops.sort((a, b) => a.seq - b.seq);
  }

  // Implied hop speed distribution
  const hopSpeedsKmH: number[] = [];
  const hopDurationsSec: number[] = [];
  const hopDistancesM: number[] = [];
  const absurdHops: Array<{
    tripId: string;
    fromStop: string;
    toStop: string;
    distM: number;
    durationSec: number;
    speedKmH: number;
    issue: string;
  }> = [];

  for (const [tripId, stops] of tripStopsMap.entries()) {
    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = stops[i];
      const s2 = stops[i + 1];
      const stopInfo1 = stopsMap.get(s1.stopId);
      const stopInfo2 = stopsMap.get(s2.stopId);
      if (!stopInfo1 || !stopInfo2) continue;

      const distM = haversineMeters(stopInfo1.lat, stopInfo1.lon, stopInfo2.lat, stopInfo2.lon);
      const durationSec = s2.arrSec - s1.depSec;

      hopDurationsSec.push(durationSec);
      hopDistancesM.push(distM);

      if (durationSec <= 0) {
        absurdHops.push({
          tripId,
          fromStop: `${stopInfo1.name} (${s1.stopId})`,
          toStop: `${stopInfo2.name} (${s2.stopId})`,
          distM,
          durationSec,
          speedKmH: Infinity,
          issue: durationSec === 0 ? 'Zero duration hop' : 'Negative duration hop'
        });
      } else {
        const speedKmH = (distM / 1000) / (durationSec / 3600);
        hopSpeedsKmH.push(speedKmH);
        if (speedKmH > 100) {
          absurdHops.push({
            tripId,
            fromStop: `${stopInfo1.name} (${s1.stopId})`,
            toStop: `${stopInfo2.name} (${s2.stopId})`,
            distM,
            durationSec,
            speedKmH,
            issue: 'Speed > 100 km/h'
          });
        }
      }
    }
  }

  console.log(`Total hops analyzed: ${hopDurationsSec.length}`);
  console.log(`Hop duration (s): min=${Math.min(...hopDurationsSec)}, p10=${percentile(hopDurationsSec, 10).toFixed(0)}, p50=${percentile(hopDurationsSec, 50).toFixed(0)}, p90=${percentile(hopDurationsSec, 90).toFixed(0)}, max=${Math.max(...hopDurationsSec)}`);
  console.log(`Hop distance (m): min=${Math.min(...hopDistancesM)}, p10=${percentile(hopDistancesM, 10).toFixed(0)}, p50=${percentile(hopDistancesM, 50).toFixed(0)}, p90=${percentile(hopDistancesM, 90).toFixed(0)}, max=${Math.max(...hopDistancesM)}`);
  console.log(`Hop speed (km/h): min=${Math.min(...hopSpeedsKmH).toFixed(1)}, p10=${percentile(hopSpeedsKmH, 10).toFixed(1)}, p50=${percentile(hopSpeedsKmH, 50).toFixed(1)}, p90=${percentile(hopSpeedsKmH, 90).toFixed(1)}, max=${Math.max(...hopSpeedsKmH).toFixed(1)}`);
  console.log(`Absurd hops count: ${absurdHops.length}`);
  console.log('Sample absurd hops:', absurdHops.slice(0, 10));

  // Do times differ between peak and off-peak trips of the same route?
  // Let's check trip durations for the same route and pattern across different times of day
  console.log('\nChecking peak vs off-peak trip durations for same route...');
  const routeTrips = new Map<string, Array<{ tripId: string; departure: number; duration: number; stopPattern: string }>>();
  for (const [tripId, stops] of tripStopsMap.entries()) {
    const tripMeta = tripsMap.get(tripId);
    if (!tripMeta) continue;
    const routeId = tripMeta.route_id;
    const pattern = stops.map(s => s.stopId).join(';');
    const departure = stops[0].depSec;
    const duration = stops[stops.length - 1].arrSec - stops[0].depSec;

    const key = `${routeId}_dir${tripMeta.direction_id}`;
    if (!routeTrips.has(key)) routeTrips.set(key, []);
    routeTrips.get(key)!.push({ tripId, departure, duration, stopPattern: pattern });
  }

  let routeTimeVarianceCount = 0;
  let totalMultiTripRoutes = 0;
  const varianceExamples: Array<{ route: string; tripsCount: number; minDuration: number; maxDuration: number; diffSec: number }> = [];

  for (const [key, tList] of routeTrips.entries()) {
    // group by pattern
    const patternGroups = new Map<string, typeof tList>();
    for (const t of tList) {
      if (!patternGroups.has(t.stopPattern)) patternGroups.set(t.stopPattern, []);
      patternGroups.get(t.stopPattern)!.push(t);
    }
    for (const pTrips of patternGroups.values()) {
      if (pTrips.length > 1) {
        totalMultiTripRoutes++;
        const durations = pTrips.map(t => t.duration);
        const minD = Math.min(...durations);
        const maxD = Math.max(...durations);
        if (maxD > minD) {
          routeTimeVarianceCount++;
          if (varianceExamples.length < 10) {
            varianceExamples.push({ route: key, tripsCount: pTrips.length, minDuration: minD, maxDuration: maxD, diffSec: maxD - minD });
          }
        }
      }
    }
  }
  console.log(`Multi-trip pattern groups: ${totalMultiTripRoutes}, Groups with duration differences: ${routeTimeVarianceCount}`);
  console.log('Variance examples:', varianceExamples);

  // 2. frequencies.txt analysis
  console.log('\n--- 2. FREQUENCIES.TXT CAPABILITY ---');
  const freqTripIds = new Set<string>();
  const headways: number[] = [];
  let earliestStart = Infinity;
  let latestEnd = -Infinity;

  const freqByWindow: Record<string, number[]> = {
    'Early Morning (05:00-07:00)': [],
    'Morning Peak (07:00-09:00)': [],
    'Midday Off-peak (09:00-16:00)': [],
    'Evening Peak (16:00-20:00)': [],
    'Night (20:00-23:00)': [],
    'Midnight/Late (23:00-05:00)': []
  };

  for (const f of frequenciesRaw) {
    freqTripIds.add(f.trip_id);
    const startSec = timeStrToSec(f.start_time);
    const endSec = timeStrToSec(f.end_time);
    const headway = parseInt(f.headway_secs, 10);
    headways.push(headway);

    if (startSec < earliestStart) earliestStart = startSec;
    if (endSec > latestEnd) latestEnd = endSec;

    const mid = (startSec + endSec) / 2;
    const hour = (mid / 3600) % 24;
    if (hour >= 5 && hour < 7) freqByWindow['Early Morning (05:00-07:00)'].push(headway);
    else if (hour >= 7 && hour < 9) freqByWindow['Morning Peak (07:00-09:00)'].push(headway);
    else if (hour >= 9 && hour < 16) freqByWindow['Midday Off-peak (09:00-16:00)'].push(headway);
    else if (hour >= 16 && hour < 20) freqByWindow['Evening Peak (16:00-20:00)'].push(headway);
    else if (hour >= 20 && hour < 23) freqByWindow['Night (20:00-23:00)'].push(headway);
    else freqByWindow['Midnight/Late (23:00-05:00)'].push(headway);
  }

  // Which routes are covered by frequencies.txt?
  const freqRouteIds = new Set<string>();
  for (const tId of freqTripIds) {
    const t = tripsMap.get(tId);
    if (t) freqRouteIds.add(t.route_id);
  }

  const allRouteIds = new Set(routesRaw.map(r => r.route_id));
  const routesWithoutFreq: string[] = [];
  for (const rId of allRouteIds) {
    if (!freqRouteIds.has(rId)) routesWithoutFreq.push(rId);
  }

  console.log(`Total frequency rows: ${frequenciesRaw.length}`);
  console.log(`Trips covered by frequencies: ${freqTripIds.size} / ${tripsRaw.length}`);
  console.log(`Routes covered by frequencies: ${freqRouteIds.size} / ${allRouteIds.size}`);
  console.log(`Routes without frequency row: ${routesWithoutFreq.length} (${routesWithoutFreq.join(', ')})`);
  console.log(`Earliest departure window start: ${Math.floor(earliestStart/3600)}:${String(Math.floor((earliestStart%3600)/60)).padStart(2, '0')}`);
  console.log(`Latest departure window end: ${Math.floor(latestEnd/3600)}:${String(Math.floor((latestEnd%3600)/60)).padStart(2, '0')}`);
  console.log(`Headways overall (sec): min=${Math.min(...headways)}, p50=${percentile(headways, 50)}, p90=${percentile(headways, 90)}, max=${Math.max(...headways)}`);
  for (const [w, hList] of Object.entries(freqByWindow)) {
    if (hList.length === 0) continue;
    console.log(`  ${w}: n=${hList.length}, min=${Math.min(...hList)}s, median=${percentile(hList, 50)}s, max=${Math.max(...hList)}s`);
  }

  // 3. calendar.txt and trips.txt service ids
  console.log('\n--- 3. CALENDAR.TXT & SERVICE IDS ---');
  console.log('Calendar rows:');
  calendarRaw.forEach(c => {
    console.log(`  service_id: ${c.service_id}, M-F:[${c.monday},${c.tuesday},${c.wednesday},${c.thursday},${c.friday}], Sat:${c.saturday}, Sun:${c.sunday}, start:${c.start_date}, end:${c.end_date}`);
  });

  const routeServiceMap = new Map<string, Set<string>>();
  for (const t of tripsRaw) {
    if (!routeServiceMap.has(t.route_id)) routeServiceMap.set(t.route_id, new Set());
    routeServiceMap.get(t.route_id)!.add(t.service_id);
  }

  const routesByServiceProfile: Record<string, string[]> = {
    'All days / Daily': [],
    'Weekdays only': [],
    'Weekends only': [],
    'Sundays only': [],
    'Other': []
  };

  const calMap = new Map(calendarRaw.map(c => [c.service_id, c]));

  for (const [rId, services] of routeServiceMap.entries()) {
    let runsWeekday = false;
    let runsSaturday = false;
    let runsSunday = false;

    for (const sId of services) {
      const c = calMap.get(sId);
      if (c) {
        if (c.monday === '1' || c.tuesday === '1' || c.wednesday === '1' || c.thursday === '1' || c.friday === '1') runsWeekday = true;
        if (c.saturday === '1') runsSaturday = true;
        if (c.sunday === '1') runsSunday = true;
      }
    }

    if (runsWeekday && runsSaturday && runsSunday) routesByServiceProfile['All days / Daily'].push(rId);
    else if (runsWeekday && !runsSaturday && !runsSunday) routesByServiceProfile['Weekdays only'].push(rId);
    else if (!runsWeekday && (runsSaturday || runsSunday)) {
      if (!runsSaturday && runsSunday) routesByServiceProfile['Sundays only'].push(rId);
      else routesByServiceProfile['Weekends only'].push(rId);
    } else routesByServiceProfile['Other'].push(rId);
  }

  console.log(`Routes service breakdown:`);
  for (const [cat, rList] of Object.entries(routesByServiceProfile)) {
    console.log(`  ${cat}: ${rList.length} routes (${rList.slice(0, 10).join(', ')}${rList.length > 10 ? '...' : ''})`);
  }

  // 4. Stop patterns per route and direction
  console.log('\n--- 4. STOP PATTERNS PER ROUTE & DIRECTION ---');
  // Group trips by route_id and direction_id
  const patternsPerRouteDir = new Map<string, Map<string, number>>();
  const allStopsPerRouteDir = new Map<string, Set<string>>();
  const loopTrips: Array<{ tripId: string; routeId: string; repeatedStop: string; stopName: string }> = [];

  for (const [tripId, stops] of tripStopsMap.entries()) {
    const t = tripsMap.get(tripId);
    if (!t) continue;
    const rDirKey = `${t.route_id}_dir${t.direction_id}`;
    if (!patternsPerRouteDir.has(rDirKey)) {
      patternsPerRouteDir.set(rDirKey, new Map());
      allStopsPerRouteDir.set(rDirKey, new Set());
    }
    const patKey = stops.map(s => s.stopId).join(';');
    patternsPerRouteDir.get(rDirKey)!.set(patKey, (patternsPerRouteDir.get(rDirKey)!.get(patKey) || 0) + 1);
    stops.forEach(s => allStopsPerRouteDir.get(rDirKey)!.add(s.stopId));

    // Check loops
    const seenStops = new Set<string>();
    for (const s of stops) {
      if (seenStops.has(s.stopId)) {
        const sInfo = stopsMap.get(s.stopId);
        loopTrips.push({
          tripId,
          routeId: t.route_id,
          repeatedStop: s.stopId,
          stopName: sInfo?.name || s.stopId
        });
        break; // record once per trip
      }
      seenStops.add(s.stopId);
    }
  }

  let totalRouteDirs = patternsPerRouteDir.size;
  let totalPatterns = 0;
  let singlePatternCount = 0;
  let multiPatternCount = 0;
  let lostStopsTotal = 0;
  const lostStopsPerRoute: Array<{ rDir: string; canonicalStops: number; totalUniqueStops: number; lostCount: number }> = [];

  for (const [rDir, patMap] of patternsPerRouteDir.entries()) {
    totalPatterns += patMap.size;
    if (patMap.size === 1) singlePatternCount++;
    else multiPatternCount++;

    // Find canonical pattern (highest count)
    const sorted = [...patMap.entries()].sort((a, b) => b[1] - a[1]);
    const canonicalStops = new Set(sorted[0][0].split(';'));
    const allStops = allStopsPerRouteDir.get(rDir)!;

    let lost = 0;
    for (const s of allStops) {
      if (!canonicalStops.has(s)) lost++;
    }
    if (lost > 0) {
      lostStopsTotal += lost;
      lostStopsPerRoute.push({
        rDir,
        canonicalStops: canonicalStops.size,
        totalUniqueStops: allStops.size,
        lostCount: lost
      });
    }
  }

  console.log(`Total Route-Directions: ${totalRouteDirs}`);
  console.log(`Total Distinct Patterns: ${totalPatterns} (Avg ${(totalPatterns / totalRouteDirs).toFixed(2)} per route-dir)`);
  console.log(`Route-Dirs with 1 pattern: ${singlePatternCount}, >1 pattern: ${multiPatternCount}`);
  console.log(`Stops lost by keeping only the most frequent pattern: ${lostStopsTotal} across ${lostStopsPerRoute.length} route-directions`);
  console.log('Worst routes for lost stops:', lostStopsPerRoute.sort((a, b) => b.lostCount - a.lostCount).slice(0, 10));
  console.log(`Trips with loop patterns (same stop visited >= 2 times): ${loopTrips.length}`);
  const uniqueLoopRoutes = new Set(loopTrips.map(l => l.routeId));
  console.log(`Distinct routes with loops: ${uniqueLoopRoutes.size} (${Array.from(uniqueLoopRoutes).slice(0, 10).join(', ')})`);

  // 5. Common lines analysis
  console.log('\n--- 5. COMMON LINES ANALYSIS ---');
  // For every adjacent stop pair (or sequence of stop pairs), how many routes share them?
  const pairRoutes = new Map<string, Set<string>>();
  for (const [rDir, patMap] of patternsPerRouteDir.entries()) {
    const routeId = rDir.split('_')[0];
    const rInfo = routesMap.get(routeId);
    const shortName = rInfo ? rInfo.route_short_name : routeId;

    for (const pat of patMap.keys()) {
      const stopList = pat.split(';');
      for (let i = 0; i < stopList.length - 1; i++) {
        const pairKey = `${stopList[i]}->${stopList[i+1]}`;
        if (!pairRoutes.has(pairKey)) pairRoutes.set(pairKey, new Set());
        pairRoutes.get(pairKey)!.add(shortName);
      }
    }
  }

  const shareCounts = Array.from(pairRoutes.values()).map(s => s.size);
  console.log(`Total distinct adjacent stop hops in GTFS: ${pairRoutes.size}`);
  console.log(`Routes sharing hop: min=${Math.min(...shareCounts)}, p50=${percentile(shareCounts, 50)}, p90=${percentile(shareCounts, 90)}, max=${Math.max(...shareCounts)}`);

  const topSharedPairs = Array.from(pairRoutes.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 15)
    .map(([pair, routes]) => {
      const [from, to] = pair.split('->');
      return {
        pair: `${stopsMap.get(from)?.name || from} -> ${stopsMap.get(to)?.name || to}`,
        routesCount: routes.size,
        routes: Array.from(routes).sort().join(', ')
      };
    });
  console.log('Top shared stop pairs:', topSharedPairs);

  // 6. Size cost analysis
  console.log('\n--- 6. SIZE COST ANALYSIS FOR COMPILED GRAPH ---');
  const compiledPath = path.resolve('public/data/jakarta-transit-network.json');
  const compiledStat = fs.statSync(compiledPath);
  const currentBytes = compiledStat.size;
  console.log(`Current jakarta-transit-network.json: ${(currentBytes / 1024).toFixed(1)} KB`);

  // Let's compute how many routes & hops exist in compiled network
  const network = JSON.parse(fs.readFileSync(compiledPath, 'utf-8'));
  let totalHops = 0;
  for (const r of network.routes) {
    totalHops += (r[4].length - 1);
  }
  console.log(`Network has ${network.stops.length} stops, ${network.routes.length} routes, ${totalHops} total hops`);

  // Size cost estimation:
  // 1. Per-hop seconds: an array of integers per route [hopSec1, hopSec2, ...]
  // For ~13,000 hops, JSON numbers (e.g. "125,") take ~4 bytes per hop = ~52 KB.
  // 2. Headway windows: [startSec, endSec, headwaySec] for each route (~4 windows per route * 400 routes = 1600 tuples = ~35 KB).
  // 3. Service hours / calendar: days of week bitmap or string + start/end time (~25 bytes per route * 400 routes = ~10 KB).
  console.log(`Estimated additional raw JSON: ~100-120 KB (~5-6% increase)`);

  console.log('\n=== FEED CAPABILITY AUDIT COMPLETE ===');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
