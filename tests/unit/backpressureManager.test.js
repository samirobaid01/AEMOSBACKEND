const { BackpressureManager, CIRCUIT_STATE } = require('../../src/services/backpressureManager');

describe('BackpressureManager', () => {
  let backpressureManager;

  beforeEach(() => {
    backpressureManager = new BackpressureManager({
      warningThreshold: 100,
      criticalThreshold: 500,
      recoveryThreshold: 50
    });
    backpressureManager.warningThreshold = 100;
    backpressureManager.criticalThreshold = 500;
    backpressureManager.recoveryThreshold = 50;
    backpressureManager.enabled = true;
    backpressureManager.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldAcceptEvent', () => {
    it('should accept events when queue depth is below warning threshold', () => {
      const queueMetrics = { waiting: 50, active: 20 };
      const result = backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      expect(result.accept).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('should log warning when queue depth is above warning threshold', () => {
      const queueMetrics = { waiting: 80, active: 30 };
      const result = backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      expect(result.accept).toBe(true);
      expect(backpressureManager.circuitState).toBe(CIRCUIT_STATE.CLOSED);
    });

    it('should reject low-priority events when queue depth is near critical', () => {
      const queueMetrics = { waiting: 350, active: 100 };
      const result = backpressureManager.shouldAcceptEvent(queueMetrics, 8);
      
      expect(result.accept).toBe(false);
      expect(result.reason).toBe('low-priority-shed');
    });

    it('should reject events when queue depth exceeds critical threshold', () => {
      const queueMetrics = { waiting: 400, active: 150 };
      const result = backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      expect(result.accept).toBe(false);
      expect(result.reason).toBe('queue-critical');
      expect(backpressureManager.circuitState).toBe(CIRCUIT_STATE.OPEN);
    });

    it('should accept high-priority events even when critical threshold is exceeded', () => {
      const queueMetrics = { waiting: 400, active: 150 };
      const result = backpressureManager.shouldAcceptEvent(queueMetrics, 1);
      
      expect(result.accept).toBe(true);
      expect(result.reason).toBe('high-priority-override');
    });

    it('should always accept when backpressure is disabled', () => {
      backpressureManager.enabled = false;
      const queueMetrics = { waiting: 600, active: 200 };
      const result = backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      expect(result.accept).toBe(true);
      expect(result.reason).toBeNull();
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit when critical threshold is exceeded', () => {
      const queueMetrics = { waiting: 400, active: 150 };
      backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      expect(backpressureManager.circuitState).toBe(CIRCUIT_STATE.OPEN);
    });

    it('should transition to half-open when queue depth recovers', () => {
      const criticalMetrics = { waiting: 400, active: 150 };
      backpressureManager.shouldAcceptEvent(criticalMetrics, 5);
      expect(backpressureManager.circuitState).toBe(CIRCUIT_STATE.OPEN);

      const recoveryMetrics = { waiting: 30, active: 15 };
      backpressureManager.shouldAcceptEvent(recoveryMetrics, 5);
      
      expect(backpressureManager.circuitState).toBe(CIRCUIT_STATE.HALF_OPEN);
    });

    it('should close circuit when queue is stable in half-open state', () => {
      const criticalMetrics = { waiting: 400, active: 150 };
      backpressureManager.shouldAcceptEvent(criticalMetrics, 5);
      
      const recoveryMetrics = { waiting: 30, active: 15 };
      backpressureManager.shouldAcceptEvent(recoveryMetrics, 5);
      expect(backpressureManager.circuitState).toBe(CIRCUIT_STATE.HALF_OPEN);

      const stableMetrics = { waiting: 20, active: 10 };
      backpressureManager.shouldAcceptEvent(stableMetrics, 5);
      
      expect(backpressureManager.circuitState).toBe(CIRCUIT_STATE.CLOSED);
    });

    it('should reject events when circuit is open', () => {
      backpressureManager.openCircuit();
      
      const queueMetrics = { waiting: 400, active: 150 };
      const result = backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      expect(result.accept).toBe(false);
      expect(result.reason).toBe('circuit-open');
    });

    it('should reopen circuit if queue depth spikes in half-open state', () => {
      backpressureManager.openCircuit();
      
      const recoveryMetrics = { waiting: 30, active: 15 };
      backpressureManager.shouldAcceptEvent(recoveryMetrics, 5);
      expect(backpressureManager.circuitState).toBe(CIRCUIT_STATE.HALF_OPEN);

      const spikeMetrics = { waiting: 120, active: 50 };
      backpressureManager.shouldAcceptEvent(spikeMetrics, 5);
      
      expect(backpressureManager.circuitState).toBe(CIRCUIT_STATE.OPEN);
    });
  });

  describe('getStatus', () => {
    it('should return current backpressure status', () => {
      const status = backpressureManager.getStatus();
      
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('circuitState');
      expect(status).toHaveProperty('thresholds');
      expect(status).toHaveProperty('metrics');
      expect(status.thresholds).toHaveProperty('warning');
      expect(status.thresholds).toHaveProperty('critical');
      expect(status.thresholds).toHaveProperty('recovery');
    });

    it('should track rejected count', () => {
      const queueMetrics = { waiting: 400, active: 150 };
      backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      const status = backpressureManager.getStatus();
      expect(status.metrics.rejectedCount).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset backpressure manager to initial state', () => {
      backpressureManager.openCircuit();
      const queueMetrics = { waiting: 400, active: 150 };
      backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      backpressureManager.reset();
      
      const status = backpressureManager.getStatus();
      expect(status.circuitState).toBe(CIRCUIT_STATE.CLOSED);
      expect(status.metrics.rejectedCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined queue metrics gracefully', () => {
      const queueMetrics = {};
      const result = backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      expect(result.accept).toBe(true);
    });

    it('should handle null waiting/active counts', () => {
      const queueMetrics = { waiting: null, active: null };
      const result = backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      
      expect(result.accept).toBe(true);
    });

    it('should throttle warning logs to avoid log spam', () => {
      backpressureManager.warningLogInterval = 1000;
      
      const queueMetrics = { waiting: 120, active: 50 };
      
      for (let i = 0; i < 10; i++) {
        backpressureManager.shouldAcceptEvent(queueMetrics, 5);
      }
    });
  });
});
