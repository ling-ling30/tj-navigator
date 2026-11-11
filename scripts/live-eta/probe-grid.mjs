/**
 * Works out how the feed's topic grid (/mobile_armada/<lat>-<lon>/...) maps to coordinates,
 * so the app can subscribe to just the cells along a leg. Listens to everything for a few seconds.
 * Run: node scripts/live-eta/probe-grid.mjs [seconds]
 */
import mqtt from 'mqtt';

const SECONDS = Number(process.argv[2] ?? 6);
const client = mqtt.connect('wss://mqtt.tj.co.id:8084/mqtt', { protocolVersion: 4, keepalive: 30, reconnectPeriod: 5000 });
/** axis index → [min coordinate, max coordinate] */
const latRange = new Map();
const lonRange = new Map();
const widen = (map, key, v) => {
  const r = map.get(key);
  if (!r) map.set(key, [v, v]); else { r[0] = Math.min(r[0], v); r[1] = Math.max(r[1], v); }
};

client.on('connect', () => client.subscribe('/mobile_armada/#', { qos: 0 }));
client.on('message', (topic, payload) => {
  const cell = topic.split('/')[2];
  let m;
  try { m = JSON.parse(payload.toString()); } catch { return; }
  if (!cell || !Number.isFinite(m.latitude) || !Number.isFinite(m.longitude)) return;
  const [a, b] = cell.split('-').map(Number);
  widen(latRange, a, m.latitude);
  widen(lonRange, b, m.longitude);
});

/** Least-squares line through (index, cell centre): coordinate = origin + step × index. */
function fit(map) {
  const pts = [...map].filter(([, r]) => r[1] - r[0] > 0).map(([i, r]) => [i, (r[0] + r[1]) / 2]);
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const step = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { step, origin: (sy - step * sx) / n, cells: n };
}

setTimeout(() => {
  const show = (name, map) => {
    const f = fit(map);
    const widths = [...map.values()].map(r => r[1] - r[0]).sort((x, y) => x - y);
    console.log(`${name}: ${f.cells} indexes, step ${f.step.toFixed(5)} deg per index, origin ${f.origin.toFixed(5)}, widest cell ${widths[widths.length - 1].toFixed(5)} deg`);
    const sample = [...map].sort((x, y) => x[0] - y[0]).filter((_, i, all) => i % Math.ceil(all.length / 5) === 0);
    console.log('   ' + sample.map(([i, r]) => `${i}: ${r[0].toFixed(4)}..${r[1].toFixed(4)}`).join(' | '));
  };
  show('lat', latRange);
  show('lon', lonRange);
  client.end(true, () => process.exit(0));
}, SECONDS * 1000);
