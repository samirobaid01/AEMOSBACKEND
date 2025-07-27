const mqtt = require('mqtt');

// Test MQTT client
const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: 'test-client-' + Date.now(),
  username: '5374f780-32fa-11f0-ad04-70f787be2478', // Device UUID
  password: '2e136e74b8b1122308ce6991482744804403f3258ac24aac369a5ac6068cd467' // Device token
});

client.on('connect', () => {
  console.log('✅ MQTT client connected successfully');
  
  // Subscribe to device topics
  client.subscribe('devices/5374f780-32fa-11f0-ad04-70f787be2478/#', (err) => {
    if (err) {
      console.error('❌ Subscribe error:', err);
    } else {
      console.log('✅ Subscribed to device topics');
    }
  });
  
  // Subscribe to organization topics
  client.subscribe('organizations/1/#', (err) => {
    if (err) {
      console.error('❌ Subscribe error:', err);
    } else {
      console.log('✅ Subscribed to organization topics');
    }
  });
  
  // Send a test data stream message
  setTimeout(() => {
    const testMessage = {
      value: 7.2,
      telemetryDataId: 1,
      timestamp: new Date().toISOString()
    };
    
    client.publish('devices/5374f780-32fa-11f0-ad04-70f787be2478/datastream', JSON.stringify(testMessage), (err) => {
      if (err) {
        console.error('❌ Publish error:', err);
      } else {
        console.log('✅ Test message published');
      }
    });
  }, 1000);
});

client.on('message', (topic, message) => {
  console.log(`📨 Received message on ${topic}:`, message.toString());
});

client.on('error', (error) => {
  console.error('❌ MQTT client error:', error);
});

client.on('close', () => {
  console.log('🔌 MQTT client disconnected');
});

// Keep the client running for 10 seconds
setTimeout(() => {
  client.end();
  console.log('🏁 Test completed');
}, 10000); 