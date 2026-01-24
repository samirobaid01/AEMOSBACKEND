const coap = require('coap');

const COAP_HOST = process.env.COAP_HOST || 'localhost';
const COAP_PORT = process.env.COAP_PORT || 5683;
const DEVICE_UUID = process.env.DEVICE_UUID || '550e8400-e29b-41d4-a716-446655440000';

console.log('🚀 CoAP Client Example - Observer');
console.log('==================================\n');
console.log(`Server: coap://${COAP_HOST}:${COAP_PORT}`);
console.log(`Device UUID: ${DEVICE_UUID}\n`);

const path = `/device/${DEVICE_UUID}/observe`;

console.log(`📡 Observing: ${path}\n`);

const req = coap.request({
  hostname: COAP_HOST,
  port: COAP_PORT,
  pathname: path,
  method: 'GET',
  observe: true,
  confirmable: true
});

let notificationCount = 0;

req.on('response', (res) => {
  notificationCount++;
  
  console.log(`📨 Notification #${notificationCount} received:`);
  console.log(`   Code: ${res.code}`);
  
  try {
    const payload = JSON.parse(res.payload.toString());
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.log(`   Payload: ${res.payload.toString()}`);
  }
  
  console.log('');
});

req.on('error', (err) => {
  console.error('❌ CoAP Error:', err);
});

req.end();

console.log('✅ Observe request sent');
console.log('⏳ Waiting for notifications...\n');
console.log('💡 Tip: Trigger a device state change via API to see CoAP notifications');
console.log('   Example: POST /api/v1/device-state-instances');
console.log('   Body: {');
console.log(`     "deviceUuid": "${DEVICE_UUID}",`);
console.log('     "stateName": "temperature",');
console.log('     "value": "25",');
console.log('     "initiatedBy": "user"');
console.log('   }\n');

process.on('SIGINT', () => {
  console.log('\n👋 Stopping observer...');
  req.close();
  process.exit(0);
});

setTimeout(() => {
  if (notificationCount === 0) {
    console.log('⚠️  No notifications received yet. Make sure:');
    console.log('   1. AEMOS backend is running');
    console.log('   2. CoAP service is enabled in features');
    console.log('   3. Device UUID exists in the system');
    console.log(`   4. CoAP server is listening on ${COAP_HOST}:${COAP_PORT}\n`);
  }
}, 5000);
