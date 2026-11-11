import mqtt from 'mqtt';

const client = mqtt.connect('wss://mqtt.tj.co.id:8084/mqtt', {
  protocolVersion: 4,
  clean: true,
});

const pings = new Map();
const dts = [];

client.on('connect', () => {
  client.subscribe('/mobile_armada/#', { qos: 0 });
});

client.on('message', (t, p) => {
  try {
    const d = JSON.parse(p.toString());
    const id = d.bus_body_no;
    const time = Number(d.timestamp);
    if (!id || !time) return;

    if (pings.has(id)) {
      const prev = pings.get(id);
      const dt = (time - prev) / 1000;
      if (dt > 0) {
        dts.push(dt);
      }
    }
    pings.set(id, time);
  } catch (e) {}
});

setTimeout(() => {
  client.end(true);
  console.log(`Captured ${dts.length} dt intervals.`);
  dts.sort((a, b) => a - b);
  console.log('dt min:', dts[0], 'p25:', dts[Math.floor(dts.length*0.25)], 'median:', dts[Math.floor(dts.length*0.5)], 'p75:', dts[Math.floor(dts.length*0.75)], 'max:', dts[dts.length - 1]);
  process.exit(0);
}, 10000);
