const mqtt = require('mqtt');

// Test batch data stream message
const batchMessage = {
  dataStreams: [
    {
      telemetryDataId: 1,
      value: "25.5",
      recievedAt: new Date().toISOString()
    },
    {
      telemetryDataId: 29,
      value: "30.2",
      recievedAt: new Date().toISOString()
    }
  ],
  token: "76a2cf882ce084f517850a80081bf8eb9c4e2ec2b0af38c75359d8033b663097"
};

const deviceUuid = '5374f780-32fa-11f0-ad04-70f787be2478';

// Connect to MQTT broker
const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: deviceUuid,
  username: deviceUuid,
  password: batchMessage.token,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
  keepalive: 60,
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker!');
  
  // Publish batch message
  const topic = `devices/${deviceUuid}/datastream`;
  const payload = JSON.stringify(batchMessage);
  
  client.publish(topic, payload, { qos: 1 }, (error) => {
    if (error) {
      console.error('❌ Failed to publish:', error);
    } else {
      console.log('✅ Batch message published successfully!');
      console.log('📦 Payload:', payload);
    }
    
    // Disconnect after publishing
    setTimeout(() => {
      client.end();
      console.log('🔌 Disconnected from MQTT broker');
    }, 1000);
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT error:', err);
});

client.on('close', () => {
  console.log('🔴 MQTT connection closed');
}); 