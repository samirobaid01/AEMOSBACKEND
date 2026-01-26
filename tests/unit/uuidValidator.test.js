const { validateUUID, validateRuleChainConfig } = require('../../src/utils/uuidValidator');

describe('UUID Validator', () => {
  describe('validateUUID', () => {
    test('should validate valid UUID v4', () => {
      const result = validateUUID('550e8400-e29b-41d4-a716-446655440000');
      expect(result.valid).toBe(true);
    });

    test('should validate UUID v4 with uppercase', () => {
      const result = validateUUID('550E8400-E29B-41D4-A716-446655440000');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid UUID format', () => {
      const result = validateUUID('not-a-uuid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid UUID format');
    });

    test('should reject empty string', () => {
      const result = validateUUID('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('UUID must be a non-empty string');
    });

    test('should reject whitespace-only string', () => {
      const result = validateUUID('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('UUID cannot be empty or whitespace only');
    });

    test('should reject null', () => {
      const result = validateUUID(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('UUID must be a non-empty string');
    });

    test('should reject undefined', () => {
      const result = validateUUID(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('UUID must be a non-empty string');
    });

    test('should reject non-string types', () => {
      const result = validateUUID(123);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('UUID must be a non-empty string');
    });

    test('should reject UUID v1 format', () => {
      const result = validateUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid UUID format');
    });
  });

  describe('validateRuleChainConfig - Filter Nodes', () => {
    test('should validate simple filter config with valid UUID', () => {
      const config = {
        sourceType: 'sensor',
        UUID: '550e8400-e29b-41d4-a716-446655440000',
        key: 'temperature',
        operator: '>',
        value: 30
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate filter config with lowercase uuid field', () => {
      const config = {
        sourceType: 'sensor',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        key: 'temperature',
        operator: '>',
        value: 30
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(true);
    });

    test('should validate filter config with sensorUUID field', () => {
      const config = {
        sourceType: 'sensor',
        sensorUUID: '550e8400-e29b-41d4-a716-446655440000',
        key: 'temperature',
        operator: '>',
        value: 30
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(true);
    });

    test('should validate filter config with deviceUUID field', () => {
      const config = {
        sourceType: 'device',
        deviceUUID: '550e8400-e29b-41d4-a716-446655440000',
        key: 'status',
        operator: '==',
        value: 'active'
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(true);
    });

    test('should reject filter config with invalid UUID', () => {
      const config = {
        sourceType: 'sensor',
        UUID: 'invalid-uuid',
        key: 'temperature',
        operator: '>',
        value: 30
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('config.UUID');
      expect(result.errors[0].value).toBe('invalid-uuid');
    });

    test('should validate nested AND expression', () => {
      const config = {
        type: 'AND',
        expressions: [
          {
            sourceType: 'sensor',
            UUID: '550e8400-e29b-41d4-a716-446655440000',
            key: 'temperature',
            operator: '>',
            value: 30
          },
          {
            sourceType: 'device',
            UUID: '660e8400-e29b-41d4-a716-446655440001',
            key: 'status',
            operator: '==',
            value: 'active'
          }
        ]
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(true);
    });

    test('should validate nested OR expression', () => {
      const config = {
        type: 'OR',
        expressions: [
          {
            sourceType: 'sensor',
            UUID: '550e8400-e29b-41d4-a716-446655440000',
            key: 'temperature',
            operator: '>',
            value: 30
          },
          {
            sourceType: 'sensor',
            UUID: '660e8400-e29b-41d4-a716-446655440001',
            key: 'humidity',
            operator: '<',
            value: 50
          }
        ]
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(true);
    });

    test('should reject nested expression with invalid UUID', () => {
      const config = {
        type: 'AND',
        expressions: [
          {
            sourceType: 'sensor',
            UUID: 'invalid-uuid',
            key: 'temperature',
            operator: '>',
            value: 30
          }
        ]
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('config.expressions[0].UUID');
    });

    test('should handle deeply nested expressions', () => {
      const config = {
        type: 'AND',
        expressions: [
          {
            type: 'OR',
            expressions: [
              {
                sourceType: 'sensor',
                UUID: '550e8400-e29b-41d4-a716-446655440000',
                key: 'temperature',
                operator: '>',
                value: 30
              },
              {
                sourceType: 'sensor',
                UUID: '660e8400-e29b-41d4-a716-446655440001',
                key: 'humidity',
                operator: '<',
                value: 50
              }
            ]
          }
        ]
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(true);
    });

    test('should reject deeply nested expression with invalid UUID', () => {
      const config = {
        type: 'AND',
        expressions: [
          {
            type: 'OR',
            expressions: [
              {
                sourceType: 'sensor',
                UUID: 'invalid-uuid',
                key: 'temperature',
                operator: '>',
                value: 30
              }
            ]
          }
        ]
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBe('config.expressions[0].expressions[0].UUID');
    });

    test('should handle null config', () => {
      const result = validateRuleChainConfig(null, 'filter');
      expect(result.valid).toBe(true);
    });

    test('should handle empty config object', () => {
      const result = validateRuleChainConfig({}, 'filter');
      expect(result.valid).toBe(true);
    });

    test('should reject non-object config', () => {
      const result = validateRuleChainConfig('not-an-object', 'filter');
      expect(result.valid).toBe(false);
      expect(result.errors[0].error).toContain('Config must be an object');
    });
  });

  describe('validateRuleChainConfig - Action Nodes', () => {
    test('should validate action config with valid device UUID', () => {
      const config = {
        type: 'device_command',
        command: {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          value: 'on'
        }
      };
      const result = validateRuleChainConfig(config, 'action');
      expect(result.valid).toBe(true);
    });

    test('should reject action config with invalid device UUID', () => {
      const config = {
        type: 'device_command',
        command: {
          deviceUuid: 'invalid-uuid',
          value: 'on'
        }
      };
      const result = validateRuleChainConfig(config, 'action');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('config.command.deviceUuid');
      expect(result.errors[0].value).toBe('invalid-uuid');
    });

    test('should handle action config without deviceUuid', () => {
      const config = {
        type: 'device_command',
        command: {
          value: 'on'
        }
      };
      const result = validateRuleChainConfig(config, 'action');
      expect(result.valid).toBe(true);
    });

    test('should handle action config without command', () => {
      const config = {
        type: 'device_command'
      };
      const result = validateRuleChainConfig(config, 'action');
      expect(result.valid).toBe(true);
    });

    test('should handle null deviceUuid', () => {
      const config = {
        type: 'device_command',
        command: {
          deviceUuid: null,
          value: 'on'
        }
      };
      const result = validateRuleChainConfig(config, 'action');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateRuleChainConfig - Edge Cases', () => {
    test('should handle transform node type (no UUID validation needed)', () => {
      const config = {
        type: 'multiply',
        factor: 2
      };
      const result = validateRuleChainConfig(config, 'transform');
      expect(result.valid).toBe(true);
    });

    test('should handle unknown node type', () => {
      const config = {
        someField: 'value'
      };
      const result = validateRuleChainConfig(config, 'unknown');
      expect(result.valid).toBe(true);
    });

    test('should validate multiple UUID fields in same config', () => {
      const config = {
        sourceType: 'sensor',
        UUID: '550e8400-e29b-41d4-a716-446655440000',
        sensorUUID: '660e8400-e29b-41d4-a716-446655440001',
        key: 'temperature',
        operator: '>',
        value: 30
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(true);
    });

    test('should reject if any UUID field is invalid', () => {
      const config = {
        sourceType: 'sensor',
        UUID: '550e8400-e29b-41d4-a716-446655440000',
        sensorUUID: 'invalid-uuid',
        key: 'temperature',
        operator: '>',
        value: 30
      };
      const result = validateRuleChainConfig(config, 'filter');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('config.sensorUUID');
    });
  });
});
