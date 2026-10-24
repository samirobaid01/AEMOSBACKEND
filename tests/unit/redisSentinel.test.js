/**
 * Unit tests for Redis Sentinel support (P4.7).
 */

let capturedOptions = null;

jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  return jest.fn().mockImplementation((opts) => {
    capturedOptions = opts;
    const emitter = new EventEmitter();
    emitter.on = jest.fn();
    return emitter;
  });
});

jest.mock('../../src/utils/logger', () => ({
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
}));

describe('Redis config — Sentinel mode (P4.7)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    capturedOptions = null;
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    delete process.env.REDIS_SENTINEL_HOSTS;
    delete process.env.REDIS_SENTINEL_NAME;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses standalone config (host/port) when REDIS_SENTINEL_HOSTS is unset', () => {
    process.env.REDIS_HOST = '192.168.1.10';
    process.env.REDIS_PORT = '6380';

    require('../../src/config/redis');

    expect(capturedOptions.host).toBe('192.168.1.10');
    expect(capturedOptions.port).toBe(6380);
    expect(capturedOptions.sentinels).toBeUndefined();
  });

  it('switches to Sentinel config when REDIS_SENTINEL_HOSTS is set', () => {
    process.env.REDIS_SENTINEL_HOSTS = 'sentinel1:26379,sentinel2:26379,sentinel3:26379';

    require('../../src/config/redis');

    expect(capturedOptions.sentinels).toHaveLength(3);
    expect(capturedOptions.sentinels[0]).toEqual({ host: 'sentinel1', port: 26379 });
    expect(capturedOptions.sentinels[2]).toEqual({ host: 'sentinel3', port: 26379 });
    expect(capturedOptions.host).toBeUndefined();
  });

  it('uses default master name "mymaster" when REDIS_SENTINEL_NAME is unset', () => {
    process.env.REDIS_SENTINEL_HOSTS = 'sentinel1:26379';

    require('../../src/config/redis');

    expect(capturedOptions.name).toBe('mymaster');
  });

  it('uses custom master name from REDIS_SENTINEL_NAME', () => {
    process.env.REDIS_SENTINEL_HOSTS = 'sentinel1:26379';
    process.env.REDIS_SENTINEL_NAME  = 'aemos-master';

    require('../../src/config/redis');

    expect(capturedOptions.name).toBe('aemos-master');
  });

  it('parses port as integer', () => {
    process.env.REDIS_SENTINEL_HOSTS = 'host:26380';

    require('../../src/config/redis');

    expect(capturedOptions.sentinels[0].port).toBe(26380);
    expect(typeof capturedOptions.sentinels[0].port).toBe('number');
  });
});
