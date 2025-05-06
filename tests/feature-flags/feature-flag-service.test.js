// tests/feature-flags/feature-flag-service.test.js
const originalEnv = process.env;

describe('Feature Flag Service', () => {
  let featureFlagService;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.ENABLE_FEATURE_FLAGS = 'true';
    featureFlagService = require('../../src/services/featureFlagService');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return false for disabled features', () => {
    process.env.ENABLE_NEW_SENSOR_ALGORITHM = 'false';
    jest.resetModules();
    featureFlagService = require('../../src/services/featureFlagService');
    
    expect(featureFlagService.isFeatureEnabled('new-sensor-algorithm')).toBe(false);
  });

  it('should return true for enabled features', () => {
    process.env.ENABLE_NEW_SENSOR_ALGORITHM = 'true';
    jest.resetModules();
    featureFlagService = require('../../src/services/featureFlagService');
    
    expect(featureFlagService.isFeatureEnabled('new-sensor-algorithm')).toBe(true);
  });

  it('should respect the feature flag system being disabled', () => {
    process.env.ENABLE_FEATURE_FLAGS = 'false';
    process.env.ENABLE_NEW_SENSOR_ALGORITHM = 'true';
    jest.resetModules();
    featureFlagService = require('../../src/services/featureFlagService');
    
    expect(featureFlagService.isFeatureEnabled('new-sensor-algorithm')).toBe(false);
  });
});