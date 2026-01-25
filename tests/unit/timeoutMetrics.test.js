const timeoutMetrics = require('../../src/utils/timeoutMetrics');
const { ERROR_CODES } = require('../../src/utils/TimeoutError');

describe('TimeoutMetrics', () => {
  beforeEach(() => {
    timeoutMetrics.reset();
  });

  test('should initialize counters for all error codes', () => {
    Object.values(ERROR_CODES).forEach(code => {
      expect(timeoutMetrics.getCounter(code)).toBe(0);
    });
  });

  test('should record timeout with correct error code', () => {
    timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, 5000);
    
    expect(timeoutMetrics.getCounter(ERROR_CODES.DATA_COLLECTION_TIMEOUT)).toBe(1);
    expect(timeoutMetrics.getCounter(ERROR_CODES.RULE_CHAIN_TIMEOUT)).toBe(0);
  });

  test('should increment counter on multiple timeouts', () => {
    timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, 5000);
    timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, 6000);
    timeoutMetrics.recordTimeout(ERROR_CODES.RULE_CHAIN_TIMEOUT, 30000);

    expect(timeoutMetrics.getCounter(ERROR_CODES.DATA_COLLECTION_TIMEOUT)).toBe(2);
    expect(timeoutMetrics.getCounter(ERROR_CODES.RULE_CHAIN_TIMEOUT)).toBe(1);
  });

  test('should ignore invalid error codes', () => {
    timeoutMetrics.recordTimeout('INVALID_CODE', 5000);
    
    Object.values(ERROR_CODES).forEach(code => {
      expect(timeoutMetrics.getCounter(code)).toBe(0);
    });
  });

  test('should calculate histogram buckets correctly', () => {
    timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, 3000);
    timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, 8000);
    timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, 15000);

    const buckets = timeoutMetrics.getHistogramBuckets(ERROR_CODES.DATA_COLLECTION_TIMEOUT);
    
    expect(buckets.le_1).toBe(0);
    expect(buckets.le_5).toBe(1);
    expect(buckets.le_10).toBe(2);
    expect(buckets.le_30).toBe(3);
    expect(buckets.le_60).toBe(3);
    expect(buckets.le_inf).toBe(3);
  });

  test('should limit duration history to 1000 entries', () => {
    for (let i = 0; i < 1500; i++) {
      timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, 5000);
    }

    const buckets = timeoutMetrics.getHistogramBuckets(ERROR_CODES.DATA_COLLECTION_TIMEOUT);
    expect(buckets.le_inf).toBeLessThanOrEqual(1000);
  });

  test('should generate valid Prometheus metrics', () => {
    timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, 5000);
    timeoutMetrics.recordTimeout(ERROR_CODES.RULE_CHAIN_TIMEOUT, 30000);

    const metrics = timeoutMetrics.getPrometheusMetrics();

    expect(metrics).toContain('rule_timeout_total');
    expect(metrics).toContain('rule_timeout_duration_seconds');
    expect(metrics).toContain(`error_code="${ERROR_CODES.DATA_COLLECTION_TIMEOUT}"`);
    expect(metrics).toContain(`error_code="${ERROR_CODES.RULE_CHAIN_TIMEOUT}"`);
    expect(metrics).toContain('le="1"');
    expect(metrics).toContain('le="5"');
    expect(metrics).toContain('le="inf"');
  });

  test('should reset all metrics', () => {
    timeoutMetrics.recordTimeout(ERROR_CODES.DATA_COLLECTION_TIMEOUT, 5000);
    timeoutMetrics.recordTimeout(ERROR_CODES.RULE_CHAIN_TIMEOUT, 30000);

    timeoutMetrics.reset();

    Object.values(ERROR_CODES).forEach(code => {
      expect(timeoutMetrics.getCounter(code)).toBe(0);
      const buckets = timeoutMetrics.getHistogramBuckets(code);
      expect(buckets.le_inf).toBe(0);
    });
  });
});
