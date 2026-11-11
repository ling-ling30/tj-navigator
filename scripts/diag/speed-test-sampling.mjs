import mqtt from 'mqtt';

const client = mqtt.connect('wss://mqtt.tj.co.id:8084/mqtt', {
  protocolVersion: 4,
  clean: true,
  connectTimeout: 10000,
});

const vehicleHistory = new Map();
let totalMessages = 0;
let consecutiveUpdates = 0;

client.on('connect', () => {
  console.log('Connected! Subscribing to /mobile_armada/# ...');
  client.subscribe('/mobile_armada/#', { qos: 0 });
});

client.on('message', (topic, payload) => {
  totalMessages++;
  try {
    const data = JSON.parse(payload.toString());
    const id = data.bus_body_no;
    const lat = data.latitude;
    const lon = data.longitude;
    const time = Number(data.timestamp);

    if (id && lat && lon && time) {
      if (vehicleHistory.has(id)) {
        const prev = vehicleHistory.get(id);
        const dt = (time - prev.time) / 1000;
        if (dt > 0) {
          consecutiveUpdates++;
          if (consecutiveUpdates <= 10) {
            console.log(`Consecutive update for ${id} (Route: ${data.route_code}, Type: ${data.type}): dt = ${dt}s, prev: (${prev.lat}, ${prev.lon}), curr: (${lat}, ${lon})`);
          }
        }
      }
      vehicleHistory.set(id, { lat, lon, time, route: data.route_code, type: data.type });
    }
  } catch (err) {}
});

setTimeout(() => {
  console.log(`\n--- 30s Summary ---`);
  console.log(`Total messages received: ${totalMessages}`);
  console.log(`Unique vehicles seen: ${vehicleHistory.size}`);
  console.log(`Consecutive updates observed: ${consecutiveUpdates}`);
  client.end(true);
  process.exit(0);
}, 30000);
