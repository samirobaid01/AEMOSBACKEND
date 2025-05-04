// tests/config/features.test.js
const originalEnv = process.env;

describe('Feature Configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should enable features by default', () => {
    const features = require('../../src/config/features');
    expect(features.security.helmet).toBe(true);
  });

  it('should disable features when env var is set to false', () => {
    process.env.ENABLE_HELMET = 'false';
    const features = require('../../src/config/features');
    expect(features.security.helmet).toBe(false);
  });

  it('should use custom values from env vars', () => {
    process.env.RATE_LIMIT_MAX = '50';
    const features = require('../../src/config/features');
    expect(features.security.rateLimit.max).toBe(50);
  });
});