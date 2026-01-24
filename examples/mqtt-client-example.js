const mqtt = require('mqtt');

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const DEVICE_UUID = process.env.DEVICE_UUID || '550e8400-e29b-41d4-a716-446655440000';

console.log('🚀 MQTT Client Example');
console.log('======================\n');
console.log(`Connecting to: mqtt://${MQTT_HOST}:${MQTT_PORT}`);
console.log(`Device UUID: ${DEVICE_UUID}\n`);

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: `test-client-${Date.now()}`,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
  keepalive: 60
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker\n');

  const topics = [
    `device/${DEVICE_UUID}/state`,
    `device/${DEVICE_UUID}/notifications`,
    `device/${DEVICE_UUID}/commands`,
    'devices/all/notifications'
  ];

  topics.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`✅ Subscribed to: ${topic}`);
      }
    });
  });

  console.log('\n📡 Listening for messages...\n');
});

client.on('message', (topic, message) => {
  console.log('📨 Message received:');
  console.log(`   Topic: ${topic}`);
  
  try {
    const parsed = JSON.parse(message.toString());
    console.log(`   Payload:`, JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log(`   Payload: ${message.toString()}`);
  }
  
  console.log('');
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error);
});

client.on('close', () => {
  console.log('⚠️  Connection closed');
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting...');
});

process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...');
  client.end();
  process.exit(0);
});

console.log('💡 Tip: Trigger a device state change via API to see notifications');
console.log('   Example: POST /api/v1/device-state-instances');
console.log('   Body: {');
console.log(`     "deviceUuid": "${DEVICE_UUID}",`);
console.log('     "stateName": "temperature",');
console.log('     "value": "25",');
console.log('     "initiatedBy": "user"');
console.log('   }\n');
