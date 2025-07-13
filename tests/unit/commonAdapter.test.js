/**
 * Unit tests for Common Adapter
 */
const CommonAdapter = require('../../src/adapters/commonAdapter');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('CommonAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateMessage', () => {
    it('should validate complete message', () => {
      const message = {
        protocol: 'mqtt',
        timestamp: new Date(),
        payload: { value: '25.6' }
      };

      const result = CommonAdapter.validateMessage(message);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null message', () => {
      const result = CommonAdapter.validateMessage(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message is required');
    });

    it('should reject message without protocol', () => {
      const message = {
        timestamp: new Date(),
        payload: { value: '25.6' }
      };

      const result = CommonAdapter.validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Protocol is required');
    });

    it('should reject message without timestamp', () => {
      const message = {
        protocol: 'mqtt',
        payload: { value: '25.6' }
      };

      const result = CommonAdapter.validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timestamp is required');
    });

    it('should reject message without payload', () => {
      const message = {
        protocol: 'mqtt',
        timestamp: new Date()
      };

      const result = CommonAdapter.validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payload is required');
    });

    it('should collect multiple errors', () => {
      const message = {
        // Missing all required fields
      };

      const result = CommonAdapter.validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Protocol is required');
      expect(result.errors).toContain('Timestamp is required');
      expect(result.errors).toContain('Payload is required');
    });
  });

  describe('transformMessage', () => {
    it('should transform message with all fields', () => {
      const originalMessage = {
        protocol: 'mqtt',
        topic: 'devices/test/datastream',
        payload: { value: '25.6' },
        clientId: 'test-client',
        timestamp: new Date('2023-01-01T00:00:00Z')
      };

      const result = CommonAdapter.transformMessage(originalMessage);

      expect(result).toEqual({
        ...originalMessage,
        processedAt: expect.any(Date),
        metadata: {
          protocol: 'mqtt',
          source: 'test-client',
          version: '1.0'
        }
      });
    });

    it('should add default timestamp if missing', () => {
      const originalMessage = {
        protocol: 'mqtt',
        payload: { value: '25.6' }
      };

      const result = CommonAdapter.transformMessage(originalMessage);

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('should handle missing clientId', () => {
      const originalMessage = {
        protocol: 'mqtt',
        payload: { value: '25.6' }
      };

      const result = CommonAdapter.transformMessage(originalMessage);

      expect(result.metadata.source).toBe('unknown');
    });

    it('should throw error on transformation failure', () => {
      const invalidMessage = {
        protocol: 'mqtt',
        payload: { value: '25.6' },
        timestamp: 'invalid-date' // This will cause issues
      };

      expect(() => {
        CommonAdapter.transformMessage(invalidMessage);
      }).toThrow();
    });
  });

  describe('extractCommonFields', () => {
    it('should extract all common fields', () => {
      const message = {
        protocol: 'mqtt',
        topic: 'devices/test/datastream',
        payload: { value: '25.6' },
        clientId: 'test-client',
        timestamp: new Date(),
        extraField: 'should-be-ignored'
      };

      const result = CommonAdapter.extractCommonFields(message);

      expect(result).toEqual({
        protocol: 'mqtt',
        timestamp: message.timestamp,
        source: 'test-client',
        topic: 'devices/test/datastream',
        payload: { value: '25.6' }
      });
    });

    it('should handle missing optional fields', () => {
      const message = {
        protocol: 'mqtt',
        payload: { value: '25.6' }
      };

      const result = CommonAdapter.extractCommonFields(message);

      expect(result).toEqual({
        protocol: 'mqtt',
        timestamp: undefined,
        source: undefined,
        topic: undefined,
        payload: { value: '25.6' }
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with default code', () => {
      const message = 'Test error message';
      const result = CommonAdapter.createErrorResponse(message);

      expect(result).toEqual({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Test error message',
        timestamp: expect.any(Date)
      });
    });

    it('should create error response with custom code', () => {
      const message = 'Custom error message';
      const code = 'CUSTOM_ERROR';
      const result = CommonAdapter.createErrorResponse(message, code);

      expect(result).toEqual({
        status: 'error',
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response', () => {
      const data = { id: 1, value: '25.6' };
      const result = CommonAdapter.createSuccessResponse(data);

      expect(result).toEqual({
        status: 'success',
        data: { id: 1, value: '25.6' },
        timestamp: expect.any(Date)
      });
    });
  });

  describe('sanitizePayload', () => {
    it('should sanitize object payload', () => {
      const payload = {
        value: '  25.6  ',
        name: 'test',
        __dangerous: 'should-be-removed',
        $system: 'should-be-removed',
        normalField: 'normal'
      };

      const result = CommonAdapter.sanitizePayload(payload);

      expect(result).toEqual({
        value: '25.6',
        name: 'test',
        normalField: 'normal'
      });
    });

    it('should handle non-object payload', () => {
      const payload = 'simple string';
      const result = CommonAdapter.sanitizePayload(payload);

      expect(result).toBe(payload);
    });

    it('should handle null payload', () => {
      const result = CommonAdapter.sanitizePayload(null);

      expect(result).toBeNull();
    });

    it('should handle undefined payload', () => {
      const result = CommonAdapter.sanitizePayload(undefined);

      expect(result).toBeUndefined();
    });
  });

  describe('validateDeviceAuth', () => {
    it('should validate active device', () => {
      const message = { organizationId: 'org-123' };
      const device = {
        status: 'active',
        organizationId: 'org-123'
      };

      const result = CommonAdapter.validateDeviceAuth(message, device);

      expect(result).toBe(true);
    });

    it('should reject inactive device', () => {
      const message = { organizationId: 'org-123' };
      const device = {
        status: 'inactive',
        organizationId: 'org-123'
      };

      const result = CommonAdapter.validateDeviceAuth(message, device);

      expect(result).toBe(false);
    });

    it('should reject null device', () => {
      const message = { organizationId: 'org-123' };
      const result = CommonAdapter.validateDeviceAuth(message, null);

      expect(result).toBe(false);
    });

    it('should reject device with wrong organization', () => {
      const message = { organizationId: 'org-123' };
      const device = {
        status: 'active',
        organizationId: 'org-456'
      };

      const result = CommonAdapter.validateDeviceAuth(message, device);

      expect(result).toBe(false);
    });

    it('should accept device without organization check', () => {
      const message = {};
      const device = {
        status: 'active',
        organizationId: 'org-123'
      };

      const result = CommonAdapter.validateDeviceAuth(message, device);

      expect(result).toBe(true);
    });
  });

  describe('logMessageProcessing', () => {
    it('should log message processing', () => {
      const message = {
        protocol: 'mqtt',
        topic: 'devices/test/datastream',
        clientId: 'test-client'
      };
      const action = 'processed';

      CommonAdapter.logMessageProcessing(message, action);

      const logger = require('../../src/utils/logger');
      expect(logger.info).toHaveBeenCalledWith('Message processed: processed', {
        protocol: 'mqtt',
        topic: 'devices/test/datastream',
        source: 'test-client',
        action: 'processed'
      });
    });
  });
}); 