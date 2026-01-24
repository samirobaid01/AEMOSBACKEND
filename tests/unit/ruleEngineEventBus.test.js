const RuleEngineEventBus = require('../../src/ruleEngine/core/RuleEngineEventBus');

jest.mock('../../src/ruleEngine/core/RuleEngineQueue', () => ({
  ruleEngineQueue: {
    add: jest.fn()
  },
  getQueueCounts: jest.fn()
}));

jest.mock('../../src/services/backpressureManager', () => ({
  shouldAcceptEvent: jest.fn()
}));

const { ruleEngineQueue, getQueueCounts } = require('../../src/ruleEngine/core/RuleEngineQueue');
const backpressureManager = require('../../src/services/backpressureManager');

describe('RuleEngineEventBus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('emit', () => {
    it('should successfully enqueue event when backpressure allows', async () => {
      const queueCounts = { waiting: 100, active: 50 };
      getQueueCounts.mockResolvedValue(queueCounts);
      
      backpressureManager.shouldAcceptEvent.mockReturnValue({
        accept: true,
        reason: null
      });

      const mockJob = { id: '123', data: {} };
      ruleEngineQueue.add.mockResolvedValue(mockJob);

      const result = await RuleEngineEventBus.emit('telemetry-data', {
        sensorUUID: 'test-uuid',
        dataStreamId: 1
      });

      expect(result.rejected).toBe(false);
      expect(result.job).toBe(mockJob);
      expect(result.queueDepth).toBe(150);
      expect(ruleEngineQueue.add).toHaveBeenCalled();
    });

    it('should reject event when backpressure denies', async () => {
      const queueCounts = { waiting: 60000, active: 1000 };
      getQueueCounts.mockResolvedValue(queueCounts);
      
      backpressureManager.shouldAcceptEvent.mockReturnValue({
        accept: false,
        reason: 'queue-critical',
        queueDepth: 61000,
        threshold: 50000
      });

      const result = await RuleEngineEventBus.emit('telemetry-data', {
        sensorUUID: 'test-uuid',
        dataStreamId: 1
      });

      expect(result.rejected).toBe(true);
      expect(result.reason).toBe('queue-critical');
      expect(result.queueDepth).toBe(61000);
      expect(ruleEngineQueue.add).not.toHaveBeenCalled();
    });

    it('should use priority from event type mapping', async () => {
      const queueCounts = { waiting: 100, active: 50 };
      getQueueCounts.mockResolvedValue(queueCounts);
      
      backpressureManager.shouldAcceptEvent.mockReturnValue({
        accept: true,
        reason: null
      });

      ruleEngineQueue.add.mockResolvedValue({ id: '123' });

      await RuleEngineEventBus.emit('scheduled', {
        ruleChainId: 1
      });

      expect(backpressureManager.shouldAcceptEvent).toHaveBeenCalledWith(
        queueCounts,
        1
      );
    });

    it('should use custom priority from options', async () => {
      const queueCounts = { waiting: 100, active: 50 };
      getQueueCounts.mockResolvedValue(queueCounts);
      
      backpressureManager.shouldAcceptEvent.mockReturnValue({
        accept: true,
        reason: null
      });

      ruleEngineQueue.add.mockResolvedValue({ id: '123' });

      await RuleEngineEventBus.emit('telemetry-data', {
        sensorUUID: 'test-uuid'
      }, { priority: 3 });

      expect(backpressureManager.shouldAcceptEvent).toHaveBeenCalledWith(
        queueCounts,
        3
      );
    });

    it('should handle queue add errors gracefully', async () => {
      const queueCounts = { waiting: 100, active: 50 };
      getQueueCounts.mockResolvedValue(queueCounts);
      
      backpressureManager.shouldAcceptEvent.mockReturnValue({
        accept: true,
        reason: null
      });

      ruleEngineQueue.add.mockRejectedValue(new Error('Redis connection failed'));

      const result = await RuleEngineEventBus.emit('telemetry-data', {
        sensorUUID: 'test-uuid'
      });

      expect(result.rejected).toBe(true);
      expect(result.reason).toBe('enqueue-error');
      expect(result.error).toBe('Redis connection failed');
    });

    it('should include event metadata in job data', async () => {
      const queueCounts = { waiting: 100, active: 50 };
      getQueueCounts.mockResolvedValue(queueCounts);
      
      backpressureManager.shouldAcceptEvent.mockReturnValue({
        accept: true,
        reason: null
      });

      ruleEngineQueue.add.mockResolvedValue({ id: '123' });

      const payload = { sensorUUID: 'test-uuid', dataStreamId: 1 };
      await RuleEngineEventBus.emit('telemetry-data', payload);

      expect(ruleEngineQueue.add).toHaveBeenCalledWith(
        'telemetry-data',
        expect.objectContaining({
          eventType: 'telemetry-data',
          payload,
          priority: 5,
          enqueuedAt: expect.any(String)
        }),
        expect.objectContaining({
          priority: 5
        })
      );
    });
  });
});
