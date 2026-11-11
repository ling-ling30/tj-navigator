/**
 * Records the live bus feed for the arrival-time work: positions of every bus, and every 20 s per bus
 * the operator's own ETA to each upcoming stop (the yardstick our model has to beat).
 * Run from the repo root: node scripts/live-eta/record.mjs [minutes] [seconds between ETA snapshots]     (defaults 40 and 20)
 * One read-only connection. Output: scripts/diag/recordings/eta-<stamp>.ndjson (git-ignored).
 *
 * Line formats:
 *   p: [t, bus, trip, lat, lon, next]                 position (t = receive time, epoch seconds)
 *   e: [t, bus, trip, [[stopId, etaMinutes], ...]]    operator ETAs, at most one line per bus per 20 s
 */
import fs from 'node:fs';
import path from 'node:path';
import mqtt from 'mqtt';

const BROKER = 'wss://mqtt.tj.co.id:8084/mqtt';
const TOPIC = '/mobile_armada/#';
const MINUTES = Number(process.argv[2] ?? 40);
const ETA_EVERY_SEC = Number(process.argv[3] ?? 20);
const POSITION_EVERY_SEC = 3;

const dir = path.resolve('scripts/diag/recordings');
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const file = path.join(dir, `eta-${stamp}.ndjson`);
const out = fs.createWriteStream(file);

const lastPosition = new Map();
const lastEta = new Map();
let messages = 0;

const client = mqtt.connect(BROKER, { protocolVersion: 4, keepalive: 30, reconnectPeriod: 5000, connectTimeout: 15000 });
client.on('connect', () => client.subscribe(TOPIC, { qos: 0 }));
client.on('error', err => console.error('[record] error', err.message));
client.on('message', (_topic, payload) => {
  let m;
  try { m = JSON.parse(payload.toString()); } catch { return; }
  if (!m.bus_body_no || !Number.isFinite(m.latitude) || !Number.isFinite(m.longitude)) return;
  messages++;
  const t = Math.round(Date.now() / 1000);
  const bus = m.bus_body_no;
  if (t - (lastPosition.get(bus) ?? 0) >= POSITION_EVERY_SEC) {
    lastPosition.set(bus, t);
    out.write(JSON.stringify({ p: [t, bus, m.trip_id ?? '', +m.latitude.toFixed(6), +m.longitude.toFixed(6), m.next_gate ?? ''] }) + '\n');
  }
  if (Array.isArray(m.stops) && t - (lastEta.get(bus) ?? 0) >= ETA_EVERY_SEC) {
    lastEta.set(bus, t);
    const etas = m.stops.filter(s => s.stop_id && Number.isFinite(s.eta)).map(s => [s.stop_id, s.eta]);
    if (etas.length) out.write(JSON.stringify({ e: [t, bus, m.trip_id ?? '', etas] }) + '\n');
  }
});

const started = Date.now();
const progress = setInterval(() => {
  const mb = (fs.statSync(file).size / 1e6).toFixed(1);
  console.log(`[record] ${((Date.now() - started) / 60000).toFixed(0)} min, ${messages} messages, ${lastPosition.size} buses, ${mb} MB`);
}, 5 * 60 * 1000);

setTimeout(() => {
  clearInterval(progress);
  client.end(true, () => out.end(() => {
    console.log(`[record] done: ${file} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${messages} messages, ${lastPosition.size} buses)`);
    process.exit(0);
  }));
}, MINUTES * 60 * 1000);
