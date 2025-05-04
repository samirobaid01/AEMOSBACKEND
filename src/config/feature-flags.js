const { initialize } = require('unleash-client');

const unleash = initialize({
  url: process.env.UNLEASH_URL,
  appName: 'aemos-api',
  instanceId: process.env.INSTANCE_ID,
});

module.exports = unleash;

// Usage in code
const unleash = require('../config/feature-flags');

if (unleash.isEnabled('new-sensor-algorithm')) {
  // Use new algorithm
} else {
  // Use old algorithm
}
