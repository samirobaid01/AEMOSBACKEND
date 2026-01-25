const { ERROR_CODES } = require('./TimeoutError');

class TimeoutMetrics {
  constructor() {
    this.counters = new Map();
    this.durations = new Map();
    this.initializeCounters();
  }

  initializeCounters() {
    Object.values(ERROR_CODES).forEach(code => {
      this.counters.set(code, 0);
      this.durations.set(code, []);
    });
  }

  recordTimeout(errorCode, durationMs) {
    if (!Object.values(ERROR_CODES).includes(errorCode)) {
      return;
    }

    const currentCount = this.counters.get(errorCode) || 0;
    this.counters.set(errorCode, currentCount + 1);

    const durations = this.durations.get(errorCode) || [];
    durations.push(durationMs / 1000);
    if (durations.length > 1000) {
      durations.shift();
    }
    this.durations.set(errorCode, durations);
  }

  getCounter(errorCode) {
    return this.counters.get(errorCode) || 0;
  }

  getHistogramBuckets(errorCode) {
    const durations = this.durations.get(errorCode) || [];
    const buckets = [1, 5, 10, 30, 60];
    const result = {};

    buckets.forEach(bucket => {
      result[`le_${bucket}`] = durations.filter(d => d <= bucket).length;
    });
    result['le_inf'] = durations.length;

    return result;
  }

  getPrometheusMetrics() {
    const lines = [];

    lines.push('# HELP rule_timeout_total Total number of rule execution timeouts by error code');
    lines.push('# TYPE rule_timeout_total counter');
    
    Object.values(ERROR_CODES).forEach(code => {
      const count = this.getCounter(code);
      lines.push(`rule_timeout_total{error_code="${code}"} ${count}`);
    });

    lines.push('');
    lines.push('# HELP rule_timeout_duration_seconds Duration of timed-out operations by error code');
    lines.push('# TYPE rule_timeout_duration_seconds histogram');
    
    Object.values(ERROR_CODES).forEach(code => {
      const buckets = this.getHistogramBuckets(code);
      Object.entries(buckets).forEach(([bucket, count]) => {
        const bucketLabel = bucket.replace('le_', '');
        lines.push(`rule_timeout_duration_seconds_bucket{error_code="${code}",le="${bucketLabel}"} ${count}`);
      });
    });

    Object.values(ERROR_CODES).forEach(code => {
      const durations = this.durations.get(code) || [];
      const sum = durations.reduce((acc, d) => acc + d, 0);
      const count = durations.length;
      lines.push(`rule_timeout_duration_seconds_sum{error_code="${code}"} ${sum}`);
      lines.push(`rule_timeout_duration_seconds_count{error_code="${code}"} ${count}`);
    });

    return lines.join('\n');
  }

  reset() {
    this.initializeCounters();
  }
}

module.exports = new TimeoutMetrics();
