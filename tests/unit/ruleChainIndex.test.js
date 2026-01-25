const RuleChainIndex = require('../../src/ruleEngine/indexing/RuleChainIndex');
const redis = require('../../src/config/redis');
const sequelize = require('../../src/config/database');
const { QueryTypes } = require('sequelize');

jest.mock('../../src/config/redis');
jest.mock('../../src/config/database');
jest.mock('../../src/utils/logger');

describe('RuleChainIndex - Variable-Level Filtering with Sensor/Device Support', () => {
  let mockPipeline;
  let mockQuery;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPipeline = {
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 'OK']])
    };

    redis.pipeline = jest.fn().mockReturnValue(mockPipeline);
    redis.get = jest.fn().mockResolvedValue(null);
    redis.del = jest.fn().mockResolvedValue(1);
    redis.keys = jest.fn().mockResolvedValue([]);

    mockQuery = jest.fn();
    sequelize.query = mockQuery;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('buildIndexForOriginator', () => {
    it('should build variable-level index for sensor', async () => {
      mockQuery.mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' },
        { ruleChainId: 3, variableName: '"temperature"', sourceType: '"sensor"' },
        { ruleChainId: 2, variableName: '"humidity"', sourceType: '"sensor"' }
      ]);

      const result = await RuleChainIndex.buildIndexForOriginator('sensor', 'sensor-uuid-123');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.has('temperature')).toBe(true);
      expect(result.has('humidity')).toBe(true);
      expect([...result.get('temperature')]).toEqual(expect.arrayContaining([1, 3]));
      expect([...result.get('humidity')]).toEqual([2]);

      expect(mockPipeline.set).toHaveBeenCalledTimes(2);
      expect(mockPipeline.set).toHaveBeenCalledWith(
        'rulechain:var:sensor:sensor-uuid-123:temperature',
        JSON.stringify([1, 3]),
        'EX',
        3600
      );
      expect(mockPipeline.set).toHaveBeenCalledWith(
        'rulechain:var:sensor:sensor-uuid-123:humidity',
        JSON.stringify([2]),
        'EX',
        3600
      );
    });

    it('should build variable-level index for device', async () => {
      mockQuery.mockResolvedValue([
        { ruleChainId: 6, variableName: '"power"', sourceType: '"device"' },
        { ruleChainId: 7, variableName: '"power"', sourceType: '"device"' },
        { ruleChainId: 8, variableName: '"speed"', sourceType: '"device"' }
      ]);

      const result = await RuleChainIndex.buildIndexForOriginator('device', 'device-uuid-789');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.has('power')).toBe(true);
      expect(result.has('speed')).toBe(true);
      expect([...result.get('power')]).toEqual(expect.arrayContaining([6, 7]));
      expect([...result.get('speed')]).toEqual([8]);

      expect(mockPipeline.set).toHaveBeenCalledWith(
        'rulechain:var:device:device-uuid-789:power',
        JSON.stringify([6, 7]),
        'EX',
        3600
      );
    });

    it('should return empty Map for invalid originator type', async () => {
      const result = await RuleChainIndex.buildIndexForOriginator('invalid-type', 'some-uuid');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return empty Map for missing originatorId', async () => {
      const result = await RuleChainIndex.buildIndexForOriginator('sensor', null);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      const result = await RuleChainIndex.buildIndexForOriginator('sensor', 'sensor-uuid-123');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should strip quotes from variable names', async () => {
      mockQuery.mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' },
        { ruleChainId: 2, variableName: 'humidity', sourceType: '"sensor"' }
      ]);

      const result = await RuleChainIndex.buildIndexForOriginator('sensor', 'sensor-uuid-123');

      expect(result.has('temperature')).toBe(true);
      expect(result.has('humidity')).toBe(true);
      expect(result.has('"temperature"')).toBe(false);
    });
  });

  describe('getRuleChainsForOriginator', () => {
    it('should return rule chains from cache for sensor (cache hit)', async () => {
      redis.get = jest.fn()
        .mockResolvedValueOnce(JSON.stringify([1, 3]))
        .mockResolvedValueOnce(JSON.stringify([2]));

      const result = await RuleChainIndex.getRuleChainsForOriginator(
        'sensor',
        'sensor-uuid-123',
        ['temperature', 'humidity']
      );

      expect(result).toEqual(expect.arrayContaining([1, 2, 3]));
      expect(result.length).toBe(3);
      expect(redis.get).toHaveBeenCalledWith('rulechain:var:sensor:sensor-uuid-123:temperature');
      expect(redis.get).toHaveBeenCalledWith('rulechain:var:sensor:sensor-uuid-123:humidity');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return rule chains from cache for device (cache hit)', async () => {
      redis.get = jest.fn()
        .mockResolvedValueOnce(JSON.stringify([6, 7]))
        .mockResolvedValueOnce(JSON.stringify([8]));

      const result = await RuleChainIndex.getRuleChainsForOriginator(
        'device',
        'device-uuid-789',
        ['power', 'speed']
      );

      expect(result).toEqual(expect.arrayContaining([6, 7, 8]));
      expect(redis.get).toHaveBeenCalledWith('rulechain:var:device:device-uuid-789:power');
      expect(redis.get).toHaveBeenCalledWith('rulechain:var:device:device-uuid-789:speed');
    });

    it('should rebuild index on cache miss', async () => {
      redis.get = jest.fn().mockResolvedValue(null);
      mockQuery.mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' },
        { ruleChainId: 3, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const result = await RuleChainIndex.getRuleChainsForOriginator(
        'sensor',
        'sensor-uuid-123',
        ['temperature']
      );

      expect(result).toEqual(expect.arrayContaining([1, 3]));
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockPipeline.set).toHaveBeenCalled();
    });

    it('should return empty array when no variables provided', async () => {
      const result = await RuleChainIndex.getRuleChainsForOriginator(
        'sensor',
        'sensor-uuid-123',
        []
      );

      expect(result).toEqual([]);
      expect(redis.get).not.toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return empty array for invalid originator type', async () => {
      const result = await RuleChainIndex.getRuleChainsForOriginator(
        'invalid-type',
        'some-uuid',
        ['temperature']
      );

      expect(result).toEqual([]);
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should deduplicate rule chain IDs', async () => {
      redis.get = jest.fn()
        .mockResolvedValueOnce(JSON.stringify([1, 2, 3]))
        .mockResolvedValueOnce(JSON.stringify([2, 3, 4]));

      const result = await RuleChainIndex.getRuleChainsForOriginator(
        'sensor',
        'sensor-uuid-123',
        ['temperature', 'humidity']
      );

      expect(result).toEqual(expect.arrayContaining([1, 2, 3, 4]));
      expect(result.length).toBe(4);
    });

    it('should handle partial cache hits', async () => {
      redis.get = jest.fn()
        .mockResolvedValueOnce(JSON.stringify([1, 3]))
        .mockResolvedValueOnce(null);

      mockQuery.mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' },
        { ruleChainId: 2, variableName: '"humidity"', sourceType: '"sensor"' }
      ]);

      const result = await RuleChainIndex.getRuleChainsForOriginator(
        'sensor',
        'sensor-uuid-123',
        ['temperature', 'humidity']
      );

      expect(result).toEqual(expect.arrayContaining([1, 2, 3]));
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateOriginator', () => {
    it('should invalidate all variable indexes for sensor', async () => {
      redis.keys = jest.fn().mockResolvedValue([
        'rulechain:var:sensor:sensor-uuid-123:temperature',
        'rulechain:var:sensor:sensor-uuid-123:humidity',
        'rulechain:var:sensor:sensor-uuid-123:motion'
      ]);

      await RuleChainIndex.invalidateOriginator('sensor', 'sensor-uuid-123');

      expect(redis.keys).toHaveBeenCalledWith('rulechain:var:sensor:sensor-uuid-123:*');
      expect(redis.del).toHaveBeenCalledWith(
        'rulechain:var:sensor:sensor-uuid-123:temperature',
        'rulechain:var:sensor:sensor-uuid-123:humidity',
        'rulechain:var:sensor:sensor-uuid-123:motion'
      );
    });

    it('should invalidate all variable indexes for device', async () => {
      redis.keys = jest.fn().mockResolvedValue([
        'rulechain:var:device:device-uuid-789:power',
        'rulechain:var:device:device-uuid-789:speed'
      ]);

      await RuleChainIndex.invalidateOriginator('device', 'device-uuid-789');

      expect(redis.keys).toHaveBeenCalledWith('rulechain:var:device:device-uuid-789:*');
      expect(redis.del).toHaveBeenCalledWith(
        'rulechain:var:device:device-uuid-789:power',
        'rulechain:var:device:device-uuid-789:speed'
      );
    });

    it('should handle no keys to invalidate', async () => {
      redis.keys = jest.fn().mockResolvedValue([]);

      await RuleChainIndex.invalidateOriginator('sensor', 'sensor-uuid-123');

      expect(redis.keys).toHaveBeenCalled();
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should not invalidate for invalid originator type', async () => {
      await RuleChainIndex.invalidateOriginator('invalid-type', 'some-uuid');

      expect(redis.keys).not.toHaveBeenCalled();
      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('Convenience wrappers', () => {
    it('should call getRuleChainsForOriginator with sensor type', async () => {
      redis.get = jest.fn().mockResolvedValue(JSON.stringify([1, 2]));

      const result = await RuleChainIndex.getRuleChainsForSensor('sensor-uuid-123', ['temperature']);

      expect(result).toEqual([1, 2]);
      expect(redis.get).toHaveBeenCalledWith('rulechain:var:sensor:sensor-uuid-123:temperature');
    });

    it('should call getRuleChainsForOriginator with device type', async () => {
      redis.get = jest.fn().mockResolvedValue(JSON.stringify([6, 7]));

      const result = await RuleChainIndex.getRuleChainsForDevice('device-uuid-789', ['power']);

      expect(result).toEqual([6, 7]);
      expect(redis.get).toHaveBeenCalledWith('rulechain:var:device:device-uuid-789:power');
    });

    it('should call invalidateOriginator with sensor type', async () => {
      redis.keys = jest.fn().mockResolvedValue(['key1', 'key2']);

      await RuleChainIndex.invalidateSensor('sensor-uuid-123');

      expect(redis.keys).toHaveBeenCalledWith('rulechain:var:sensor:sensor-uuid-123:*');
    });

    it('should call invalidateOriginator with device type', async () => {
      redis.keys = jest.fn().mockResolvedValue(['key1']);

      await RuleChainIndex.invalidateDevice('device-uuid-789');

      expect(redis.keys).toHaveBeenCalledWith('rulechain:var:device:device-uuid-789:*');
    });
  });

  describe('Performance characteristics', () => {
    it('should handle large number of variables efficiently', async () => {
      const variables = Array.from({ length: 100 }, (_, i) => `variable_${i}`);
      redis.get = jest.fn().mockResolvedValue(JSON.stringify([1, 2, 3]));

      const startTime = Date.now();
      const result = await RuleChainIndex.getRuleChainsForOriginator(
        'sensor',
        'sensor-uuid-123',
        variables
      );
      const duration = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000);
      expect(redis.get).toHaveBeenCalledTimes(100);
    });

    it('should handle large number of rule chains', async () => {
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        ruleChainId: i + 1,
        variableName: '"temperature"',
        sourceType: '"sensor"'
      }));
      mockQuery.mockResolvedValue(mockData);

      const startTime = Date.now();
      const result = await RuleChainIndex.buildIndexForOriginator('sensor', 'sensor-uuid-123');
      const duration = Date.now() - startTime;

      expect(result.has('temperature')).toBe(true);
      expect([...result.get('temperature')].length).toBe(1000);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Edge cases', () => {
    it('should handle null variable names', async () => {
      mockQuery.mockResolvedValue([
        { ruleChainId: 1, variableName: null, sourceType: '"sensor"' },
        { ruleChainId: 2, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const result = await RuleChainIndex.buildIndexForOriginator('sensor', 'sensor-uuid-123');

      expect(result.size).toBe(1);
      expect(result.has('temperature')).toBe(true);
    });

    it('should handle empty string variable names', async () => {
      mockQuery.mockResolvedValue([
        { ruleChainId: 1, variableName: '""', sourceType: '"sensor"' },
        { ruleChainId: 2, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const result = await RuleChainIndex.buildIndexForOriginator('sensor', 'sensor-uuid-123');

      expect(result.size).toBe(1);
      expect(result.has('temperature')).toBe(true);
    });

    it('should handle Redis connection errors during get', async () => {
      redis.get = jest.fn().mockRejectedValue(new Error('Redis connection lost'));
      mockQuery.mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const result = await RuleChainIndex.getRuleChainsForOriginator(
        'sensor',
        'sensor-uuid-123',
        ['temperature']
      );

      expect(result).toEqual([1]);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should handle Redis connection errors during invalidate', async () => {
      redis.keys = jest.fn().mockRejectedValue(new Error('Redis connection lost'));

      await expect(
        RuleChainIndex.invalidateOriginator('sensor', 'sensor-uuid-123')
      ).resolves.not.toThrow();
    });
  });
});
