import mqtt from 'mqtt';

const client = mqtt.connect('wss://mqtt.tj.co.id:8084/mqtt', {
  protocolVersion: 4,
  clean: true,
  connectTimeout: 10000,
});

let count = 0;
const messages = [];

client.on('connect', () => {
  console.log('Connected! Subscribing to /mobile_armada/# ...');
  client.subscribe('/mobile_armada/#', { qos: 0 });
});

client.on('message', (topic, payload) => {
  count++;
  try {
    const data = JSON.parse(payload.toString());
    messages.push({ topic, data });
  } catch (err) {
    console.error('JSON parse error', err);
  }

  if (count >= 5) {
    client.end(true);
    for (const { topic, data } of messages) {
      console.log('==================================================');
      console.log('TOPIC:', topic);
      console.log('TOP-LEVEL KEYS:', Object.keys(data));
      // Redacted preview of fields
      const summary = {
        bus_body_no: data.bus_body_no,
        route_code: data.route_code,
        trip_id: data.trip_id,
        type: data.type,
        bus_type: data.bus_type,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        bearing: data.bearing,
        timestamp: data.timestamp,
        last_update: data.last_update,
        direction: data.direction,
        next_gate: data.next_gate,
        eta: data.eta
      };
      console.log('SUMMARY:', JSON.stringify(summary, null, 2));
    }
    process.exit(0);
  }
});

setTimeout(() => {
  client.end(true);
  process.exit(0);
}, 10000);
