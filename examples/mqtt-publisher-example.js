const mqtt = require('mqtt');

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const DEVICE_UUID = process.env.DEVICE_UUID || '550e8400-e29b-41d4-a716-446655440000';

console.log('🚀 MQTT Publisher Example');
console.log('=========================\n');

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: `test-publisher-${Date.now()}`,
  clean: true,
  connectTimeout: 4000
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker\n');

  const testPayload = {
    deviceUuid: DEVICE_UUID,
    stateName: 'temperature',
    value: Math.floor(Math.random() * 30) + 15,
    timestamp: new Date().toISOString()
  };

  const topic = `device/${DEVICE_UUID}/telemetry`;
  
  console.log(`📤 Publishing to: ${topic}`);
  console.log(`📦 Payload:`, JSON.stringify(testPayload, null, 2));

  client.publish(topic, JSON.stringify(testPayload), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Publish failed:', err);
    } else {
      console.log('\n✅ Message published successfully');
    }
    
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 1000);
  });
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error);
  process.exit(1);
});
