const logger = require('../../utils/logger');
const { ruleEngineQueue, getQueueCounts } = require('./RuleEngineQueue');
const backpressureManager = require('../../services/backpressureManager');

const DEFAULT_PRIORITY_MAP = {
  'scheduled': 1,
  'critical-alarm': 1,
  'telemetry-data': 5,
  'batch-operation': 10
};

const emit = async (eventType, payload, options = {}) => {
  try {
    const priority = options.priority || DEFAULT_PRIORITY_MAP[eventType] || parseInt(process.env.DEFAULT_EVENT_PRIORITY || '5', 10);
    
    const queueCounts = await getQueueCounts();
    
    const backpressureCheck = backpressureManager.shouldAcceptEvent(queueCounts, priority);
    
    if (!backpressureCheck.accept) {
      logger.warn(`Event rejected due to backpressure`, {
        eventType,
        priority,
        reason: backpressureCheck.reason,
        queueDepth: backpressureCheck.queueDepth,
        threshold: backpressureCheck.threshold,
        circuitState: backpressureCheck.circuitState
      });
      
      return {
        rejected: true,
        reason: backpressureCheck.reason,
        queueDepth: backpressureCheck.queueDepth,
        eventType,
        priority
      };
    }

    const jobOptions = {
      ...options,
      priority
    };

    const job = await ruleEngineQueue.add(eventType, {
      eventType,
      payload,
      priority,
      enqueuedAt: new Date().toISOString()
    }, jobOptions);

    return {
      rejected: false,
      job,
      queueDepth: (queueCounts.waiting || 0) + (queueCounts.active || 0)
    };
  } catch (error) {
    logger.error(`Failed to enqueue rule engine event (${eventType}): ${error.message}`);
    return {
      rejected: true,
      reason: 'enqueue-error',
      error: error.message,
      eventType
    };
  }
};

module.exports = {
  emit
};
