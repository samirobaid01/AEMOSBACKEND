const coap = require('coap');

const COAP_HOST = process.env.COAP_HOST || 'localhost';
const COAP_PORT = process.env.COAP_PORT || 5683;
const DEVICE_UUID = process.env.DEVICE_UUID || '550e8400-e29b-41d4-a716-446655440000';

console.log('🚀 CoAP Client Example - Simple Request');
console.log('========================================\n');

const path = `/device/${DEVICE_UUID}/state`;

console.log(`📤 Sending GET request to: coap://${COAP_HOST}:${COAP_PORT}${path}\n`);

const req = coap.request({
  hostname: COAP_HOST,
  port: COAP_PORT,
  pathname: path,
  method: 'GET',
  confirmable: true
});

req.on('response', (res) => {
  console.log('✅ Response received:');
  console.log(`   Code: ${res.code}`);
  console.log(`   Content-Format: ${res.options[0]?.value || 'application/json'}`);
  
  try {
    const payload = JSON.parse(res.payload.toString());
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.log(`   Payload: ${res.payload.toString()}`);
  }
  
  console.log('\n✅ Request completed');
  process.exit(0);
});

req.on('error', (err) => {
  console.error('❌ CoAP Error:', err);
  process.exit(1);
});

req.end();

setTimeout(() => {
  console.log('⏱️  Request timeout - no response received');
  console.log('⚠️  Make sure:');
  console.log('   1. AEMOS backend is running');
  console.log('   2. CoAP service is enabled in features');
  console.log(`   3. CoAP server is listening on ${COAP_HOST}:${COAP_PORT}`);
  process.exit(1);
}, 10000);
