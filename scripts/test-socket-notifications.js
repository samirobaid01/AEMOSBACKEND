/**
 * Standalone Socket Notification Test
 * 
 * Run this script to verify socket notifications are working.
 * Usage: node scripts/test-socket-notifications.js
 * 
 * Prerequisites:
 * - Server running on http://localhost:3000
 * - npm install socket.io-client (if not already installed)
 */

const { io } = require('socket.io-client');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_DURATION_MS = 60000; // 60 seconds

console.log('═══════════════════════════════════════════════════════');
console.log('🔌 Socket Notification Test');
console.log('═══════════════════════════════════════════════════════');
console.log(`Server: ${SERVER_URL}`);
console.log(`Duration: ${TEST_DURATION_MS / 1000}s`);
console.log('───────────────────────────────────────────────────────\n');

// Connect to Socket.IO server
const socket = io(SERVER_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

let eventCount = 0;
let deviceStateChangeCount = 0;

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}\n`);
  console.log('📡 Listening for events...\n');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('   Make sure the server is running on', SERVER_URL);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('\n⚠️  Disconnected:', reason);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
});

// Listen to ALL events
socket.onAny((eventName, data) => {
  eventCount++;
  
  console.log(`\n📨 Event #${eventCount}: "${eventName}"`);
  console.log('───────────────────────────────────────────────────────');
  
  // Check if it's a device-state-change event
  if (eventName === 'device-state-change') {
    deviceStateChangeCount++;
    console.log('✅ Device State Change Event');
    console.log(`   Device UUID: ${data.deviceUuid || 'N/A'}`);
    console.log(`   State Name: ${data.metadata?.stateName || 'N/A'}`);
    console.log(`   Old Value: ${data.metadata?.oldValue || 'N/A'}`);
    console.log(`   New Value: ${data.metadata?.newValue || 'N/A'}`);
    console.log(`   Priority: ${data.priority || 'N/A'}`);
    console.log(`   Message: ${data.message || 'N/A'}`);
  } else {
    console.log('📦 Other Event');
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
  
  console.log('───────────────────────────────────────────────────────');
});

// Specific listener for device-state-change
socket.on('device-state-change', (data) => {
  // Already logged via onAny, but you can add specific handling here
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total events received: ${eventCount}`);
  console.log(`Device state changes: ${deviceStateChangeCount}`);
  console.log('───────────────────────────────────────────────────────\n');
  
  if (eventCount === 0) {
    console.log('⚠️  No events received during test period.');
    console.log('   Possible reasons:');
    console.log('   - No device state changes occurred');
    console.log('   - No rule chains triggered');
    console.log('   - Server is not emitting socket events');
    console.log('\n   To trigger a test event, create a device state change:');
    console.log('   POST /api/v1/device-state-instances');
    console.log('   with payload: { deviceUuid, stateName, value }\n');
  } else {
    console.log('✅ Socket notifications are working!\n');
  }
  
  socket.disconnect();
  process.exit(0);
};

// Auto-shutdown after duration
setTimeout(() => {
  console.log(`\n⏰ Test duration (${TEST_DURATION_MS / 1000}s) reached.`);
  shutdown();
}, TEST_DURATION_MS);

// Handle manual interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user.');
  shutdown();
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Test terminated.');
  shutdown();
});

// Instructions
console.log('💡 Tips:');
console.log('   - Leave this script running');
console.log('   - Trigger a device state change from your app');
console.log('   - Or use the API: POST /api/v1/device-state-instances');
console.log('   - Press Ctrl+C to stop\n');
