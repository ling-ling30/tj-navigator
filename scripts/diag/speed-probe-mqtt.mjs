import mqtt from 'mqtt';

console.log('Testing MQTT connection to wss://mqtt.tj.co.id:8084/mqtt with topic /mobile_armada/# ...');

const client = mqtt.connect('wss://mqtt.tj.co.id:8084/mqtt', {
  protocolVersion: 4,
  clean: true,
  connectTimeout: 10000,
});

let messageCount = 0;
const startTime = Date.now();

client.on('connect', () => {
  console.log('Connected! Subscribing to /mobile_armada/# ...');
  client.subscribe('/mobile_armada/#', { qos: 0 }, (err) => {
    if (err) {
      console.error('Subscription error:', err);
      process.exit(1);
    } else {
      console.log('Subscribed successfully to /mobile_armada/#. Listening for messages...');
    }
  });
});

client.on('message', (topic, payload) => {
  messageCount++;
  if (messageCount <= 5) {
    console.log(`[MSG #${messageCount}] Topic: ${topic}`);
    try {
      const data = JSON.parse(payload.toString());
      console.log('Parsed JSON keys:', Object.keys(data));
      console.log('Sample payload:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Raw payload:', payload.toString().slice(0, 300));
    }
  }

  if (messageCount === 20) {
    console.log(`Received 20 messages in ${((Date.now() - startTime) / 1000).toFixed(1)}s! Disconnecting.`);
    client.end(true);
    process.exit(0);
  }
});

client.on('error', (err) => {
  console.error('MQTT error:', err);
});

setTimeout(() => {
  console.log(`Probe finished after 15s. Total messages: ${messageCount}`);
  client.end(true);
  process.exit(0);
}, 15000);
