const request = require('supertest');
const app = require('../../src/app');

jest.mock('../../src/ruleEngine/core/RuleEngineQueue', () => ({
  ruleEngineQueue: {
    add: jest.fn(),
    getJobCounts: jest.fn(),
    getWorkers: jest.fn(),
    isPaused: jest.fn()
  },
  getQueueCounts: jest.fn(),
  getQueueMetrics: jest.fn()
}));

const { ruleEngineQueue, getQueueMetrics } = require('../../src/ruleEngine/core/RuleEngineQueue');
const backpressureManager = require('../../src/services/backpressureManager');

describe('Backpressure Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    backpressureManager.reset();
  });

  describe('GET /api/v1/metrics/queue', () => {
    it('should return queue metrics with backpressure status', async () => {
      getQueueMetrics.mockResolvedValue({
        counts: {
          waiting: 100,
          active: 50,
          completed: 1000,
          failed: 10,
          delayed: 5,
          paused: 0
        },
        workers: {
          count: 3,
          list: []
        },
        isPaused: false,
        health: 'healthy'
      });

      const response = await request(app)
        .get('/api/v1/metrics/queue')
        .expect(200);

      expect(response.body).toHaveProperty('queue');
      expect(response.body).toHaveProperty('workers');
      expect(response.body).toHaveProperty('backpressure');
      expect(response.body.queue.totalPending).toBe(150);
      expect(response.body.backpressure.circuitState).toBeDefined();
    });

    it('should show critical health when queue is overloaded', async () => {
      getQueueMetrics.mockResolvedValue({
        counts: {
          waiting: 40000,
          active: 15000,
          completed: 10000,
          failed: 100,
          delayed: 0,
          paused: 0
        },
        workers: {
          count: 5,
          list: []
        },
        isPaused: false,
        health: 'critical'
      });

      const response = await request(app)
        .get('/api/v1/metrics/queue')
        .expect(200);

      expect(response.body.queue.health).toBe('critical');
      expect(response.body.queue.totalPending).toBe(55000);
    });
  });

  describe('GET /api/v1/metrics/queue/summary', () => {
    it('should return concise queue summary', async () => {
      getQueueMetrics.mockResolvedValue({
        counts: {
          waiting: 100,
          active: 50,
          completed: 1000,
          failed: 10,
          delayed: 5
        },
        workers: {
          count: 3,
          list: []
        },
        health: 'healthy'
      });

      const response = await request(app)
        .get('/api/v1/metrics/queue/summary')
        .expect(200);

      expect(response.body).toHaveProperty('health');
      expect(response.body).toHaveProperty('queueDepth');
      expect(response.body).toHaveProperty('workers');
      expect(response.body).toHaveProperty('circuitState');
      expect(response.body.queueDepth).toBe(150);
    });
  });

  describe('GET /api/v1/metrics/prometheus', () => {
    it('should return Prometheus-formatted metrics', async () => {
      getQueueMetrics.mockResolvedValue({
        counts: {
          waiting: 100,
          active: 50,
          completed: 1000,
          failed: 10,
          delayed: 5
        },
        workers: {
          count: 3,
          list: []
        },
        health: 'healthy'
      });

      const response = await request(app)
        .get('/api/v1/metrics/prometheus')
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      expect(response.text).toContain('rule_engine_queue_waiting');
      expect(response.text).toContain('rule_engine_queue_active');
      expect(response.text).toContain('rule_engine_backpressure_circuit_state');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });
  });

  describe('POST /api/v1/metrics/backpressure/reset', () => {
    it('should reset backpressure manager state', async () => {
      backpressureManager.openCircuit();
      expect(backpressureManager.circuitState).toBe('OPEN');

      const response = await request(app)
        .post('/api/v1/metrics/backpressure/reset')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status.circuitState).toBe('CLOSED');
    });
  });

  describe('GET /api/v1/health', () => {
    beforeEach(() => {
      ruleEngineQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 100,
        active: 50,
        completed: 1000,
        failed: 10,
        delayed: 5
      });
      ruleEngineQueue.getWorkers = jest.fn().mockResolvedValue([{}, {}, {}]);
      ruleEngineQueue.isPaused = jest.fn().mockResolvedValue(false);
    });

    it('should include queue health in overall health check', async () => {
      getQueueMetrics.mockResolvedValue({
        counts: {
          waiting: 100,
          active: 50,
          completed: 1000,
          failed: 10,
          delayed: 5
        },
        workers: {
          count: 3,
          list: []
        },
        health: 'healthy'
      });

      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('ruleEngineQueue');
      expect(response.body.services.ruleEngineQueue.status).toBeDefined();
    });

    it('should show degraded status when circuit is open', async () => {
      backpressureManager.openCircuit();
      
      getQueueMetrics.mockResolvedValue({
        counts: {
          waiting: 60000,
          active: 5000,
          completed: 1000,
          failed: 10,
          delayed: 5
        },
        workers: {
          count: 3,
          list: []
        },
        health: 'critical'
      });

      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.services.ruleEngineQueue.status).toBe('critical');
      expect(response.body.services.ruleEngineQueue.circuitState).toBe('OPEN');
    });
  });

  describe('GET /api/v1/health/readiness', () => {
    beforeEach(() => {
      ruleEngineQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 100,
        active: 50
      });
      ruleEngineQueue.getWorkers = jest.fn().mockResolvedValue([{}, {}, {}]);
      ruleEngineQueue.isPaused = jest.fn().mockResolvedValue(false);
    });

    it('should return not ready when circuit is open', async () => {
      backpressureManager.openCircuit();

      const response = await request(app)
        .get('/api/v1/health/readiness')
        .expect(503);

      expect(response.body.status).toBe('not ready');
      expect(response.body.checks.backpressure).toContain('circuit open');
    });

    it('should return ready when circuit is closed', async () => {
      const response = await request(app)
        .get('/api/v1/health/readiness')
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.checks.backpressure).toBe('ready');
    });
  });

  describe('GET /api/v1/health/liveness', () => {
    it('should always return alive', async () => {
      const response = await request(app)
        .get('/api/v1/health/liveness')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
