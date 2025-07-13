/**
 * Unit tests for MQTT Service
 */
const mqttService = require('../../src/services/mqttService');

// Mock dependencies
jest.mock('mqtt', () => ({
  createServer: jest.fn()
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../src/config', () => ({
  features: {
    mqtt: {
      enabled: true,
      port: 1883,
      host: '0.0.0.0',
      authentication: {
        enabled: true,
        tokenBased: true
      },
      qos: {
        default: 1,
        dataStream: 1
      }
    }
  }
}));

jest.mock('../../src/adapters/mqttAdapter', () => ({
  normalizeMessage: jest.fn(),
  validateMessage: jest.fn()
}));

jest.mock('../../src/services/messageRouter', () => ({
  route: jest.fn()
}));

jest.mock('../../src/models/initModels', () => ({
  DeviceToken: {
    findOne: jest.fn()
  }
}));

describe('MQTTService', () => {
  let mockServer;
  let mockClient;
  let mqttService;
  let MQTTAdapter;
  let messageRouter;
  let DeviceToken;
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get fresh instances of mocked modules
    MQTTAdapter = require('../../src/adapters/mqttAdapter');
    messageRouter = require('../../src/services/messageRouter');
    DeviceToken = require('../../src/models/initModels').DeviceToken;
    logger = require('../../src/utils/logger');
    
    // Mock MQTT server
    mockServer = {
      on: jest.fn(),
      listen: jest.fn(),
      close: jest.fn()
    };
    
    // Mock MQTT client
    mockClient = {
      id: 'test-client-id',
      on: jest.fn(),
      connack: jest.fn(),
      suback: jest.fn(),
      unsuback: jest.fn(),
      publish: jest.fn()
    };
    
    require('mqtt').createServer.mockReturnValue(mockServer);
    
    // Reset the singleton instance
    jest.resetModules();
    mqttService = require('../../src/services/mqttService');
  });

  describe('initialize', () => {
    it('should initialize MQTT server successfully', () => {
      const port = 1883;
      const host = '0.0.0.0';
      
      mqttService.initialize(port, host);
      
      expect(require('mqtt').createServer).toHaveBeenCalledWith({
        port: port,
        host: host
      });
      expect(mockServer.on).toHaveBeenCalledWith('client', expect.any(Function));
      expect(mockServer.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockServer.listen).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not initialize if already initialized', () => {
      // Set initialized flag
      mqttService.isInitialized = true;
      
      mqttService.initialize();
      
      expect(require('mqtt').createServer).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('MQTT server already initialized');
    });

    it('should handle initialization error', () => {
      const error = new Error('Initialization failed');
      require('mqtt').createServer.mockImplementation(() => {
        throw error;
      });
      
      expect(() => {
        mqttService.initialize();
      }).toThrow('Initialization failed');
      
      expect(logger.error).toHaveBeenCalledWith('Failed to initialize MQTT server: Initialization failed');
    });
  });

  describe('handleClientConnection', () => {
    beforeEach(() => {
      mqttService.initialize();
    });

    it('should handle client connection', () => {
      // Get the client handler function
      const clientHandler = mockServer.on.mock.calls.find(call => call[0] === 'client')[1];
      
      clientHandler(mockClient);
      
      expect(mqttService.clients.get('test-client-id')).toBe(mockClient);
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('publish', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('subscribe', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('unsubscribe', expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('MQTT client connected: test-client-id');
    });
  });

  describe('handleClientConnect', () => {
    beforeEach(() => {
      mqttService.initialize();
    });

    it('should authenticate client successfully', async () => {
      const packet = {
        username: 'test-device',
        password: 'valid-token'
      };
      
      // Mock authentication success
      DeviceToken.findOne.mockResolvedValue({
        id: 1,
        token: 'valid-token',
        deviceUuid: 'test-device'
      });
      
      // Get the connect handler function
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      
      await connectHandler(mockClient, packet);
      
      expect(mockClient.connack).toHaveBeenCalledWith({ returnCode: 0 });
      expect(logger.info).toHaveBeenCalledWith('MQTT client authenticated: test-client-id');
    });

    it('should reject unauthenticated client', async () => {
      const packet = {
        username: 'test-device',
        password: 'invalid-token'
      };
      
      // Mock authentication failure
      DeviceToken.findOne.mockResolvedValue(null);
      
      // Get the connect handler function
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      
      await connectHandler(mockClient, packet);
      
      expect(mockClient.connack).toHaveBeenCalledWith({ returnCode: 4 });
      expect(logger.warn).toHaveBeenCalledWith('Authentication failed for client: test-client-id');
    });

    it('should handle authentication error', async () => {
      const packet = {
        username: 'test-device',
        password: 'valid-token'
      };
      
      // Mock authentication error
      DeviceToken.findOne.mockRejectedValue(new Error('Database error'));
      
      // Get the connect handler function
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      
      await connectHandler(mockClient, packet);
      
      expect(mockClient.connack).toHaveBeenCalledWith({ returnCode: 4 });
      expect(logger.error).toHaveBeenCalledWith('Error handling client connect: Database error');
    });
  });

  describe('authenticateClient', () => {
    beforeEach(() => {
      mqttService.initialize();
    });

    it('should authenticate with valid token', async () => {
      const username = 'test-device';
      const password = 'valid-token';
      
      // Mock device token lookup
      DeviceToken.findOne.mockResolvedValue({
        id: 1,
        token: 'valid-token',
        deviceUuid: 'test-device'
      });
      
      const result = await mqttService.authenticateClient(mockClient, username, password);
      
      expect(result).toBe(true);
      expect(DeviceToken.findOne).toHaveBeenCalledWith({
        where: { 
          token: 'valid-token',
          deviceUuid: 'test-device'
        }
      });
      expect(mqttService.authenticatedClients.get('test-client-id')).toEqual({
        deviceUuid: 'test-device',
        token: 'valid-token',
        authenticatedAt: expect.any(Date)
      });
    });

    it('should reject missing credentials', async () => {
      const result = await mqttService.authenticateClient(mockClient, null, null);
      
      expect(result).toBe(false);
    });

    it('should reject expired token', async () => {
      const username = 'test-device';
      const password = 'expired-token';
      
      // Mock expired token
      DeviceToken.findOne.mockResolvedValue({
        id: 1,
        token: 'expired-token',
        deviceUuid: 'test-device',
        expiresAt: new Date('2020-01-01')
      });
      
      const result = await mqttService.authenticateClient(mockClient, username, password);
      
      expect(result).toBe(false);
    });

    it('should handle authentication error', async () => {
      const username = 'test-device';
      const password = 'valid-token';
      
      // Mock authentication error
      DeviceToken.findOne.mockRejectedValue(new Error('Database error'));
      
      const result = await mqttService.authenticateClient(mockClient, username, password);
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Error authenticating client: Database error');
    });
  });

  describe('handleClientDisconnect', () => {
    beforeEach(() => {
      mqttService.initialize();
      mqttService.clients.set('test-client-id', mockClient);
      mqttService.authenticatedClients.set('test-client-id', { deviceUuid: 'test-device' });
    });

    it('should handle client disconnect', () => {
      mqttService.handleClientDisconnect(mockClient);
      
      expect(mqttService.clients.has('test-client-id')).toBe(false);
      expect(mqttService.authenticatedClients.has('test-client-id')).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('MQTT client disconnected: test-client-id');
    });
  });

  describe('handlePublish', () => {
    beforeEach(() => {
      mqttService.initialize();
      mqttService.authenticatedClients.set('test-client-id', { deviceUuid: 'test-device' });
    });

    it('should handle valid publish message', async () => {
      const packet = {
        topic: 'devices/test-device/datastream',
        payload: Buffer.from(JSON.stringify({ value: '25.6' })),
        qos: 1,
        retain: false
      };
      
      const normalizedMessage = {
        protocol: 'mqtt',
        topic: 'devices/test-device/datastream',
        payload: { value: '25.6' },
        clientId: 'test-client-id',
        qos: 1
      };
      
      // Mock message processing
      MQTTAdapter.normalizeMessage.mockReturnValue(normalizedMessage);
      MQTTAdapter.validateMessage.mockReturnValue(true);
      messageRouter.route.mockResolvedValue({ status: 'success' });
      
      await mqttService.handlePublish(mockClient, packet);
      
      expect(MQTTAdapter.normalizeMessage).toHaveBeenCalledWith(
        'devices/test-device/datastream',
        packet.payload,
        { id: 'test-client-id', qos: 1 }
      );
      expect(MQTTAdapter.validateMessage).toHaveBeenCalledWith(normalizedMessage);
      expect(messageRouter.route).toHaveBeenCalledWith(normalizedMessage);
      expect(logger.debug).toHaveBeenCalledWith('MQTT message processed successfully: devices/test-device/datastream');
    });

    it('should reject unauthenticated client', async () => {
      // Remove client from authenticated clients
      mqttService.authenticatedClients.delete('test-client-id');
      
      const packet = {
        topic: 'devices/test-device/datastream',
        payload: Buffer.from('test'),
        qos: 1
      };
      
      await mqttService.handlePublish(mockClient, packet);
      
      expect(logger.warn).toHaveBeenCalledWith('Unauthenticated client test-client-id attempted to publish to devices/test-device/datastream');
      expect(MQTTAdapter.normalizeMessage).not.toHaveBeenCalled();
    });

    it('should handle invalid message', async () => {
      const packet = {
        topic: 'devices/test-device/datastream',
        payload: Buffer.from('invalid'),
        qos: 1
      };
      
      const normalizedMessage = {
        protocol: 'mqtt',
        topic: 'devices/test-device/datastream',
        payload: { value: 'invalid' }
      };
      
      // Mock message processing
      MQTTAdapter.normalizeMessage.mockReturnValue(normalizedMessage);
      MQTTAdapter.validateMessage.mockReturnValue(false);
      
      await mqttService.handlePublish(mockClient, packet);
      
      expect(logger.warn).toHaveBeenCalledWith('Invalid MQTT message from test-client-id: devices/test-device/datastream');
      expect(messageRouter.route).not.toHaveBeenCalled();
    });

    it('should handle message processing error', async () => {
      const packet = {
        topic: 'devices/test-device/datastream',
        payload: Buffer.from(JSON.stringify({ value: '25.6' })),
        qos: 1
      };
      
      const normalizedMessage = {
        protocol: 'mqtt',
        topic: 'devices/test-device/datastream',
        payload: { value: '25.6' }
      };
      
      // Mock message processing
      MQTTAdapter.normalizeMessage.mockReturnValue(normalizedMessage);
      MQTTAdapter.validateMessage.mockReturnValue(true);
      messageRouter.route.mockResolvedValue({ status: 'error', message: 'Processing failed' });
      
      await mqttService.handlePublish(mockClient, packet);
      
      expect(logger.warn).toHaveBeenCalledWith('MQTT message processing failed: devices/test-device/datastream - Processing failed');
    });
  });

  describe('handleSubscribe', () => {
    beforeEach(() => {
      mqttService.initialize();
      mqttService.authenticatedClients.set('test-client-id', { deviceUuid: 'test-device' });
    });

    it('should handle valid subscription', () => {
      const packet = {
        messageId: 1,
        subscriptions: [
          { topic: 'devices/test-device/datastream', qos: 1 },
          { topic: 'devices/test-device/status', qos: 2 }
        ]
      };
      
      mqttService.handleSubscribe(mockClient, packet);
      
      expect(mockClient.suback).toHaveBeenCalledWith({
        messageId: 1,
        granted: [
          { topic: 'devices/test-device/datastream', qos: 1 },
          { topic: 'devices/test-device/status', qos: 2 }
        ]
      });
    });

    it('should reject unauthenticated client subscription', () => {
      // Remove client from authenticated clients
      mqttService.authenticatedClients.delete('test-client-id');
      
      const packet = {
        messageId: 1,
        subscriptions: [{ topic: 'test/topic', qos: 1 }]
      };
      
      mqttService.handleSubscribe(mockClient, packet);
      
      expect(logger.warn).toHaveBeenCalledWith('Unauthenticated client test-client-id attempted to subscribe');
      expect(mockClient.suback).not.toHaveBeenCalled();
    });

    it('should limit QoS to maximum 2', () => {
      const packet = {
        messageId: 1,
        subscriptions: [
          { topic: 'test/topic', qos: 3 } // QoS 3 should be limited to 2
        ]
      };
      
      mqttService.handleSubscribe(mockClient, packet);
      
      expect(mockClient.suback).toHaveBeenCalledWith({
        messageId: 1,
        granted: [
          { topic: 'test/topic', qos: 2 }
        ]
      });
    });
  });

  describe('handleUnsubscribe', () => {
    beforeEach(() => {
      mqttService.initialize();
    });

    it('should handle unsubscribe', () => {
      const packet = {
        messageId: 1,
        unsubscriptions: ['devices/test-device/datastream']
      };
      
      mqttService.handleUnsubscribe(mockClient, packet);
      
      expect(mockClient.unsuback).toHaveBeenCalledWith({
        messageId: 1
      });
    });
  });

  describe('publish', () => {
    beforeEach(() => {
      mqttService.initialize();
      mqttService.clients.set('client1', mockClient);
      mqttService.clients.set('client2', { ...mockClient, id: 'client2' });
    });

    it('should publish message to all clients', () => {
      const topic = 'devices/test-device/commands';
      const payload = { command: 'restart' };
      const options = { qos: 2, retain: true };
      
      mqttService.publish(topic, payload, options);
      
      expect(mockClient.publish).toHaveBeenCalledWith({
        topic: 'devices/test-device/commands',
        payload: JSON.stringify({ command: 'restart' }),
        qos: 2,
        retain: true
      });
    });

    it('should use default options when not provided', () => {
      const topic = 'devices/test-device/commands';
      const payload = { command: 'restart' };
      
      mqttService.publish(topic, payload);
      
      expect(mockClient.publish).toHaveBeenCalledWith({
        topic: 'devices/test-device/commands',
        payload: JSON.stringify({ command: 'restart' }),
        qos: 1,
        retain: false
      });
    });

    it('should handle publish error when not initialized', () => {
      mqttService.isInitialized = false;
      
      mqttService.publish('test/topic', { data: 'test' });
      
      expect(logger.error).toHaveBeenCalledWith('MQTT server not initialized');
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      mqttService.initialize();
      mqttService.clients.set('client1', {});
      mqttService.clients.set('client2', {});
      mqttService.authenticatedClients.set('client1', {});
    });

    it('should return server statistics', () => {
      const stats = mqttService.getStats();
      
      expect(stats).toEqual({
        isInitialized: true,
        connectedClients: 2,
        authenticatedClients: 1,
        port: 1883,
        host: '0.0.0.0'
      });
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      mqttService.initialize();
    });

    it('should stop MQTT server', () => {
      mqttService.stop();
      
      expect(mockServer.close).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle stop when server is null', () => {
      mqttService.server = null;
      
      expect(() => {
        mqttService.stop();
      }).not.toThrow();
    });
  });
}); 