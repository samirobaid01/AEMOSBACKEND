const { ruleChainService } = require('../../src/services/ruleChainService');
const { TimeoutError, ERROR_CODES } = require('../../src/utils/TimeoutError');
const timeoutMetrics = require('../../src/utils/timeoutMetrics');
const config = require('../../src/config');

jest.mock('../../src/ruleEngine/indexing/RuleChainIndex', () => ({
  getRuleChainsForSensor: jest.fn()
}));

jest.mock('../../src/models/initModels', () => ({
  Sensor: {
    findOne: jest.fn()
  },
  Device: {
    findOne: jest.fn()
  },
  TelemetryData: {
    findOne: jest.fn()
  },
  DataStream: {
    findOne: jest.fn()
  },
  DeviceState: {
    findOne: jest.fn()
  },
  DeviceStateInstance: {
    findOne: jest.fn()
  },
  RuleChain: {
    findAll: jest.fn(),
    findByPk: jest.fn()
  },
  RuleChainNode: {
    findAll: jest.fn()
  }
}));

const {
  Sensor,
  Device,
  TelemetryData,
  DataStream,
  DeviceState,
  DeviceStateInstance,
  RuleChain,
  RuleChainNode
} = require('../../src/models/initModels');

describe('Rule Execution Timeout Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    timeoutMetrics.reset();
  });

  describe('Data Collection Timeout', () => {
    test('should handle sensor data collection timeout gracefully', async () => {
      const originalTimeout = config.ruleEngine.timeouts.dataCollection;
      let timerId;
      
      Sensor.findOne = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          timerId = setTimeout(() => resolve({ id: 1, UUID: 'sensor-123' }), originalTimeout + 100);
        });
      });

      TelemetryData.findOne = jest.fn().mockResolvedValue({ id: 1, datatype: 'number' });
      DataStream.findOne = jest.fn().mockResolvedValue({
        value: '10',
        recievedAt: new Date()
      });

      const sensorReqs = new Map([['sensor-123', new Set(['temperature'])]]);
      
      const result = await ruleChainService._collectSensorData(sensorReqs, 100);

      if (timerId) clearTimeout(timerId);

      expect(result.data).toEqual([]);
      expect(result.timeoutDetails.timedOut).toBe(true);
      expect(result.timeoutDetails.duration).toBeGreaterThan(0);
    });

    test('should handle device data collection timeout gracefully', async () => {
      const originalTimeout = config.ruleEngine.timeouts.dataCollection;
      let timerId;
      
      Device.findOne = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          timerId = setTimeout(() => resolve({ id: 1, UUID: 'device-123' }), originalTimeout + 100);
        });
      });

      DeviceState.findOne = jest.fn().mockResolvedValue({ id: 1 });
      DeviceStateInstance.findOne = jest.fn().mockResolvedValue({
        value: 'on',
        fromTimestamp: new Date()
      });

      const deviceReqs = new Map([['device-123', new Set(['power'])]]);
      
      const result = await ruleChainService._collectDeviceData(deviceReqs, 100);

      if (timerId) clearTimeout(timerId);

      expect(result.data).toEqual([]);
      expect(result.timeoutDetails.timedOut).toBe(true);
    });

    test('should return empty data when collection times out', async () => {
      const sensorReqs = new Map([
        ['sensor-1', new Set(['temperature'])],
        ['sensor-2', new Set(['humidity'])]
      ]);

      let timerId;
      Sensor.findOne = jest.fn().mockImplementation(({ where }) => {
        if (where.UUID === 'sensor-1') {
          return Promise.resolve({ id: 1, UUID: 'sensor-1' });
        }
        return new Promise(resolve => {
          timerId = setTimeout(() => resolve({ id: 2, UUID: 'sensor-2' }), 1000);
        });
      });

      let telemetryCallCount = 0;
      TelemetryData.findOne = jest.fn().mockImplementation(() => {
        telemetryCallCount++;
        if (telemetryCallCount === 1) {
          return Promise.resolve({ id: 1, datatype: 'number' });
        }
        return new Promise(resolve => {
          setTimeout(() => resolve({ id: 2, datatype: 'number' }), 1000);
        });
      });

      DataStream.findOne = jest.fn().mockResolvedValue({
        value: '25',
        recievedAt: new Date()
      });

      const result = await ruleChainService._collectSensorData(sensorReqs, 200);

      if (timerId) clearTimeout(timerId);

      expect(result.data).toEqual([]);
      expect(result.timeoutDetails.timedOut).toBe(true);
    });
  });

  describe('Rule Chain Execution Timeout', () => {
    test('should timeout rule chain execution that exceeds limit', async () => {
      const mockRuleChain = {
        id: 1,
        name: 'Test Chain',
        nodes: [
          {
            id: 1,
            type: 'filter',
            config: { sourceType: 'sensor', UUID: 'sensor-1', key: 'temp', operator: '>', value: 20 },
            nextNodeId: null
          }
        ]
      };

      ruleChainService.findChainById = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockRuleChain;
      });

      const rawData = {
        sensorData: [{ UUID: 'sensor-1', temp: 25, timestamp: new Date() }],
        deviceData: []
      };

      await expect(
        ruleChainService.execute(1, rawData, 50)
      ).rejects.toThrow(TimeoutError);
    });

    test('should complete rule chain execution within timeout', async () => {
      const mockRuleChain = {
        id: 1,
        name: 'Test Chain',
        nodes: [
          {
            id: 1,
            type: 'filter',
            config: { sourceType: 'sensor', UUID: 'sensor-1', key: 'temp', operator: '>', value: 20 },
            nextNodeId: null
          }
        ]
      };

      ruleChainService.findChainById = jest.fn().mockResolvedValue(mockRuleChain);

      const rawData = {
        sensorData: [{ UUID: 'sensor-1', temp: 25, timestamp: new Date() }],
        deviceData: []
      };

      const result = await ruleChainService.execute(1, rawData, 5000);

      expect(result.status).toBe('success');
    });
  });

  describe('Partial Data Metadata', () => {
    test('should inject metadata when data collection times out', async () => {
      const sensorReqs = new Map([['sensor-timeout', new Set(['temperature'])]]);
      const deviceReqs = new Map([['device-timeout', new Set(['power'])]]);

      Sensor.findOne = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ id: 1, UUID: 'sensor-timeout' }), 1000);
        });
      });

      Device.findOne = jest.fn().mockResolvedValue({ id: 1, UUID: 'device-timeout' });
      DeviceState.findOne = jest.fn().mockResolvedValue({ id: 1 });
      DeviceStateInstance.findOne = jest.fn().mockResolvedValue({
        value: 'on',
        fromTimestamp: new Date()
      });

      const [sensorResult, deviceResult] = await Promise.all([
        ruleChainService._collectSensorData(sensorReqs, 100),
        ruleChainService._collectDeviceData(deviceReqs, 100)
      ]);

      expect(sensorResult.timeoutDetails.timedOut).toBe(true);
      expect(deviceResult.timeoutDetails.timedOut).toBe(false);
    });
  });

  describe('Metrics Recording', () => {
    test('should record timeout metrics when data collection times out', async () => {
      timeoutMetrics.reset();
      
      const shortTimeout = 100;
      const sensorReqs = new Map([['sensor-123', new Set(['temperature'])]]);
      
      let timerId;
      Sensor.findOne = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          timerId = setTimeout(() => resolve({ id: 1, UUID: 'sensor-123' }), 1000);
        });
      });

      let telemetryTimerId;
      TelemetryData.findOne = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          telemetryTimerId = setTimeout(() => resolve({ id: 1, datatype: 'number' }), 1000);
        });
      });

      DataStream.findOne = jest.fn().mockResolvedValue({
        value: '25',
        recievedAt: new Date()
      });

      const result = await ruleChainService._collectSensorData(sensorReqs, shortTimeout);

      expect(result.timeoutDetails.timedOut).toBe(true);

      await new Promise(resolve => setTimeout(resolve, shortTimeout + 50));

      if (timerId) clearTimeout(timerId);
      if (telemetryTimerId) clearTimeout(telemetryTimerId);

      const counter = timeoutMetrics.getCounter(ERROR_CODES.DATA_COLLECTION_TIMEOUT);
      expect(counter).toBeGreaterThan(0);
    });
  });
});
