/**
 * How much data does following ONE line cost? Subscribes to a single route for a short while and reports
 * messages, bytes, buses and the topic grid cells seen. This decides how the app may subscribe on mobile data.
 * Run: node scripts/live-eta/probe-line.mjs [route code] [seconds]
 */
import mqtt from 'mqtt';

const ROUTE = process.argv[2] ?? '9';
const SECONDS = Number(process.argv[3] ?? 40);
const client = mqtt.connect('wss://mqtt.tj.co.id:8084/mqtt', { protocolVersion: 4, keepalive: 30, reconnectPeriod: 5000 });

let messages = 0;
let bytes = 0;
const buses = new Set();
const grids = new Map();
let sampleTopic = '';

client.on('connect', () => client.subscribe(`/mobile_armada/+/${ROUTE}/#`, { qos: 0 }, (err, granted) => {
  console.log('subscribed', err ? err.message : JSON.stringify(granted));
}));
client.on('message', (topic, payload) => {
  messages++;
  bytes += payload.length;
  const parts = topic.split('/');
  sampleTopic = topic;
  grids.set(parts[2], (grids.get(parts[2]) ?? 0) + 1);
  buses.add(parts[parts.length - 1]);
});
setTimeout(() => {
  console.log(`route ${ROUTE}, ${SECONDS} s: ${messages} messages, ${buses.size} buses, ${(bytes / 1024).toFixed(0)} KB`);
  console.log(`= ${(bytes / 1024 / SECONDS).toFixed(1)} KB/s, ${(bytes / Math.max(1, messages) / 1024).toFixed(1)} KB per message`);
  console.log(`grid cells seen: ${grids.size}; sample topic: ${sampleTopic}`);
  console.log('busiest cells:', [...grids].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g, n]) => `${g} (${n})`).join(', '));
  client.end(true, () => process.exit(0));
}, SECONDS * 1000);
