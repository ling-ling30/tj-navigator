/**
 * scripts/diag/live-record.mjs
 *
 * Subscribes to Transjakarta MQTT broker (/mobile_armada/#) and records
 * live bus messages into an NDJSON file for 30 minutes.
 */

import mqtt from 'mqtt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse arguments: --duration <minutes>, default 30
const args = process.argv.slice(2);
let durationMinutes = 30;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--duration' && args[i + 1]) {
    durationMinutes = parseFloat(args[i + 1]);
  }
}

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const H = pad(now.getHours());
  const M = pad(now.getMinutes());
  return `${y}${m}${d}-${H}${M}`;
}

const recordingsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const fileName = `armada-${getTimestamp()}.ndjson`;
const filePath = path.join(recordingsDir, fileName);
const writeStream = fs.createWriteStream(filePath, { flags: 'a', highWaterMark: 1024 * 1024 });

console.log(`[Recorder] Initializing recording to: ${filePath}`);
console.log(`[Recorder] Planned duration: ${durationMinutes} minutes`);

let messageCount = 0;
const distinctBuses = new Set();
const seenTrips = new Set();
let consecutiveReconnectFailures = 0;
const MAX_CONSECUTIVE_RECONNECTS = 3;
let isShuttingDown = false;

const client = mqtt.connect('wss://mqtt.tj.co.id:8084/mqtt', {
  protocolVersion: 4,
  clean: true,
  keepalive: 30,
  connectTimeout: 10000,
  reconnectPeriod: 5000, // 5 second pause between retries
});

function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  clearInterval(progressInterval);
  clearTimeout(durationTimeout);

  console.log(`\n[Recorder] Stopping cleanly...`);
  client.end(true, () => {
    writeStream.end(() => {
      let finalSize = 0;
      try {
        finalSize = fs.statSync(filePath).size;
      } catch {}
      console.log(`[Recorder] Completed cleanly.`);
      console.log(`[Recorder] File path: ${filePath}`);
      console.log(`[Recorder] File size: ${(finalSize / (1024 * 1024)).toFixed(2)} MB (${finalSize} bytes)`);
      console.log(`[Recorder] Total messages: ${messageCount}`);
      console.log(`[Recorder] Distinct buses: ${distinctBuses.size}`);
      console.log(`[Recorder] Distinct trips recorded with stops: ${seenTrips.size}`);
      process.exit(code);
    });
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

client.on('connect', () => {
  consecutiveReconnectFailures = 0;
  console.log('[Recorder] Connected to wss://mqtt.tj.co.id:8084/mqtt');
  client.subscribe('/mobile_armada/#', { qos: 0 }, (err) => {
    if (err) {
      console.error('[Recorder] Subscription failed:', err);
      shutdown(1);
    } else {
      console.log('[Recorder] Subscribed to /mobile_armada/#');
    }
  });
});

client.on('reconnect', () => {
  consecutiveReconnectFailures++;
  console.log(`[Recorder] Reconnecting after 5s pause (attempt ${consecutiveReconnectFailures}/${MAX_CONSECUTIVE_RECONNECTS})...`);
  if (consecutiveReconnectFailures > MAX_CONSECUTIVE_RECONNECTS) {
    console.error('[Recorder] Exceeded maximum consecutive reconnect attempts (3). Stopping.');
    shutdown(1);
  }
});

client.on('error', (err) => {
  console.error('[Recorder] MQTT client error:', err.message);
});

client.on('message', (_topic, payload) => {
  let data;
  try {
    data = JSON.parse(payload.toString());
  } catch {
    return;
  }

  messageCount++;
  if (data.bus_body_no) {
    distinctBuses.add(data.bus_body_no);
  }

  const record = {
    t: Date.now(),
    ts: data.timestamp !== undefined ? data.timestamp : null,
    bus: data.bus_body_no !== undefined ? data.bus_body_no : null,
    route: data.route_code !== undefined ? data.route_code : null,
    trip: data.trip_id !== undefined ? data.trip_id : null,
    type: data.type !== undefined ? data.type : null,
    lat: data.latitude !== undefined ? data.latitude : null,
    lon: data.longitude !== undefined ? data.longitude : null,
    bearing: data.bearing !== undefined ? data.bearing : null,
    dir: data.direction !== undefined ? data.direction : null,
    next: data.next_gate !== undefined ? data.next_gate : null,
    eta: data.eta !== undefined ? data.eta : null,
  };

  const tripId = data.trip_id;
  if (tripId && !seenTrips.has(tripId)) {
    seenTrips.add(tripId);
    if (data.stops) {
      record.stops = data.stops;
    }
  }

  writeStream.write(JSON.stringify(record) + '\n');
});

let elapsedMinutes = 0;
const progressInterval = setInterval(() => {
  elapsedMinutes++;
  let sizeMb = '0.00';
  try {
    sizeMb = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
  } catch {}
  console.log(`[Progress ${elapsedMinutes}/${durationMinutes} min] Messages: ${messageCount}, Distinct buses: ${distinctBuses.size}, File size: ${sizeMb} MB`);
}, 60000);

const durationMs = durationMinutes * 60 * 1000;
const durationTimeout = setTimeout(() => {
  console.log(`[Recorder] Full duration (${durationMinutes} minutes) reached.`);
  shutdown(0);
}, durationMs);
