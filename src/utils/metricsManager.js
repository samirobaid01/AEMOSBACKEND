const logger = require('./logger');

const MAX_LABEL_CARDINALITY = {
  ruleChainId: 200,
  organizationId: 100,
  status: 5,
  type: 5,
  method: 10,
  route: 50,
  status_code: 20,
  protocol: 5,
  result: 3,
  actionType: 10
};

const FORBIDDEN_LABELS = new Set([
  'sensorUUID',
  'deviceUUID',
  'userId',
  'telemetryDataId',
  'jobId',
  'requestId',
  'sessionId',
  'deviceToken'
]);

class MetricsManager {
  constructor() {
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
    this.labelValueSets = new Map();
    this.initializeLabelTracking();
  }

  initializeLabelTracking() {
    Object.keys(MAX_LABEL_CARDINALITY).forEach(labelName => {
      this.labelValueSets.set(labelName, new Set());
    });
  }

  validateLabel(labelName, labelValue) {
    if (FORBIDDEN_LABELS.has(labelName)) {
      throw new Error(`Forbidden label '${labelName}' detected. Use structured logging for per-device/per-sensor metrics.`);
    }

    const maxCardinality = MAX_LABEL_CARDINALITY[labelName];
    if (maxCardinality) {
      const valueSet = this.labelValueSets.get(labelName);
      if (!valueSet.has(labelValue)) {
        if (valueSet.size >= maxCardinality) {
          throw new Error(
            `Metric cardinality violation: label '${labelName}' exceeds maximum of ${maxCardinality} unique values. ` +
            `Current values: ${Array.from(valueSet).join(', ')}`
          );
        }
        valueSet.add(labelValue);
      }
    }
  }

  validateLabels(labels) {
    Object.entries(labels).forEach(([labelName, labelValue]) => {
      this.validateLabel(labelName, String(labelValue));
    });
  }

  getCounterKey(name, labels) {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  incrementCounter(name, labels = {}, value = 1) {
    this.validateLabels(labels);
    const key = this.getCounterKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  observeHistogram(name, labels = {}, value) {
    this.validateLabels(labels);
    const key = this.getCounterKey(name, labels);
    
    if (!this.histograms.has(key)) {
      let buckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10];
      
      if (name.includes('http_request')) {
        buckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2];
      } else if (name.includes('data_collection')) {
        buckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1];
      }
      
      this.histograms.set(key, {
        buckets,
        values: [],
        sum: 0,
        count: 0
      });
    }

    const histogram = this.histograms.get(key);
    histogram.values.push(value);
    histogram.sum += value;
    histogram.count += 1;

    if (histogram.values.length > 10000) {
      histogram.values.shift();
    }
  }

  setGauge(name, labels = {}, value) {
    this.validateLabels(labels);
    const key = this.getCounterKey(name, labels);
    this.gauges.set(key, value);
  }

  getHistogramBuckets(histogram, buckets) {
    const result = {};
    buckets.forEach(bucket => {
      result[`le_${bucket}`] = histogram.values.filter(v => v <= bucket).length;
    });
    result['le_inf'] = histogram.values.length;
    return result;
  }

  getPrometheusMetrics() {
    const lines = [];
    const processedMetrics = new Set();

    const outputHistogram = (metricName, helpText, filterLabels = []) => {
      if (processedMetrics.has(metricName)) return;
      processedMetrics.add(metricName);

      const histograms = Array.from(this.histograms.entries())
        .filter(([key]) => key.startsWith(metricName));
      
      if (histograms.length === 0) return;

      lines.push(`# HELP ${metricName} ${helpText}`);
      lines.push(`# TYPE ${metricName} histogram`);
      
      histograms.forEach(([key, histogram]) => {
        const labels = this.extractLabels(key);
        
        const filteredLabels = { ...labels };
        filterLabels.forEach(label => delete filteredLabels[label]);
        
        const labelStr = Object.entries(filteredLabels)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        
        const labelPrefix = labelStr ? `{${labelStr}}` : '';
        const buckets = this.getHistogramBuckets(histogram, histogram.buckets);
        histogram.buckets.forEach(bucket => {
          if (labelPrefix) {
            lines.push(`${metricName}_bucket${labelPrefix},le="${bucket}"} ${buckets[`le_${bucket}`]}`);
          } else {
            lines.push(`${metricName}_bucket{le="${bucket}"} ${buckets[`le_${bucket}`]}`);
          }
        });
        if (labelPrefix) {
          lines.push(`${metricName}_bucket${labelPrefix},le="+Inf"} ${buckets.le_inf}`);
          lines.push(`${metricName}_sum${labelPrefix} ${histogram.sum.toFixed(3)}`);
          lines.push(`${metricName}_count${labelPrefix} ${histogram.count}`);
        } else {
          lines.push(`${metricName}_bucket{le="+Inf"} ${buckets.le_inf}`);
          lines.push(`${metricName}_sum ${histogram.sum.toFixed(3)}`);
          lines.push(`${metricName}_count ${histogram.count}`);
        }
      });
    };

    const outputCounter = (metricName, helpText) => {
      if (processedMetrics.has(metricName)) return;
      processedMetrics.add(metricName);

      const counters = Array.from(this.counters.entries())
        .filter(([key]) => key.startsWith(metricName));
      
      if (counters.length === 0) return;

      lines.push(`# HELP ${metricName} ${helpText}`);
      lines.push(`# TYPE ${metricName} counter`);
      
      counters.forEach(([key, value]) => {
        lines.push(`${key} ${value}`);
      });
    };

    const outputGauge = (metricName, helpText) => {
      if (processedMetrics.has(metricName)) return;
      processedMetrics.add(metricName);

      const gauges = Array.from(this.gauges.entries())
        .filter(([key]) => key.startsWith(metricName));
      
      if (gauges.length === 0) return;

      lines.push(`# HELP ${metricName} ${helpText}`);
      lines.push(`# TYPE ${metricName} gauge`);
      
      gauges.forEach(([key, value]) => {
        lines.push(`${key} ${value}`);
      });
    };

    outputHistogram('rule_execution_duration_seconds', 'Duration of rule chain execution (system-wide)', ['ruleChainId']);

    outputCounter('rule_execution_total', 'Total number of rule chain executions');
    outputGauge('rule_execution_nodes_executed', 'Number of nodes executed per rule chain');
    outputCounter('rule_filter_evaluations_total', 'Total filter evaluations');
    outputCounter('rule_action_executions_total', 'Total action executions');
    outputHistogram('data_collection_duration_seconds', 'Duration of sensor/device data collection');
    outputCounter('data_collection_total', 'Total data collection attempts');
    outputHistogram('http_request_duration_seconds', 'Duration of HTTP requests');
    outputCounter('http_requests_total', 'Total HTTP requests');
    outputCounter('telemetry_ingestion_total', 'Total telemetry data points ingested');
    outputCounter('notifications_sent_total', 'Total notifications sent');
    outputCounter('device_state_changes_total', 'Total device state changes');

    const remainingCounters = Array.from(this.counters.entries())
      .filter(([key]) => !processedMetrics.has(key.split('{')[0]));
    
    if (remainingCounters.length > 0) {
      const metricGroups = new Map();
      remainingCounters.forEach(([key, value]) => {
        const metricName = key.split('{')[0];
        if (!metricGroups.has(metricName)) {
          metricGroups.set(metricName, []);
        }
        metricGroups.get(metricName).push([key, value]);
      });

      metricGroups.forEach((entries, metricName) => {
        lines.push(`# HELP ${metricName} Custom counter metric`);
        lines.push(`# TYPE ${metricName} counter`);
        entries.forEach(([key, value]) => {
          lines.push(`${key} ${value}`);
        });
        lines.push('');
      });
    }

    const remainingHistograms = Array.from(this.histograms.entries())
      .filter(([key]) => !processedMetrics.has(key.split('{')[0]));
    
    if (remainingHistograms.length > 0) {
      const metricGroups = new Map();
      remainingHistograms.forEach(([key, histogram]) => {
        const metricName = key.split('{')[0];
        if (!metricGroups.has(metricName)) {
          metricGroups.set(metricName, []);
        }
        metricGroups.get(metricName).push([key, histogram]);
      });

      metricGroups.forEach((entries, metricName) => {
        lines.push(`# HELP ${metricName} Custom histogram metric`);
        lines.push(`# TYPE ${metricName} histogram`);
        entries.forEach(([key, histogram]) => {
          const labels = this.extractLabels(key);
          const filteredLabels = { ...labels };
          delete filteredLabels.ruleChainId;
          
          const labelStr = Object.entries(filteredLabels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
          
          const labelPrefix = labelStr ? `{${labelStr}}` : '';
          const buckets = this.getHistogramBuckets(histogram, histogram.buckets);
          histogram.buckets.forEach(bucket => {
            if (labelPrefix) {
              lines.push(`${metricName}_bucket${labelPrefix},le="${bucket}"} ${buckets[`le_${bucket}`]}`);
            } else {
              lines.push(`${metricName}_bucket{le="${bucket}"} ${buckets[`le_${bucket}`]}`);
            }
          });
          if (labelPrefix) {
            lines.push(`${metricName}_bucket${labelPrefix},le="+Inf"} ${buckets.le_inf}`);
          } else {
            lines.push(`${metricName}_bucket{le="+Inf"} ${buckets.le_inf}`);
          }
          if (labelPrefix) {
            lines.push(`${metricName}_sum${labelPrefix} ${histogram.sum.toFixed(3)}`);
            lines.push(`${metricName}_count${labelPrefix} ${histogram.count}`);
          } else {
            lines.push(`${metricName}_sum ${histogram.sum.toFixed(3)}`);
            lines.push(`${metricName}_count ${histogram.count}`);
          }
        });
        lines.push('');
      });
    }

    const remainingGauges = Array.from(this.gauges.entries())
      .filter(([key]) => !processedMetrics.has(key.split('{')[0]));
    
    if (remainingGauges.length > 0) {
      const metricGroups = new Map();
      remainingGauges.forEach(([key, value]) => {
        const metricName = key.split('{')[0];
        if (!metricGroups.has(metricName)) {
          metricGroups.set(metricName, []);
        }
        metricGroups.get(metricName).push([key, value]);
      });

      metricGroups.forEach((entries, metricName) => {
        lines.push(`# HELP ${metricName} Custom gauge metric`);
        lines.push(`# TYPE ${metricName} gauge`);
        entries.forEach(([key, value]) => {
          lines.push(`${key} ${value}`);
        });
        lines.push('');
      });
    }

    return lines.join('\n').replace(/\n\n\n+/g, '\n\n').trim();
  }

  extractLabels(key) {
    const match = key.match(/\{([^}]+)\}/);
    if (!match) return {};
    
    const labels = {};
    match[1].split(',').forEach(pair => {
      const [name, value] = pair.split('=');
      if (name && value) {
        labels[name.trim()] = value.trim().replace(/"/g, '');
      }
    });
    return labels;
  }

  reset() {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.initializeLabelTracking();
  }
}

module.exports = new MetricsManager();
