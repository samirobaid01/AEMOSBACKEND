/**
 * Unit tests for MQTT Adapter
 */
const MQTTAdapter = require('../../src/adapters/mqttAdapter');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock validators
jest.mock('../../src/validators/dataStreamValidators', () => ({
  dataStreamSchema: {
    create: {
      validate: jest.fn()
    }
  }
}));

describe('MQTTAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeMessage', () => {
    it('should normalize valid JSON message', () => {
      const topic = 'devices/test-device/datastream';
      const payload = Buffer.from(JSON.stringify({ value: '25.6', telemetryDataId: 1 }));
      const client = { id: 'test-client', qos: 1 };

      const result = MQTTAdapter.normalizeMessage(topic, payload, client);

      expect(result).toEqual({
        protocol: 'mqtt',
        topic: 'devices/test-device/datastream',
        payload: { value: '25.6', telemetryDataId: 1 },
        timestamp: expect.any(Date),
        clientId: 'test-client',
        qos: 1
      });
    });

    it('should normalize string payload as value', () => {
      const topic = 'devices/test-device/datastream';
      const payload = Buffer.from('25.6');
      const client = { id: 'test-client', qos: 0 };

      const result = MQTTAdapter.normalizeMessage(topic, payload, client);

      expect(result).toEqual({
        protocol: 'mqtt',
        topic: 'devices/test-device/datastream',
        payload: { value: '25.6' },
        timestamp: expect.any(Date),
        clientId: 'test-client',
        qos: 0
      });
    });

    it('should handle missing client', () => {
      const topic = 'devices/test-device/datastream';
      const payload = Buffer.from(JSON.stringify({ value: '25.6' }));

      const result = MQTTAdapter.normalizeMessage(topic, payload);

      expect(result.clientId).toBe('unknown');
      expect(result.qos).toBe(0);
    });

    it('should throw error for invalid payload', () => {
      const topic = 'devices/test-device/datastream';
      const payload = null;

      expect(() => {
        MQTTAdapter.normalizeMessage(topic, payload);
      }).toThrow('Invalid MQTT message format');
    });
  });

  describe('validateMessage', () => {
    it('should validate valid message', () => {
      const message = {
        topic: 'devices/test-device/datastream',
        payload: { value: '25.6', telemetryDataId: 1 }
      };

      const result = MQTTAdapter.validateMessage(message);

      expect(result).toBe(true);
    });

    it('should reject message without topic', () => {
      const message = {
        payload: { value: '25.6' }
      };

      const result = MQTTAdapter.validateMessage(message);

      expect(result).toBe(false);
    });

    it('should reject message without payload', () => {
      const message = {
        topic: 'devices/test-device/datastream'
      };

      const result = MQTTAdapter.validateMessage(message);

      expect(result).toBe(false);
    });

    it('should reject null message', () => {
      const result = MQTTAdapter.validateMessage(null);

      expect(result).toBe(false);
    });
  });

  describe('isValidTopic', () => {
    it('should validate valid topics', () => {
      const validTopics = [
        'devices/test-device/datastream',
        'devices/device-123/status',
        'organizations/org-456/broadcast',
        'devices/device_123/commands'
      ];

      validTopics.forEach(topic => {
        expect(MQTTAdapter.isValidTopic(topic)).toBe(true);
      });
    });

    it('should reject invalid topics', () => {
      const invalidTopics = [
        null,
        undefined,
        '',
        'devices/test device/datastream', // space
        'devices/test@device/datastream', // special char
        'devices/test.device/datastream'  // dot
      ];

      invalidTopics.forEach(topic => {
        expect(MQTTAdapter.isValidTopic(topic)).toBe(false);
      });
    });
  });

  describe('validateDataStreamPayload', () => {
    it('should validate valid data stream payload', () => {
      const { dataStreamSchema } = require('../../src/validators/dataStreamValidators');
      dataStreamSchema.create.validate.mockReturnValue({ error: null });

      const payload = { value: '25.6', telemetryDataId: 1 };
      const result = MQTTAdapter.validateDataStreamPayload(payload);

      expect(result).toBe(true);
      expect(dataStreamSchema.create.validate).toHaveBeenCalledWith(payload);
    });

    it('should reject invalid data stream payload', () => {
      const { dataStreamSchema } = require('../../src/validators/dataStreamValidators');
      dataStreamSchema.create.validate.mockReturnValue({ error: { message: 'Invalid payload' } });

      const payload = { invalid: 'data' };
      const result = MQTTAdapter.validateDataStreamPayload(payload);

      expect(result).toBe(false);
    });
  });

  describe('extractDeviceUuid', () => {
    it('should extract device UUID from valid topic', () => {
      const topic = 'devices/test-device-123/datastream';
      const result = MQTTAdapter.extractDeviceUuid(topic);

      expect(result).toBe('test-device-123');
    });

    it('should return null for invalid topic format', () => {
      const invalidTopics = [
        'invalid/topic/format',
        'devices',
        'devices/',
        'other/test-device/datastream'
      ];

      invalidTopics.forEach(topic => {
        const result = MQTTAdapter.extractDeviceUuid(topic);
        expect(result).toBeNull();
      });
    });

    it('should handle null topic', () => {
      const result = MQTTAdapter.extractDeviceUuid(null);
      expect(result).toBeNull();
    });
  });

  describe('extractOrganizationId', () => {
    it('should extract organization ID from valid topic', () => {
      const topic = 'organizations/org-456/broadcast';
      const result = MQTTAdapter.extractOrganizationId(topic);

      expect(result).toBe('org-456');
    });

    it('should return null for invalid topic format', () => {
      const invalidTopics = [
        'invalid/topic/format',
        'organizations',
        'organizations/',
        'other/org-456/broadcast'
      ];

      invalidTopics.forEach(topic => {
        const result = MQTTAdapter.extractOrganizationId(topic);
        expect(result).toBeNull();
      });
    });
  });

  describe('getMessageType', () => {
    it('should identify data stream messages', () => {
      const topic = 'devices/test-device/datastream';
      const result = MQTTAdapter.getMessageType(topic);

      expect(result).toBe('dataStream');
    });

    it('should identify device status messages', () => {
      const topic = 'devices/test-device/status';
      const result = MQTTAdapter.getMessageType(topic);

      expect(result).toBe('deviceStatus');
    });

    it('should identify command messages', () => {
      const topic = 'devices/test-device/commands';
      const result = MQTTAdapter.getMessageType(topic);

      expect(result).toBe('commands');
    });

    it('should identify broadcast messages', () => {
      const topic = 'organizations/org-123/broadcast';
      const result = MQTTAdapter.getMessageType(topic);

      expect(result).toBe('broadcast');
    });

    it('should return unknown for unrecognized topics', () => {
      const topic = 'devices/test-device/unknown';
      const result = MQTTAdapter.getMessageType(topic);

      expect(result).toBe('unknown');
    });
  });
}); 