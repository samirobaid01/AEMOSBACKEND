/**
 * Unit tests for Message Router Service
 */
const MessageRouter = require('../../src/services/messageRouter');

// Mock dependencies
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../../src/adapters/commonAdapter', () => ({
  validateMessage: jest.fn(),
  transformMessage: jest.fn(),
  createErrorResponse: jest.fn(),
  createSuccessResponse: jest.fn(),
  logMessageProcessing: jest.fn()
}));

jest.mock('../../src/adapters/mqttAdapter', () => ({
  getMessageType: jest.fn(),
  extractDeviceUuid: jest.fn(),
  extractOrganizationId: jest.fn()
}));

jest.mock('../../src/controllers/dataStreamController', () => ({
  createDataStreamWithToken: jest.fn()
}));

jest.mock('../../src/controllers/deviceController', () => ({
  updateDevice: jest.fn()
}));

jest.mock('../../src/models/initModels', () => ({
  DeviceToken: {
    findOne: jest.fn()
  }
}));

describe('MessageRouter', () => {
  let messageRouter;
  let CommonAdapter;
  let MQTTAdapter;
  let dataStreamController;
  let deviceController;
  let DeviceToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get fresh instances of mocked modules
    CommonAdapter = require('../../src/adapters/commonAdapter');
    MQTTAdapter = require('../../src/adapters/mqttAdapter');
    dataStreamController = require('../../src/controllers/dataStreamController');
    deviceController = require('../../src/controllers/deviceController');
    DeviceToken = require('../../src/models/initModels').DeviceToken;
    
    // Reset the singleton instance
    jest.resetModules();
    messageRouter = require('../../src/services/messageRouter');
  });

  describe('route', () => {
    it('should route valid data stream message', async () => {
      const message = {
        protocol: 'mqtt',
        topic: 'devices/test-device/datastream',
        payload: { value: '25.6', telemetryDataId: 1 },
        timestamp: new Date()
      };

      // Mock validation
      CommonAdapter.validateMessage.mockReturnValue({ isValid: true, errors: [] });
      CommonAdapter.transformMessage.mockReturnValue(message);
      CommonAdapter.createSuccessResponse.mockReturnValue({ status: 'success' });

      // Mock message type detection
      MQTTAdapter.getMessageType.mockReturnValue('dataStream');
      MQTTAdapter.extractDeviceUuid.mockReturnValue('test-device');

      // Mock device authentication
      DeviceToken.findOne.mockResolvedValue({
        Device: { id: 1, sensorId: 1, status: 'active' }
      });

      // Mock controller response
      dataStreamController.createDataStreamWithToken.mockResolvedValue({
        statusCode: 201,
        data: { id: 1, value: '25.6' }
      });

      const result = await messageRouter.route(message);

      expect(result.status).toBe('success');
      expect(CommonAdapter.validateMessage).toHaveBeenCalledWith(message);
      expect(CommonAdapter.transformMessage).toHaveBeenCalledWith(message);
      expect(MQTTAdapter.getMessageType).toHaveBeenCalledWith(message);
    });

    it('should handle validation errors', async () => {
      const message = { invalid: 'message' };

      // Mock validation failure
      CommonAdapter.validateMessage.mockReturnValue({ 
        isValid: false, 
        errors: ['Protocol is required'] 
      });
      CommonAdapter.createErrorResponse.mockReturnValue({ 
        status: 'error', 
        message: 'Protocol is required' 
      });

      const result = await messageRouter.route(message);

      expect(result.status).toBe('error');
      expect(CommonAdapter.validateMessage).toHaveBeenCalledWith(message);
      expect(CommonAdapter.createErrorResponse).toHaveBeenCalledWith('Protocol is required', 'VALIDATION_ERROR');
    });

    it('should handle unknown message types', async () => {
      const message = {
        protocol: 'mqtt',
        topic: 'unknown/topic',
        payload: { value: '25.6' },
        timestamp: new Date()
      };

      // Mock validation success
      CommonAdapter.validateMessage.mockReturnValue({ isValid: true, errors: [] });
      CommonAdapter.transformMessage.mockReturnValue(message);
      CommonAdapter.createErrorResponse.mockReturnValue({ 
        status: 'error', 
        message: 'Unknown message type: unknown' 
      });

      // Mock unknown message type
      MQTTAdapter.getMessageType.mockReturnValue('unknown');

      const result = await messageRouter.route(message);

      expect(result.status).toBe('error');
      expect(CommonAdapter.createErrorResponse).toHaveBeenCalledWith('Unknown message type: unknown', 'UNKNOWN_MESSAGE_TYPE');
    });

    it('should handle routing errors', async () => {
      const message = {
        protocol: 'mqtt',
        topic: 'devices/test-device/datastream',
        payload: { value: '25.6' },
        timestamp: new Date()
      };

      // Mock validation success
      CommonAdapter.validateMessage.mockReturnValue({ isValid: true, errors: [] });
      CommonAdapter.transformMessage.mockReturnValue(message);
      CommonAdapter.createErrorResponse.mockReturnValue({ 
        status: 'error', 
        message: 'Routing error: Test error' 
      });

      // Mock message type detection
      MQTTAdapter.getMessageType.mockReturnValue('dataStream');

      // Mock handler to throw error
      jest.spyOn(messageRouter, 'handleDataStream').mockRejectedValue(new Error('Test error'));

      const result = await messageRouter.route(message);

      expect(result.status).toBe('error');
      expect(CommonAdapter.createErrorResponse).toHaveBeenCalledWith('Routing error: Test error', 'ROUTING_ERROR');
    });
  });

  describe('getMessageType', () => {
    it('should return MQTT message type for MQTT protocol', () => {
      const message = {
        protocol: 'mqtt',
        topic: 'devices/test/datastream'
      };

      MQTTAdapter.getMessageType.mockReturnValue('dataStream');

      const result = messageRouter.getMessageType(message);

      expect(result).toBe('dataStream');
      expect(MQTTAdapter.getMessageType).toHaveBeenCalledWith('devices/test/datastream');
    });

    it('should return HTTP message type for HTTP protocol', () => {
      const message = {
        protocol: 'http',
        path: '/api/v1/datastreams'
      };

      const result = messageRouter.getMessageType(message);

      expect(result).toBe('dataStream');
    });

    it('should return unknown for unrecognized protocol', () => {
      const message = {
        protocol: 'unknown',
        topic: 'test/topic'
      };

      const result = messageRouter.getMessageType(message);

      expect(result).toBe('unknown');
    });
  });

  describe('handleDataStream', () => {
    it('should handle valid data stream message', async () => {
      const message = {
        topic: 'devices/test-device/datastream',
        payload: { value: '25.6', telemetryDataId: 1, token: 'valid-token' }
      };

      // Mock device UUID extraction
      MQTTAdapter.extractDeviceUuid.mockReturnValue('test-device');

      // Mock device authentication
      DeviceToken.findOne.mockResolvedValue({
        Device: { id: 1, sensorId: 1, status: 'active' }
      });

      // Mock controller response
      dataStreamController.createDataStreamWithToken.mockResolvedValue({
        statusCode: 201,
        data: { id: 1, value: '25.6' }
      });

      CommonAdapter.createSuccessResponse.mockReturnValue({ status: 'success' });

      const result = await messageRouter.handleDataStream(message);

      expect(result.status).toBe('success');
      expect(MQTTAdapter.extractDeviceUuid).toHaveBeenCalledWith('devices/test-device/datastream');
      expect(DeviceToken.findOne).toHaveBeenCalledWith({
        where: { 
          token: 'valid-token',
          deviceUuid: 'test-device'
        },
        include: ['Device']
      });
    });

    it('should handle invalid device UUID', async () => {
      const message = {
        topic: 'invalid/topic',
        payload: { value: '25.6' }
      };

      // Mock device UUID extraction failure
      MQTTAdapter.extractDeviceUuid.mockReturnValue(null);
      CommonAdapter.createErrorResponse.mockReturnValue({ 
        status: 'error', 
        message: 'Invalid device UUID in topic' 
      });

      const result = await messageRouter.handleDataStream(message);

      expect(result.status).toBe('error');
      expect(CommonAdapter.createErrorResponse).toHaveBeenCalledWith('Invalid device UUID in topic', 'INVALID_DEVICE_UUID');
    });

    it('should handle authentication failure', async () => {
      const message = {
        topic: 'devices/test-device/datastream',
        payload: { value: '25.6', token: 'invalid-token' }
      };

      // Mock device UUID extraction
      MQTTAdapter.extractDeviceUuid.mockReturnValue('test-device');

      // Mock authentication failure
      DeviceToken.findOne.mockResolvedValue(null);
      CommonAdapter.createErrorResponse.mockReturnValue({ 
        status: 'error', 
        message: 'Device authentication failed' 
      });

      const result = await messageRouter.handleDataStream(message);

      expect(result.status).toBe('error');
      expect(CommonAdapter.createErrorResponse).toHaveBeenCalledWith('Device authentication failed', 'AUTHENTICATION_FAILED');
    });
  });

  describe('handleDeviceStatus', () => {
    it('should handle valid device status message', async () => {
      const message = {
        topic: 'devices/test-device/status',
        payload: { status: 'online', token: 'valid-token' }
      };

      // Mock device UUID extraction
      MQTTAdapter.extractDeviceUuid.mockReturnValue('test-device');

      // Mock device authentication
      DeviceToken.findOne.mockResolvedValue({
        Device: { id: 1, status: 'active' }
      });

      // Mock controller response
      deviceController.updateDevice.mockResolvedValue({
        statusCode: 200,
        data: { id: 1, status: 'online' }
      });

      CommonAdapter.createSuccessResponse.mockReturnValue({ status: 'success' });

      const result = await messageRouter.handleDeviceStatus(message);

      expect(result.status).toBe('success');
      expect(deviceController.updateDevice).toHaveBeenCalled();
    });
  });

  describe('handleCommands', () => {
    it('should handle valid command message', async () => {
      const message = {
        topic: 'devices/test-device/commands',
        payload: { command: 'restart', token: 'valid-token' }
      };

      // Mock device UUID extraction
      MQTTAdapter.extractDeviceUuid.mockReturnValue('test-device');

      // Mock device authentication
      DeviceToken.findOne.mockResolvedValue({
        Device: { id: 1, status: 'active' }
      });

      CommonAdapter.createSuccessResponse.mockReturnValue({ status: 'success' });

      const result = await messageRouter.handleCommands(message);

      expect(result.status).toBe('success');
      expect(result.data.deviceUuid).toBe('test-device');
      expect(result.data.command).toEqual({ command: 'restart', token: 'valid-token' });
    });
  });

  describe('handleBroadcast', () => {
    it('should handle valid broadcast message', async () => {
      const message = {
        topic: 'organizations/org-123/broadcast',
        payload: { message: 'System maintenance' }
      };

      // Mock organization ID extraction
      MQTTAdapter.extractOrganizationId.mockReturnValue('org-123');

      CommonAdapter.createSuccessResponse.mockReturnValue({ status: 'success' });

      const result = await messageRouter.handleBroadcast(message);

      expect(result.status).toBe('success');
      expect(result.data.organizationId).toBe('org-123');
      expect(result.data.broadcast).toEqual({ message: 'System maintenance' });
    });

    it('should handle invalid organization ID', async () => {
      const message = {
        topic: 'invalid/topic',
        payload: { message: 'test' }
      };

      // Mock organization ID extraction failure
      MQTTAdapter.extractOrganizationId.mockReturnValue(null);
      CommonAdapter.createErrorResponse.mockReturnValue({ 
        status: 'error', 
        message: 'Invalid organization ID in topic' 
      });

      const result = await messageRouter.handleBroadcast(message);

      expect(result.status).toBe('error');
      expect(CommonAdapter.createErrorResponse).toHaveBeenCalledWith('Invalid organization ID in topic', 'INVALID_ORG_ID');
    });
  });

  describe('authenticateDevice', () => {
    it('should authenticate valid device token', async () => {
      const deviceUuid = 'test-device';
      const message = {
        payload: { token: 'valid-token' }
      };

      // Mock device token lookup
      DeviceToken.findOne.mockResolvedValue({
        Device: { id: 1, status: 'active' }
      });

      const result = await messageRouter.authenticateDevice(deviceUuid, message);

      expect(result).toEqual({ id: 1, status: 'active' });
      expect(DeviceToken.findOne).toHaveBeenCalledWith({
        where: { 
          token: 'valid-token',
          deviceUuid: 'test-device'
        },
        include: ['Device']
      });
    });

    it('should handle missing token', async () => {
      const deviceUuid = 'test-device';
      const message = {
        payload: {}
      };

      const result = await messageRouter.authenticateDevice(deviceUuid, message);

      expect(result).toBeNull();
    });

    it('should handle invalid token', async () => {
      const deviceUuid = 'test-device';
      const message = {
        payload: { token: 'invalid-token' }
      };

      // Mock device token lookup failure
      DeviceToken.findOne.mockResolvedValue(null);

      const result = await messageRouter.authenticateDevice(deviceUuid, message);

      expect(result).toBeNull();
    });

    it('should handle expired token', async () => {
      const deviceUuid = 'test-device';
      const message = {
        payload: { token: 'expired-token' }
      };

      // Mock expired token
      DeviceToken.findOne.mockResolvedValue({
        expiresAt: new Date('2020-01-01'),
        Device: { id: 1, status: 'active' }
      });

      const result = await messageRouter.authenticateDevice(deviceUuid, message);

      expect(result).toBeNull();
    });
  });
}); 