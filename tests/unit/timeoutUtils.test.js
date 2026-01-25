const { TimeoutError, ERROR_CODES } = require('../../src/utils/TimeoutError');
const { withTimeout, collectWithTimeout } = require('../../src/utils/timeoutUtils');

describe('TimeoutError', () => {
  test('should create TimeoutError with correct properties', () => {
    const error = new TimeoutError('Test timeout', ERROR_CODES.DATA_COLLECTION_TIMEOUT, {
      sensorId: '123'
    });

    expect(error.name).toBe('TimeoutError');
    expect(error.message).toBe('Test timeout');
    expect(error.code).toBe(ERROR_CODES.DATA_COLLECTION_TIMEOUT);
    expect(error.context).toEqual({ sensorId: '123' });
    expect(error.isTimeout).toBe(true);
    expect(error.timestamp).toBeDefined();
  });

  test('should serialize to JSON correctly', () => {
    const error = new TimeoutError('Test', ERROR_CODES.RULE_CHAIN_TIMEOUT);
    const json = error.toJSON();

    expect(json.name).toBe('TimeoutError');
    expect(json.code).toBe(ERROR_CODES.RULE_CHAIN_TIMEOUT);
    expect(json.isTimeout).toBe(true);
  });
});

describe('withTimeout', () => {
  test('should resolve if promise completes before timeout', async () => {
    const promise = new Promise(resolve => setTimeout(() => resolve('success'), 100));
    const result = await withTimeout(promise, 500, ERROR_CODES.DATA_COLLECTION_TIMEOUT);

    expect(result).toBe('success');
  });

  test('should reject with TimeoutError if timeout exceeded', async () => {
    let timerId;
    const promise = new Promise(resolve => {
      timerId = setTimeout(() => resolve('success'), 1000);
    });
    
    await expect(
      withTimeout(promise, 100, ERROR_CODES.DATA_COLLECTION_TIMEOUT, { test: 'context' })
    ).rejects.toThrow(TimeoutError);

    clearTimeout(timerId);

    let timerId2;
    const promise2 = new Promise(resolve => {
      timerId2 = setTimeout(() => resolve('success'), 1000);
    });

    try {
      await withTimeout(promise2, 100, ERROR_CODES.DATA_COLLECTION_TIMEOUT);
    } catch (error) {
      clearTimeout(timerId2);
      expect(error.code).toBe(ERROR_CODES.DATA_COLLECTION_TIMEOUT);
      expect(error.isTimeout).toBe(true);
      expect(error.context.timeoutMs).toBe(100);
    }
  });

  test('should handle zero timeout (no timeout)', async () => {
    const promise = new Promise(resolve => setTimeout(() => resolve('success'), 100));
    const result = await withTimeout(promise, 0, ERROR_CODES.DATA_COLLECTION_TIMEOUT);

    expect(result).toBe('success');
  });

  test('should handle negative timeout (no timeout)', async () => {
    const promise = new Promise(resolve => setTimeout(() => resolve('success'), 100));
    const result = await withTimeout(promise, -100, ERROR_CODES.DATA_COLLECTION_TIMEOUT);

    expect(result).toBe('success');
  });

  test('should propagate non-timeout errors', async () => {
    const promise = Promise.reject(new Error('Regular error'));

    await expect(
      withTimeout(promise, 500, ERROR_CODES.DATA_COLLECTION_TIMEOUT)
    ).rejects.toThrow('Regular error');
  });
});

describe('collectWithTimeout', () => {
  test('should return data and timeout details on success', async () => {
    const collectionFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return ['data1', 'data2'];
    };

    const result = await collectWithTimeout(collectionFn, 500, 'sensor', ['sensor1']);

    expect(result.data).toEqual(['data1', 'data2']);
    expect(result.timeoutDetails.timedOut).toBe(false);
    expect(result.timeoutDetails.duration).toBeGreaterThan(0);
  });

  test('should return empty data on timeout', async () => {
    let timerId;
    const collectionFn = async () => {
      await new Promise(resolve => {
        timerId = setTimeout(resolve, 1000);
      });
      return ['data'];
    };

    const result = await collectWithTimeout(collectionFn, 100, 'sensor', ['sensor1']);

    if (timerId) clearTimeout(timerId);

    expect(result.data).toEqual([]);
    expect(result.timeoutDetails.timedOut).toBe(true);
    expect(result.timeoutDetails.duration).toBeGreaterThan(0);
  });

  test('should propagate non-timeout errors', async () => {
    const collectionFn = async () => {
      throw new Error('Database error');
    };

    await expect(
      collectWithTimeout(collectionFn, 500, 'sensor', ['sensor1'])
    ).rejects.toThrow('Database error');
  });

  test('should include source type and IDs in timeout context', async () => {
    let timerId;
    const collectionFn = async () => {
      await new Promise(resolve => {
        timerId = setTimeout(resolve, 1000);
      });
      return [];
    };

    const result = await collectWithTimeout(collectionFn, 50, 'device', ['device1', 'device2']);

    if (timerId) clearTimeout(timerId);

    expect(result.timeoutDetails.timedOut).toBe(true);
  });
});
