/**
 * Unit tests for MetricsManager (migrated to prom-client in P4.8).
 *
 * Uses plain-function mocks for registry so they survive jest's resetMocks: true.
 */

jest.mock('prom-client', () => {
  // Storage shared across mock instances (same singleton behavior as real prom-client)
  const _counters   = {};
  const _histograms = {};
  const _gauges     = {};

  class Counter {
    constructor({ name }) {
      this.name = name;
      _counters[name] = this;
      this._values = {};
    }
    inc(labels = {}, v = 1) {
      const key = JSON.stringify(labels);
      this._values[key] = (this._values[key] || 0) + v;
    }
  }

  class Histogram {
    constructor({ name }) {
      this.name = name;
      _histograms[name] = this;
      this._observations = [];
    }
    observe(labels = {}, v) { this._observations.push({ labels, v }); }
  }

  class Gauge {
    constructor({ name }) {
      this.name = name;
      _gauges[name] = this;
      this._value = null;
    }
    set(labels = {}, v) { this._value = v; }
  }

  const register = {
    // Plain async function — not affected by resetMocks
    metrics:      async () => '# HELP aemos_nodejs_heap_size_used_bytes Heap used\naemos_nodejs_heap_size_used_bytes 1024',
    contentType:  'text/plain; version=0.0.4; charset=utf-8',
    resetMetrics() {
      Object.values(_counters).forEach(c => { c._values = {}; });
      Object.values(_histograms).forEach(h => { h._observations = []; });
      Object.values(_gauges).forEach(g => { g._value = null; });
    },
  };

  return { Counter, Histogram, Gauge, register, collectDefaultMetrics: () => {} };
});

const metricsManager = require('../../src/utils/metricsManager');

describe('MetricsManager (prom-client)', () => {
  beforeEach(() => metricsManager.reset());

  describe('incrementCounter()', () => {
    it('does not throw for a known counter with valid labels', () => {
      expect(() =>
        metricsManager.incrementCounter('rule_execution_total', { ruleChainId: '1', status: 'success' })
      ).not.toThrow();
    });

    it('rejects forbidden labels', () => {
      expect(() =>
        metricsManager.incrementCounter('http_requests_total', { sensorUUID: 'abc' })
      ).toThrow('Forbidden label');
    });

    it('rejects deviceToken label', () => {
      expect(() =>
        metricsManager.incrementCounter('telemetry_ingestion_total', { deviceToken: 'tok' })
      ).toThrow('Forbidden label');
    });

    it('warns (does not throw) for an unknown metric name', () => {
      expect(() =>
        metricsManager.incrementCounter('nonexistent_metric', { status: 'ok' })
      ).not.toThrow();
    });
  });

  describe('observeHistogram()', () => {
    it('does not throw for a known histogram with valid labels', () => {
      expect(() =>
        metricsManager.observeHistogram(
          'http_request_duration_seconds',
          { method: 'GET', route: '/health', status_code: '200' },
          0.05
        )
      ).not.toThrow();
    });

    it('rejects forbidden labels', () => {
      expect(() =>
        metricsManager.observeHistogram('rule_execution_duration_seconds', { userId: '1' }, 0.1)
      ).toThrow('Forbidden label');
    });

    it('warns (does not throw) for an unknown metric name', () => {
      expect(() =>
        metricsManager.observeHistogram('ghost_histogram', {}, 1)
      ).not.toThrow();
    });
  });

  describe('setGauge()', () => {
    it('does not throw for a known gauge with valid labels', () => {
      expect(() =>
        metricsManager.setGauge('rule_execution_nodes_executed', { ruleChainId: '5' }, 12)
      ).not.toThrow();
    });

    it('rejects forbidden labels', () => {
      expect(() =>
        metricsManager.setGauge('rule_execution_nodes_executed', { deviceToken: 'tok' }, 1)
      ).toThrow('Forbidden label');
    });

    it('warns (does not throw) for a wrong type (gauge vs counter)', () => {
      expect(() =>
        metricsManager.setGauge('rule_execution_total', {}, 5)
      ).not.toThrow();
    });
  });

  describe('getPrometheusMetrics()', () => {
    it('returns a Promise that resolves to a string', async () => {
      const output = await metricsManager.getPrometheusMetrics();
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });

    it('includes default process metrics from prom-client', async () => {
      const output = await metricsManager.getPrometheusMetrics();
      expect(output).toContain('aemos_nodejs');
    });
  });

  describe('getContentType()', () => {
    it('returns a text/plain content-type string', () => {
      const ct = metricsManager.getContentType();
      expect(ct).toMatch(/text\/plain/);
    });
  });

  describe('reset()', () => {
    it('clears accumulated metric values without throwing', () => {
      metricsManager.incrementCounter('notifications_sent_total', { protocol: 'mqtt' });
      expect(() => metricsManager.reset()).not.toThrow();
    });
  });
});
