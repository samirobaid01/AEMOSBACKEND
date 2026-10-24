const { initialize } = require('unleash-client');

const unleash = initialize({
  url: process.env.UNLEASH_URL,
  appName: 'aemos-api',
  instanceId: process.env.INSTANCE_ID,
});

module.exports = unleash;
