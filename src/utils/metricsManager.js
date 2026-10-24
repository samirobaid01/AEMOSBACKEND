const promClient = require('prom-client');
const logger = require('./logger');

// Collect default Node.js process metrics (memory, CPU, GC, event-loop lag, etc.)
promClient.collectDefaultMetrics({ prefix: 'aemos_' });

const registry = promClient.register;

// Pre-declare all known application metrics with their label sets.
// prom-client requires label names to be fixed at creation time.
const metrics = {
  // --- counters ---
  rule_execution_total: new promClient.Counter({
    name: 'rule_execution_total',
    help: 'Total number of rule chain executions',
    labelNames: ['ruleChainId', 'status'],
  }),
  rule_filter_evaluations_total: new promClient.Counter({
    name: 'rule_filter_evaluations_total',
    help: 'Total filter evaluations',
    labelNames: ['ruleChainId', 'result'],
  }),
  rule_action_executions_total: new promClient.Counter({
    name: 'rule_action_executions_total',
    help: 'Total action executions',
    labelNames: ['ruleChainId', 'actionType'],
  }),
  data_collection_total: new promClient.Counter({
    name: 'data_collection_total',
    help: 'Total data collection attempts',
    labelNames: ['type', 'status'],
  }),
  http_requests_total: new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),
  telemetry_ingestion_total: new promClient.Counter({
    name: 'telemetry_ingestion_total',
    help: 'Total telemetry data points ingested',
    labelNames: ['status'],
  }),
  notifications_sent_total: new promClient.Counter({
    name: 'notifications_sent_total',
    help: 'Total notifications sent',
    labelNames: ['protocol'],
  }),
  device_state_changes_total: new promClient.Counter({
    name: 'device_state_changes_total',
    help: 'Total device state changes',
    labelNames: ['status'],
  }),

  // --- histograms ---
  rule_execution_duration_seconds: new promClient.Histogram({
    name: 'rule_execution_duration_seconds',
    help: 'Duration of rule chain execution',
    labelNames: ['status'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  }),
  data_collection_duration_seconds: new promClient.Histogram({
    name: 'data_collection_duration_seconds',
    help: 'Duration of sensor/device data collection',
    labelNames: ['type', 'status'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  }),
  http_request_duration_seconds: new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
  }),

  // --- gauges ---
  rule_execution_nodes_executed: new promClient.Gauge({
    name: 'rule_execution_nodes_executed',
    help: 'Number of nodes executed per rule chain',
    labelNames: ['ruleChainId'],
  }),
};

const FORBIDDEN_LABELS = new Set([
  'sensorUUID', 'deviceUUID', 'userId',
  'telemetryDataId', 'jobId', 'requestId', 'sessionId', 'deviceToken',
]);

class MetricsManager {
  _validateLabels(labels) {
    for (const name of Object.keys(labels)) {
      if (FORBIDDEN_LABELS.has(name)) {
        throw new Error(`Forbidden label '${name}' detected.`);
      }
    }
  }

  incrementCounter(name, labels = {}, value = 1) {
    this._validateLabels(labels);
    const m = metrics[name];
    if (!m || !(m instanceof promClient.Counter)) {
      logger.warn(`incrementCounter: unknown or wrong-type metric "${name}"`);
      return;
    }
    m.inc(labels, value);
  }

  observeHistogram(name, labels = {}, value) {
    this._validateLabels(labels);
    const m = metrics[name];
    if (!m || !(m instanceof promClient.Histogram)) {
      logger.warn(`observeHistogram: unknown or wrong-type metric "${name}"`);
      return;
    }
    m.observe(labels, value);
  }

  setGauge(name, labels = {}, value) {
    this._validateLabels(labels);
    const m = metrics[name];
    if (!m || !(m instanceof promClient.Gauge)) {
      logger.warn(`setGauge: unknown or wrong-type metric "${name}"`);
      return;
    }
    m.set(labels, value);
  }

  async getPrometheusMetrics() {
    return registry.metrics();
  }

  getContentType() {
    return registry.contentType;
  }

  reset() {
    registry.resetMetrics();
  }
}

module.exports = new MetricsManager();
