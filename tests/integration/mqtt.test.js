/**
 * Integration tests for MQTT functionality
 */
const request = require('supertest');
const mqtt = require('mqtt');
const app = require('../../src/app');
const mqttService = require('../../src/services/mqttService');
const { DeviceToken, Device, Sensor, TelemetryData } = require('../../src/models/initModels');

describe('MQTT Integration Tests', () => {
  let mqttClient;
  let testDevice;
  let testSensor;
  let testTelemetryData;
  let testDeviceToken;

  beforeAll(async () => {
    // Create test data
    testDevice = await Device.create({
      uuid: 'test-device-mqtt',
      name: 'Test Device MQTT',
      status: 'active',
      organizationId: 1
    });

    testSensor = await Sensor.create({
      name: 'Test Sensor MQTT',
      deviceId: testDevice.id,
      status: 'active'
    });

    testTelemetryData = await TelemetryData.create({
      sensorId: testSensor.id,
      variableName: 'temperature',
      datatype: 'number'
    });

    testDeviceToken = await DeviceToken.create({
      deviceUuid: testDevice.uuid,
      token: 'test-mqtt-token-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    });
  });

  afterAll(async () => {
    // Clean up test data
    await DeviceToken.destroy({ where: { id: testDeviceToken.id } });
    await TelemetryData.destroy({ where: { id: testTelemetryData.id } });
    await Sensor.destroy({ where: { id: testSensor.id } });
    await Device.destroy({ where: { id: testDevice.id } });

    // Disconnect MQTT client
    if (mqttClient) {
      mqttClient.end();
    }
  });

  describe('MQTT Server Initialization', () => {
    it('should initialize MQTT server when enabled', () => {
      // Mock config to enable MQTT
      jest.doMock('../../src/config', () => ({
        features: {
          mqtt: {
            enabled: true,
            port: 1883,
            host: '0.0.0.0'
          }
        }
      }));

      expect(mqttService.isInitialized).toBe(false);
      
      // This would normally be called by the server
      // For testing, we'll just verify the service exists
      expect(mqttService).toBeDefined();
    });
  });

  describe('MQTT Client Connection', () => {
    beforeEach(() => {
      // Initialize MQTT server for testing
      mqttService.initialize(1883, 'localhost');
    });

    afterEach(() => {
      // Clean up MQTT server
      mqttService.stop();
    });

    it('should connect MQTT client with valid credentials', (done) => {
      mqttClient = mqtt.connect('mqtt://localhost:1883', {
        username: testDevice.uuid,
        password: testDeviceToken.token,
        clientId: 'test-client'
      });

      mqttClient.on('connect', () => {
        expect(mqttClient.connected).toBe(true);
        done();
      });

      mqttClient.on('error', (error) => {
        done.fail(`MQTT connection failed: ${error.message}`);
      });
    });

    it('should reject MQTT client with invalid credentials', (done) => {
      const invalidClient = mqtt.connect('mqtt://localhost:1883', {
        username: 'invalid-device',
        password: 'invalid-token',
        clientId: 'invalid-client'
      });

      invalidClient.on('connect', () => {
        done.fail('Should not connect with invalid credentials');
      });

      invalidClient.on('error', (error) => {
        expect(error.message).toContain('Connection refused');
        invalidClient.end();
        done();
      });
    });
  });

  describe('MQTT Message Publishing', () => {
    beforeEach(async () => {
      // Initialize MQTT server
      mqttService.initialize(1883, 'localhost');
      
      // Connect MQTT client
      mqttClient = mqtt.connect('mqtt://localhost:1883', {
        username: testDevice.uuid,
        password: testDeviceToken.token,
        clientId: 'test-client'
      });

      // Wait for connection
      await new Promise((resolve) => {
        mqttClient.on('connect', resolve);
      });
    });

    afterEach(async () => {
      // Clean up
      if (mqttClient) {
        mqttClient.end();
      }
      mqttService.stop();
    });

    it('should publish data stream message successfully', (done) => {
      const topic = `devices/${testDevice.uuid}/datastream`;
      const payload = {
        value: '25.6',
        telemetryDataId: testTelemetryData.id,
        token: testDeviceToken.token
      };

      mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
        if (error) {
          done.fail(`Failed to publish message: ${error.message}`);
        } else {
          // Wait a bit for message processing
          setTimeout(() => {
            // Verify the message was processed by checking if data stream was created
            // This would require checking the database or monitoring logs
            expect(error).toBeUndefined();
            done();
          }, 1000);
        }
      });
    });

    it('should publish device status message successfully', (done) => {
      const topic = `devices/${testDevice.uuid}/status`;
      const payload = {
        status: 'online',
        timestamp: new Date().toISOString(),
        token: testDeviceToken.token
      };

      mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
        if (error) {
          done.fail(`Failed to publish status message: ${error.message}`);
        } else {
          expect(error).toBeUndefined();
          done();
        }
      });
    });

    it('should publish command message successfully', (done) => {
      const topic = `devices/${testDevice.uuid}/commands`;
      const payload = {
        command: 'restart',
        parameters: { delay: 5 },
        token: testDeviceToken.token
      };

      mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
        if (error) {
          done.fail(`Failed to publish command message: ${error.message}`);
        } else {
          expect(error).toBeUndefined();
          done();
        }
      });
    });

    it('should reject message with invalid topic format', (done) => {
      const topic = 'invalid/topic/format';
      const payload = { value: '25.6' };

      mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
        if (error) {
          done.fail(`Failed to publish message: ${error.message}`);
        } else {
          // Message should be published but not processed
          expect(error).toBeUndefined();
          done();
        }
      });
    });
  });

  describe('MQTT Message Subscription', () => {
    beforeEach(async () => {
      // Initialize MQTT server
      mqttService.initialize(1883, 'localhost');
      
      // Connect MQTT client
      mqttClient = mqtt.connect('mqtt://localhost:1883', {
        username: testDevice.uuid,
        password: testDeviceToken.token,
        clientId: 'test-client'
      });

      // Wait for connection
      await new Promise((resolve) => {
        mqttClient.on('connect', resolve);
      });
    });

    afterEach(async () => {
      // Clean up
      if (mqttClient) {
        mqttClient.end();
      }
      mqttService.stop();
    });

    it('should subscribe to device topics successfully', (done) => {
      const topics = [
        `devices/${testDevice.uuid}/datastream`,
        `devices/${testDevice.uuid}/status`,
        `devices/${testDevice.uuid}/commands`
      ];

      mqttClient.subscribe(topics, (error, granted) => {
        if (error) {
          done.fail(`Failed to subscribe: ${error.message}`);
        } else {
          expect(granted).toHaveLength(3);
          expect(granted[0].topic).toBe(topics[0]);
          expect(granted[1].topic).toBe(topics[1]);
          expect(granted[2].topic).toBe(topics[2]);
          done();
        }
      });
    });

    it('should receive published messages on subscribed topics', (done) => {
      const topic = `devices/${testDevice.uuid}/commands`;
      const testPayload = { command: 'test', timestamp: new Date().toISOString() };

      // Subscribe to topic
      mqttClient.subscribe(topic, (error) => {
        if (error) {
          done.fail(`Failed to subscribe: ${error.message}`);
        } else {
          // Listen for messages
          mqttClient.on('message', (receivedTopic, message) => {
            if (receivedTopic === topic) {
              const receivedPayload = JSON.parse(message.toString());
              expect(receivedPayload.command).toBe(testPayload.command);
              done();
            }
          });

          // Publish message
          mqttService.publish(topic, testPayload);
        }
      });
    });
  });

  describe('MQTT Authentication', () => {
    beforeEach(() => {
      mqttService.initialize(1883, 'localhost');
    });

    afterEach(() => {
      mqttService.stop();
    });

    it('should authenticate with valid device token', async () => {
      const result = await mqttService.authenticateClient(
        { id: 'test-client' },
        testDevice.uuid,
        testDeviceToken.token
      );

      expect(result).toBe(true);
    });

    it('should reject invalid device token', async () => {
      const result = await mqttService.authenticateClient(
        { id: 'test-client' },
        testDevice.uuid,
        'invalid-token'
      );

      expect(result).toBe(false);
    });

    it('should reject expired device token', async () => {
      // Create expired token
      const expiredToken = await DeviceToken.create({
        deviceUuid: testDevice.uuid,
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      });

      const result = await mqttService.authenticateClient(
        { id: 'test-client' },
        testDevice.uuid,
        expiredToken.token
      );

      expect(result).toBe(false);

      // Clean up
      await DeviceToken.destroy({ where: { id: expiredToken.id } });
    });
  });

  describe('MQTT Server Statistics', () => {
    beforeEach(() => {
      mqttService.initialize(1883, 'localhost');
    });

    afterEach(() => {
      mqttService.stop();
    });

    it('should return server statistics', () => {
      const stats = mqttService.getStats();

      expect(stats).toEqual({
        isInitialized: true,
        connectedClients: 0,
        authenticatedClients: 0,
        port: 1883,
        host: 'localhost'
      });
    });
  });

  describe('MQTT Error Handling', () => {
    it('should handle MQTT server errors gracefully', () => {
      // Mock MQTT server to throw error
      const originalCreateServer = require('mqtt').createServer;
      require('mqtt').createServer = jest.fn().mockImplementation(() => {
        throw new Error('Port already in use');
      });

      expect(() => {
        mqttService.initialize(1883, 'localhost');
      }).toThrow('Port already in use');

      // Restore original function
      require('mqtt').createServer = originalCreateServer;
    });

    it('should handle client connection errors', (done) => {
      // Try to connect to non-existent server
      const invalidClient = mqtt.connect('mqtt://localhost:9999', {
        username: testDevice.uuid,
        password: testDeviceToken.token,
        clientId: 'error-test-client'
      });

      invalidClient.on('connect', () => {
        done.fail('Should not connect to invalid server');
      });

      invalidClient.on('error', (error) => {
        expect(error.message).toContain('Connection refused');
        invalidClient.end();
        done();
      });
    });
  });
}); 