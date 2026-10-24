/**
 * Unit tests for TimeSeriesRepository base class and factory.
 */

describe('TimeSeriesRepository (base class)', () => {
  let TimeSeriesRepository;

  beforeEach(() => {
    jest.isolateModules(() => {
      TimeSeriesRepository = require('../../src/repositories/timeseries/TimeSeriesRepository');
    });
  });

  const methods = ['insert', 'queryLatest', 'queryRange', 'deleteOlderThan', 'healthCheck'];

  methods.forEach(method => {
    it(`${method}() throws "Not implemented"`, async () => {
      const repo = new TimeSeriesRepository();
      await expect(repo[method]()).rejects.toThrow('Not implemented');
    });
  });
});

describe('TimeSeriesRepositoryFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults to mysql adapter when TIMESERIES_BACKEND is unset', () => {
    delete process.env.TIMESERIES_BACKEND;

    jest.mock('../../src/repositories/timeseries/adapters/MySQLTimeSeriesAdapter', () => {
      return class MockMySQL {
        healthCheck() { return Promise.resolve({ ok: true, backend: 'mysql' }); }
      };
    });
    jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

    const instance = require('../../src/repositories/timeseries/TimeSeriesRepositoryFactory');
    expect(instance).toBeDefined();
    expect(typeof instance.healthCheck).toBe('function');
  });

  it('loads timescale adapter when TIMESERIES_BACKEND=timescale', () => {
    process.env.TIMESERIES_BACKEND = 'timescale';

    jest.mock('../../src/repositories/timeseries/adapters/TimescaleDBAdapter', () => {
      return class MockTimescale {
        healthCheck() { return Promise.resolve({ ok: true, backend: 'timescale' }); }
      };
    });
    jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

    const instance = require('../../src/repositories/timeseries/TimeSeriesRepositoryFactory');
    expect(instance).toBeDefined();
  });

  it('loads influx adapter when TIMESERIES_BACKEND=influx', () => {
    process.env.TIMESERIES_BACKEND = 'influx';

    jest.mock('../../src/repositories/timeseries/adapters/InfluxDBAdapter', () => {
      return class MockInflux {
        healthCheck() { return Promise.resolve({ ok: true, backend: 'influx' }); }
      };
    });
    jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

    const instance = require('../../src/repositories/timeseries/TimeSeriesRepositoryFactory');
    expect(instance).toBeDefined();
  });

  it('throws for unknown TIMESERIES_BACKEND value', () => {
    process.env.TIMESERIES_BACKEND = 'mongodb';
    jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

    expect(() => {
      require('../../src/repositories/timeseries/TimeSeriesRepositoryFactory');
    }).toThrow('Unknown TIMESERIES_BACKEND: "mongodb"');
  });
});
