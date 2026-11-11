/**
 * scripts/diag/speed-collector.mjs
 *
 * Real-time Transjakarta speed collector and statistical analyzer.
 * Subscribes to Transjakarta MQTT broker (wss://mqtt.tj.co.id:8084/mqtt)
 * topic /mobile_armada/#.
 *
 * Computes:
 * - Moving speed (excluding stationary samples, v > 2.5 km/h)
 * - Overall speed (all valid samples, including stops / dwell)
 * Grouped by GTFS route and service class (route_desc):
 *   - BRT
 *   - Angkutan Umum Integrasi
 *   - Mikrotrans
 *   - Transjabodetabek
 *   - Royaltrans
 *   - Rusun
 *   - Bus Wisata
 *
 * Filters GPS glitches (> 120 km/h) and duplicate/burst pings.
 * Writes / updates JSON report periodically.
 */

import mqtt from 'mqtt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

// 1. Load GTFS routes for route_desc mapping
const routesFilePath = path.join(REPO_ROOT, 'scripts/diag/gtfs/routes.txt');
const routeDescMap = new Map();

if (fs.existsSync(routesFilePath)) {
  const content = fs.readFileSync(routesFilePath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  const header = lines[0].replace('\r', '').split(',');
  const idIdx = header.indexOf('route_id');
  const shortIdx = header.indexOf('route_short_name');
  const descIdx = header.indexOf('route_desc');

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].replace('\r', '').split(',');
    const id = parts[idIdx];
    const shortName = parts[shortIdx];
    const desc = parts[descIdx];
    if (id && desc) routeDescMap.set(id, desc);
    if (shortName && desc) routeDescMap.set(shortName, desc);
  }
  console.log(`[Collector] Loaded ${routeDescMap.size} route mappings from GTFS routes.txt`);
} else {
  console.warn(`[Collector] Warning: ${routesFilePath} not found!`);
}

function resolveServiceClass(routeCode, payloadType) {
  if (routeCode && routeDescMap.has(routeCode)) {
    return routeDescMap.get(routeCode);
  }
  if (payloadType) {
    if (payloadType === 'BRT') return 'BRT';
    if (payloadType === 'Mikrotrans') return 'Mikrotrans';
    if (payloadType === 'Angkutan Umum Integrasi') return 'Angkutan Umum Integrasi';
    if (payloadType === 'Transjabodetabek') return 'Transjabodetabek';
    if (payloadType === 'Royaltrans') return 'Royaltrans';
    if (payloadType === 'Rusun') return 'Rusun';
    if (payloadType === 'Bus Wisata') return 'Bus Wisata';
    return payloadType;
  }
  return 'Other';
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getPercentile(sortedArr, p) {
  if (!sortedArr || sortedArr.length === 0) return 0;
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

// State tracking
const vehicleLastPing = new Map();
const serviceClassStats = new Map();
const routeStats = new Map();

function ensureStatsBucket(map, key, defaultObj) {
  if (!map.has(key)) {
    map.set(key, defaultObj());
  }
  return map.get(key);
}

let totalPackets = 0;
let validDeltas = 0;
let glitchCount = 0;
let stationaryCount = 0;
const startTimestampMs = Date.now();

// Parse arguments: --duration <minutes>, default 15
const args = process.argv.slice(2);
let durationMinutes = 15;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--duration' && args[i + 1]) {
    durationMinutes = parseFloat(args[i + 1]);
  }
}

const outputPath = path.join(__dirname, 'speed-statistics.json');

function saveStatsToFile(finalReport = false) {
  const elapsedSec = (Date.now() - startTimestampMs) / 1000;
  const now = new Date();
  const startTimeObj = new Date(startTimestampMs);
  const timeFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });

  const summary = {
    metadata: {
      startedAtWIB: timeFormat.format(startTimeObj),
      updatedAtWIB: timeFormat.format(now),
      elapsedSeconds: Math.round(elapsedSec),
      totalMqttPackets: totalPackets,
      validSpeedSamples: validDeltas,
      gpsGlitchesFiltered: glitchCount,
      stationarySamples: stationaryCount,
      activeVehiclesTracked: vehicleLastPing.size,
      status: finalReport ? 'completed' : 'collecting'
    },
    byServiceClass: {},
    byRoute: {}
  };

  for (const [sClass, stats] of serviceClassStats.entries()) {
    const movingSorted = [...stats.movingSpeeds].sort((a, b) => a - b);
    const overallSorted = [...stats.overallSpeeds].sort((a, b) => a - b);

    summary.byServiceClass[sClass] = {
      sampleSize: overallSorted.length,
      movingSampleSize: movingSorted.length,
      stationarySampleSize: overallSorted.length - movingSorted.length,
      movingSpeedKmh: {
        p25: Number(getPercentile(movingSorted, 25).toFixed(1)),
        median: Number(getPercentile(movingSorted, 50).toFixed(1)),
        p75: Number(getPercentile(movingSorted, 75).toFixed(1)),
        mean: movingSorted.length ? Number((movingSorted.reduce((a, b) => a + b, 0) / movingSorted.length).toFixed(1)) : 0
      },
      overallSpeedKmh: {
        p25: Number(getPercentile(overallSorted, 25).toFixed(1)),
        median: Number(getPercentile(overallSorted, 50).toFixed(1)),
        p75: Number(getPercentile(overallSorted, 75).toFixed(1)),
        mean: overallSorted.length ? Number((overallSorted.reduce((a, b) => a + b, 0) / overallSorted.length).toFixed(1)) : 0
      }
    };
  }

  for (const [route, stats] of routeStats.entries()) {
    const movingSorted = [...stats.movingSpeeds].sort((a, b) => a - b);
    const overallSorted = [...stats.overallSpeeds].sort((a, b) => a - b);

    if (overallSorted.length >= 5) {
      summary.byRoute[route] = {
        serviceClass: stats.serviceClass,
        sampleSize: overallSorted.length,
        movingSpeedKmh: {
          median: Number(getPercentile(movingSorted, 50).toFixed(1)),
          p25: Number(getPercentile(movingSorted, 25).toFixed(1)),
          p75: Number(getPercentile(movingSorted, 75).toFixed(1))
        },
        overallSpeedKmh: {
          median: Number(getPercentile(overallSorted, 50).toFixed(1)),
          p25: Number(getPercentile(overallSorted, 25).toFixed(1)),
          p75: Number(getPercentile(overallSorted, 75).toFixed(1))
        }
      };
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
  return summary;
}

console.log(`[Collector] Starting Transjakarta live telemetry speed collector...`);
console.log(`[Collector] Duration configured: ${durationMinutes} minutes`);
console.log(`[Collector] Output file: ${outputPath}`);

const client = mqtt.connect('wss://mqtt.tj.co.id:8084/mqtt', {
  protocolVersion: 4,
  clean: true,
  keepalive: 30,
  connectTimeout: 10000,
});

client.on('connect', () => {
  console.log('[Collector] Connected to Transjakarta MQTT broker (wss://mqtt.tj.co.id:8084/mqtt)');
  client.subscribe('/mobile_armada/#', { qos: 0 }, (err) => {
    if (err) {
      console.error('[Collector] Subscription failed:', err);
      process.exit(1);
    }
    console.log('[Collector] Subscribed to /mobile_armada/#. Collecting real-time telemetry...');
  });
});

client.on('message', (topic, payload) => {
  totalPackets++;
  try {
    const data = JSON.parse(payload.toString());
    const vehicleId = data.bus_body_no;
    const routeCode = data.route_code;
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);
    const timeMs = Number(data.timestamp);

    if (!vehicleId || isNaN(lat) || isNaN(lon) || !timeMs) return;

    const serviceClass = resolveServiceClass(routeCode, data.type);

    if (vehicleLastPing.has(vehicleId)) {
      const prev = vehicleLastPing.get(vehicleId);
      const dtSec = (timeMs - prev.timeMs) / 1000;

      // Discard duplicate or backwards timestamps
      if (dtSec <= 0) return;

      // If less than 3 seconds, keep previous baseline (debounce high-frequency burst / jitter)
      if (dtSec < 3.0) return;

      // If gap exceeds 180s (3 minutes), vehicle was likely offline/inactive; reset baseline
      if (dtSec > 180) {
        vehicleLastPing.set(vehicleId, { lat, lon, timeMs, routeCode, serviceClass });
        return;
      }

      const distMeters = haversineDistanceMeters(prev.lat, prev.lon, lat, lon);
      const speedKmh = (distMeters / dtSec) * 3.6;

      // Advance reference ping to current
      vehicleLastPing.set(vehicleId, { lat, lon, timeMs, routeCode, serviceClass });

      // GPS Glitch filter: speeds > 120 km/h are glitches / teleports
      if (speedKmh > 120) {
        glitchCount++;
        return;
      }

      validDeltas++;

      const sStats = ensureStatsBucket(serviceClassStats, serviceClass, () => ({
        movingSpeeds: [],
        overallSpeeds: []
      }));

      const rStats = ensureStatsBucket(routeStats, routeCode, () => ({
        serviceClass,
        movingSpeeds: [],
        overallSpeeds: []
      }));

      // Overall speed includes all samples
      sStats.overallSpeeds.push(speedKmh);
      rStats.overallSpeeds.push(speedKmh);

      // Moving speed excludes stationary samples (speed <= 2.5 km/h)
      if (speedKmh > 2.5) {
        sStats.movingSpeeds.push(speedKmh);
        rStats.movingSpeeds.push(speedKmh);
      } else {
        stationaryCount++;
      }
    } else {
      vehicleLastPing.set(vehicleId, { lat, lon, timeMs, routeCode, serviceClass });
    }
  } catch (err) {}
});

client.on('error', (err) => {
  console.error('[Collector] MQTT error:', err.message);
});

// Periodic save every 20 seconds
const saveInterval = setInterval(() => {
  saveStatsToFile(false);
  const elapsed = Math.round((Date.now() - startTimestampMs) / 1000);
  console.log(`[Collector] [${elapsed}s elapsed] Packets: ${totalPackets}, Valid Samples: ${validDeltas}, Stationary: ${stationaryCount}, Glitches: ${glitchCount}, Tracked Buses: ${vehicleLastPing.size}`);
}, 20000);

// Finish collection when duration reached
if (durationMinutes > 0) {
  setTimeout(() => {
    clearInterval(saveInterval);
    client.end(true);
    console.log('[Collector] Sampling duration completed. Generating final report...');
    const finalSummary = saveStatsToFile(true);
    console.log('\n=== FINAL SUMMARY BY SERVICE CLASS ===');
    console.table(Object.entries(finalSummary.byServiceClass).map(([cls, data]) => ({
      'Service Class': cls,
      'Total Samples': data.sampleSize,
      'Moving Samples': data.movingSampleSize,
      'Stationary %': `${((data.stationarySampleSize / (data.sampleSize || 1)) * 100).toFixed(1)}%`,
      'Moving Median (km/h)': data.movingSpeedKmh.median,
      'Moving P25-P75': `${data.movingSpeedKmh.p25} - ${data.movingSpeedKmh.p75}`,
      'Overall Median (km/h)': data.overallSpeedKmh.median,
      'Overall P25-P75': `${data.overallSpeedKmh.p25} - ${data.overallSpeedKmh.p75}`
    })));
    process.exit(0);
  }, durationMinutes * 60 * 1000);
}
