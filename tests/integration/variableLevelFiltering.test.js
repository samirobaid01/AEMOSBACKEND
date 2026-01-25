const RuleChainIndex = require('../../src/ruleEngine/indexing/RuleChainIndex');
const RuleEngineEventBus = require('../../src/ruleEngine/core/RuleEngineEventBus');
const redis = require('../../src/config/redis');
const sequelize = require('../../src/config/database');
const TelemetryData = require('../../src/models/TelemetryData');
const DeviceState = require('../../src/models/DeviceState');
const RuleChainNode = require('../../src/models/RuleChainNode');

jest.setTimeout(30000);

describe('Integration: Variable-Level Filtering', () => {
  beforeAll(async () => {
    if (redis.status !== 'ready') {
      await new Promise(resolve => redis.once('ready', resolve));
    }

    await sequelize.sync({ force: false });
  });

  afterAll(async () => {
    await redis.quit();
    await sequelize.close();
  });

  beforeEach(async () => {
    const keys = await redis.keys('rulechain:var:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('Sensor telemetry filtering', () => {
    it('should only trigger rule chains when variable matches', async () => {
      const sensorUUID = 'test-sensor-001';
      const temperatureVar = 'temperature';
      const humidityVar = 'humidity';

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        {
          ruleChainId: 1,
          variableName: `"${temperatureVar}"`,
          sourceType: '"sensor"'
        },
        {
          ruleChainId: 2,
          variableName: `"${humidityVar}"`,
          sourceType: '"sensor"'
        }
      ]);

      const ruleChains = await RuleChainIndex.getRuleChainsForSensor(
        sensorUUID,
        [temperatureVar]
      );

      expect(ruleChains).toEqual([1]);
      expect(ruleChains).not.toContain(2);

      mockQuery.mockRestore();
    });

    it('should cache index and serve subsequent requests from cache', async () => {
      const sensorUUID = 'test-sensor-002';
      const variableName = 'pressure';

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        {
          ruleChainId: 5,
          variableName: `"${variableName}"`,
          sourceType: '"sensor"'
        }
      ]);

      const firstCall = await RuleChainIndex.getRuleChainsForSensor(
        sensorUUID,
        [variableName]
      );
      expect(firstCall).toEqual([5]);
      expect(mockQuery).toHaveBeenCalledTimes(1);

      mockQuery.mockClear();

      const secondCall = await RuleChainIndex.getRuleChainsForSensor(
        sensorUUID,
        [variableName]
      );
      expect(secondCall).toEqual([5]);
      expect(mockQuery).not.toHaveBeenCalled();

      mockQuery.mockRestore();
    });

    it('should handle multiple variables and merge rule chains', async () => {
      const sensorUUID = 'test-sensor-003';

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' },
        { ruleChainId: 3, variableName: '"temperature"', sourceType: '"sensor"' },
        { ruleChainId: 2, variableName: '"humidity"', sourceType: '"sensor"' },
        { ruleChainId: 3, variableName: '"humidity"', sourceType: '"sensor"' }
      ]);

      const ruleChains = await RuleChainIndex.getRuleChainsForSensor(
        sensorUUID,
        ['temperature', 'humidity']
      );

      expect(ruleChains).toEqual(expect.arrayContaining([1, 2, 3]));
      expect(ruleChains.length).toBe(3);

      mockQuery.mockRestore();
    });
  });

  describe('Device state filtering', () => {
    it('should only trigger rule chains when device property matches', async () => {
      const deviceUUID = 'test-device-001';
      const powerProperty = 'power';
      const speedProperty = 'speed';

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        {
          ruleChainId: 6,
          variableName: `"${powerProperty}"`,
          sourceType: '"device"'
        },
        {
          ruleChainId: 7,
          variableName: `"${speedProperty}"`,
          sourceType: '"device"'
        }
      ]);

      const ruleChains = await RuleChainIndex.getRuleChainsForDevice(
        deviceUUID,
        [powerProperty]
      );

      expect(ruleChains).toEqual([6]);
      expect(ruleChains).not.toContain(7);

      mockQuery.mockRestore();
    });

    it('should cache device index separately from sensor index', async () => {
      const sensorUUID = 'test-sensor-004';
      const deviceUUID = 'test-device-002';
      const variableName = 'temperature';

      const mockQuery = jest.spyOn(sequelize, 'query')
        .mockResolvedValueOnce([
          { ruleChainId: 1, variableName: `"${variableName}"`, sourceType: '"sensor"' }
        ])
        .mockResolvedValueOnce([
          { ruleChainId: 6, variableName: `"${variableName}"`, sourceType: '"device"' }
        ]);

      const sensorRuleChains = await RuleChainIndex.getRuleChainsForSensor(
        sensorUUID,
        [variableName]
      );
      const deviceRuleChains = await RuleChainIndex.getRuleChainsForDevice(
        deviceUUID,
        [variableName]
      );

      expect(sensorRuleChains).toEqual([1]);
      expect(deviceRuleChains).toEqual([6]);

      const sensorKey = await redis.get(`rulechain:var:sensor:${sensorUUID}:${variableName}`);
      const deviceKey = await redis.get(`rulechain:var:device:${deviceUUID}:${variableName}`);

      expect(JSON.parse(sensorKey)).toEqual([1]);
      expect(JSON.parse(deviceKey)).toEqual([6]);

      mockQuery.mockRestore();
    });
  });

  describe('Invalidation', () => {
    it('should invalidate all variable indexes for sensor', async () => {
      const sensorUUID = 'test-sensor-005';

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' },
        { ruleChainId: 2, variableName: '"humidity"', sourceType: '"sensor"' }
      ]);

      await RuleChainIndex.getRuleChainsForSensor(sensorUUID, ['temperature', 'humidity']);

      const keysBefore = await redis.keys(`rulechain:var:sensor:${sensorUUID}:*`);
      expect(keysBefore.length).toBe(2);

      await RuleChainIndex.invalidateSensor(sensorUUID);

      const keysAfter = await redis.keys(`rulechain:var:sensor:${sensorUUID}:*`);
      expect(keysAfter.length).toBe(0);

      mockQuery.mockRestore();
    });

    it('should invalidate device indexes independently from sensor indexes', async () => {
      const sensorUUID = 'test-sensor-006';
      const deviceUUID = 'test-device-003';

      const mockQuery = jest.spyOn(sequelize, 'query')
        .mockResolvedValueOnce([
          { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' }
        ])
        .mockResolvedValueOnce([
          { ruleChainId: 6, variableName: '"power"', sourceType: '"device"' }
        ]);

      await RuleChainIndex.getRuleChainsForSensor(sensorUUID, ['temperature']);
      await RuleChainIndex.getRuleChainsForDevice(deviceUUID, ['power']);

      await RuleChainIndex.invalidateSensor(sensorUUID);

      const sensorKeys = await redis.keys(`rulechain:var:sensor:${sensorUUID}:*`);
      const deviceKeys = await redis.keys(`rulechain:var:device:${deviceUUID}:*`);

      expect(sensorKeys.length).toBe(0);
      expect(deviceKeys.length).toBe(1);

      mockQuery.mockRestore();
    });
  });

  describe('EventBus integration', () => {
    it('should skip rule chains when no variables match', async () => {
      const mockFindByPk = jest.spyOn(TelemetryData, 'findByPk').mockResolvedValue({
        id: 1,
        variableName: 'pressure'
      });

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const mockQueueAdd = jest.fn().mockResolvedValue({ id: 'job-1' });
      jest.spyOn(require('../../src/ruleEngine/core/RuleEngineQueue'), 'ruleEngineQueue', 'get')
        .mockReturnValue({ add: mockQueueAdd });
      jest.spyOn(require('../../src/ruleEngine/core/RuleEngineQueue'), 'getQueueCounts')
        .mockResolvedValue({ waiting: 0, active: 0 });

      const result = await RuleEngineEventBus.emit('telemetry-data', {
        sensorUUID: 'test-sensor-007',
        telemetryDataId: 1,
        dataStreamId: 100
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('no-rule-chains');
      expect(mockQueueAdd).not.toHaveBeenCalled();

      mockFindByPk.mockRestore();
      mockQuery.mockRestore();
    });

    it('should queue rule chains when variables match', async () => {
      const mockFindByPk = jest.spyOn(TelemetryData, 'findByPk').mockResolvedValue({
        id: 1,
        variableName: 'temperature'
      });

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' },
        { ruleChainId: 3, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const mockQueueAdd = jest.fn().mockResolvedValue({ id: 'job-1' });
      jest.spyOn(require('../../src/ruleEngine/core/RuleEngineQueue'), 'ruleEngineQueue', 'get')
        .mockReturnValue({ add: mockQueueAdd });
      jest.spyOn(require('../../src/ruleEngine/core/RuleEngineQueue'), 'getQueueCounts')
        .mockResolvedValue({ waiting: 0, active: 0 });

      const result = await RuleEngineEventBus.emit('telemetry-data', {
        sensorUUID: 'test-sensor-008',
        telemetryDataId: 1,
        dataStreamId: 100
      });

      expect(result.skipped).toBeUndefined();
      expect(result.rejected).toBe(false);
      expect(result.ruleChainCount).toBe(2);
      expect(mockQueueAdd).toHaveBeenCalled();

      mockFindByPk.mockRestore();
      mockQuery.mockRestore();
    });

    it('should handle cached variable names passed directly', async () => {
      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const mockQueueAdd = jest.fn().mockResolvedValue({ id: 'job-1' });
      jest.spyOn(require('../../src/ruleEngine/core/RuleEngineQueue'), 'ruleEngineQueue', 'get')
        .mockReturnValue({ add: mockQueueAdd });
      jest.spyOn(require('../../src/ruleEngine/core/RuleEngineQueue'), 'getQueueCounts')
        .mockResolvedValue({ waiting: 0, active: 0 });

      const result = await RuleEngineEventBus.emit('telemetry-data', {
        sensorUUID: 'test-sensor-009',
        variableNames: ['temperature'],
        dataStreamId: 100
      });

      expect(result.skipped).toBeUndefined();
      expect(result.rejected).toBe(false);
      expect(result.ruleChainCount).toBe(1);
      expect(TelemetryData.findByPk).not.toHaveBeenCalled();

      mockQuery.mockRestore();
    });
  });

  describe('Performance benchmarks', () => {
    it('should complete cache hit lookups in <5ms', async () => {
      const sensorUUID = 'perf-test-sensor-001';

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      await RuleChainIndex.getRuleChainsForSensor(sensorUUID, ['temperature']);

      const startTime = Date.now();
      await RuleChainIndex.getRuleChainsForSensor(sensorUUID, ['temperature']);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5);

      mockQuery.mockRestore();
    });

    it('should complete cache miss with database query in <50ms', async () => {
      const sensorUUID = `perf-test-sensor-${Date.now()}`;

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const startTime = Date.now();
      await RuleChainIndex.getRuleChainsForSensor(sensorUUID, ['temperature']);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);

      mockQuery.mockRestore();
    });

    it('should handle 10 concurrent lookups efficiently', async () => {
      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const startTime = Date.now();
      const promises = Array.from({ length: 10 }, (_, i) =>
        RuleChainIndex.getRuleChainsForSensor(`concurrent-sensor-${i}`, ['temperature'])
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(10);
      expect(results.every(r => r.length > 0)).toBe(true);
      expect(duration).toBeLessThan(500);

      mockQuery.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockQuery = jest.spyOn(sequelize, 'query').mockRejectedValue(
        new Error('Connection timeout')
      );

      const result = await RuleChainIndex.getRuleChainsForSensor(
        'error-test-sensor-001',
        ['temperature']
      );

      expect(result).toEqual([]);

      mockQuery.mockRestore();
    });

    it('should handle Redis connection errors and fallback to database', async () => {
      const mockGet = jest.spyOn(redis, 'get').mockRejectedValue(
        new Error('Redis connection lost')
      );

      const mockQuery = jest.spyOn(sequelize, 'query').mockResolvedValue([
        { ruleChainId: 1, variableName: '"temperature"', sourceType: '"sensor"' }
      ]);

      const result = await RuleChainIndex.getRuleChainsForSensor(
        'error-test-sensor-002',
        ['temperature']
      );

      expect(result).toEqual([1]);
      expect(mockQuery).toHaveBeenCalled();

      mockGet.mockRestore();
      mockQuery.mockRestore();
    });
  });
});
