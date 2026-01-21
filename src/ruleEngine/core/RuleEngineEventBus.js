const logger = require('../../utils/logger');
const { ruleEngineQueue } = require('./RuleEngineQueue');

const emit = async (eventType, payload, options = {}) => {
  try {
    const job = await ruleEngineQueue.add(eventType, {
      eventType,
      payload,
      enqueuedAt: new Date().toISOString()
    }, options);

    return job;
  } catch (error) {
    logger.error(`Failed to enqueue rule engine event (${eventType}): ${error.message}`);
    return null;
  }
};

module.exports = {
  emit
};
