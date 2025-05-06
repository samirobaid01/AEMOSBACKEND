const features = require('../config/features');
let unleash = null;

if (features.featureFlags.enabled && features.featureFlags.provider === 'unleash') {
  const { initialize } = require('unleash-client');
  unleash = initialize({
    url: features.featureFlags.url,
    appName: 'aemos-api',
    instanceId: process.env.INSTANCE_ID || 'development',
  });
}

// Local feature flags if not using Unleash
const localFlags = {
  'new-sensor-algorithm': process.env.ENABLE_NEW_SENSOR_ALGORITHM === 'true',
  'advanced-analytics': process.env.ENABLE_ADVANCED_ANALYTICS === 'true'
};

/**
 * Check if a feature flag is enabled
 */
function isFeatureEnabled(featureName, context = {}) {
  // If feature flags system is disabled, return false
  if (!features.featureFlags.enabled) return false;
  
  // If using Unleash
  if (features.featureFlags.provider === 'unleash' && unleash) {
    return unleash.isEnabled(featureName, context);
  }
  
  // Otherwise use local flags
  return localFlags[featureName] || false;
}

module.exports = {
  isFeatureEnabled
};
