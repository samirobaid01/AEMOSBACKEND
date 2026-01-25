const metricsManager = require('../../src/utils/metricsManager');

describe('MetricsManager', () => {
  beforeEach(() => {
    metricsManager.reset();
  });

  describe('Cardinality Validation', () => {
    test('should allow valid labels', () => {
      expect(() => {
        metricsManager.incrementCounter('test_counter', {
          ruleChainId: '1',
          status: 'success'
        });
      }).not.toThrow();
    });

    test('should reject forbidden labels', () => {
      expect(() => {
        metricsManager.incrementCounter('test_counter', {
          sensorUUID: 'abc123'
        });
      }).toThrow('Forbidden label');
    });

    test('should enforce cardinality limits', () => {
      for (let i = 0; i < 200; i++) {
        metricsManager.incrementCounter('test_counter', {
          ruleChainId: String(i),
          status: 'success'
        });
      }

      expect(() => {
        metricsManager.incrementCounter('test_counter', {
          ruleChainId: '201',
          status: 'success'
        });
      }).toThrow('cardinality violation');
    });
  });

  describe('Counter Operations', () => {
    test('should increment counter', () => {
      metricsManager.incrementCounter('test_counter', { status: 'success' });
      metricsManager.incrementCounter('test_counter', { status: 'success' }, 2);

      const metrics = metricsManager.getPrometheusMetrics();
      expect(metrics).toContain('test_counter{status="success"} 3');
    });

    test('should handle multiple label combinations', () => {
      metricsManager.incrementCounter('rule_execution_total', {
        ruleChainId: '1',
        status: 'success'
      });
      metricsManager.incrementCounter('rule_execution_total', {
        ruleChainId: '1',
        status: 'failure'
      });
      metricsManager.incrementCounter('rule_execution_total', {
        ruleChainId: '2',
        status: 'success'
      });

      const metrics = metricsManager.getPrometheusMetrics();
      expect(metrics).toContain('rule_execution_total{ruleChainId="1",status="success"} 1');
      expect(metrics).toContain('rule_execution_total{ruleChainId="1",status="failure"} 1');
      expect(metrics).toContain('rule_execution_total{ruleChainId="2",status="success"} 1');
    });
  });

  describe('Histogram Operations', () => {
    test('should observe histogram values', () => {
      metricsManager.observeHistogram('rule_execution_duration_seconds', {
        status: 'success'
      }, 0.5);

      metricsManager.observeHistogram('rule_execution_duration_seconds', {
        status: 'success'
      }, 1.2);

      const metrics = metricsManager.getPrometheusMetrics();
      expect(metrics).toContain('rule_execution_duration_seconds');
      expect(metrics).toContain('status="success"');
    });

    test('should calculate histogram buckets correctly', () => {
      const values = [0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
      
      values.forEach(val => {
        metricsManager.observeHistogram('test_histogram', { status: 'success' }, val);
      });

      const metrics = metricsManager.getPrometheusMetrics();
      expect(metrics).toContain('le="0.01"');
      expect(metrics).toContain('le="0.05"');
      expect(metrics).toContain('le="+Inf"');
    });

    test('should NOT allow ruleChainId in histograms', () => {
      expect(() => {
        metricsManager.observeHistogram('rule_execution_duration_seconds', {
          ruleChainId: '1',
          status: 'success'
        }, 0.5);
      }).not.toThrow();

      const metrics = metricsManager.getPrometheusMetrics();
      const histogramLines = metrics.split('\n').filter(line => 
        line.includes('rule_execution_duration_seconds_bucket') || 
        line.includes('rule_execution_duration_seconds_sum') ||
        line.includes('rule_execution_duration_seconds_count')
      );
      histogramLines.forEach(line => {
        expect(line).not.toContain('ruleChainId');
      });
    });
  });

  describe('Gauge Operations', () => {
    test('should set gauge value', () => {
      metricsManager.setGauge('rule_execution_nodes_executed', {
        ruleChainId: '1'
      }, 5);

      const metrics = metricsManager.getPrometheusMetrics();
      expect(metrics).toContain('rule_execution_nodes_executed{ruleChainId="1"} 5');
    });

    test('should update gauge value', () => {
      metricsManager.setGauge('test_gauge', { id: '1' }, 10);
      metricsManager.setGauge('test_gauge', { id: '1' }, 20);

      const metrics = metricsManager.getPrometheusMetrics();
      expect(metrics).toContain('test_gauge{id="1"} 20');
    });
  });

  describe('Prometheus Format', () => {
    test('should generate valid Prometheus format', () => {
      metricsManager.incrementCounter('test_counter', { status: 'success' });
      metricsManager.observeHistogram('test_histogram', { type: 'sensor' }, 0.1);
      metricsManager.setGauge('test_gauge', { id: '1' }, 5);

      const metrics = metricsManager.getPrometheusMetrics();

      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      expect(metrics).toContain('test_counter');
      expect(metrics).toContain('test_histogram');
      expect(metrics).toContain('test_gauge');
    });

    test('should include all metric types', () => {
      metricsManager.incrementCounter('rule_execution_total', {
        ruleChainId: '1',
        status: 'success'
      });
      metricsManager.observeHistogram('rule_execution_duration_seconds', {
        status: 'success'
      }, 0.5);
      metricsManager.setGauge('rule_execution_nodes_executed', {
        ruleChainId: '1'
      }, 3);

      const metrics = metricsManager.getPrometheusMetrics();

      expect(metrics).toContain('rule_execution_total');
      expect(metrics).toContain('rule_execution_duration_seconds');
      expect(metrics).toContain('rule_execution_nodes_executed');
    });
  });

  describe('Reset', () => {
    test('should reset all metrics', () => {
      metricsManager.incrementCounter('test_counter', { status: 'success' });
      metricsManager.observeHistogram('test_histogram', { type: 'sensor' }, 0.1);
      metricsManager.setGauge('test_gauge', { id: '1' }, 5);

      metricsManager.reset();

      const metrics = metricsManager.getPrometheusMetrics();
      expect(metrics).not.toContain('test_counter');
      expect(metrics).not.toContain('test_histogram');
      expect(metrics).not.toContain('test_gauge');
    });
  });
});
