const { Queue } = require('bullmq');
const redisConnection = require('../../config/redis');
const logger = require('../../utils/logger');

const queueName = 'rule-engine-events';

const ruleEngineQueue = new Queue(queueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 500 },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});

const getQueueMetrics = async () => {
  try {
    const counts = await ruleEngineQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    const workers = await ruleEngineQueue.getWorkers();
    const isPaused = await ruleEngineQueue.isPaused();

    return {
      counts,
      workers: {
        count: workers.length,
        list: workers
      },
      isPaused,
      health: calculateHealth(counts)
    };
  } catch (error) {
    logger.error(`Failed to get queue metrics: ${error.message}`);
    return {
      counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
      workers: { count: 0, list: [] },
      isPaused: false,
      health: 'unknown',
      error: error.message
    };
  }
};

const calculateHealth = (counts) => {
  const totalPending = (counts.waiting || 0) + (counts.active || 0);
  const warningThreshold = parseInt(process.env.QUEUE_WARNING_THRESHOLD || '10000', 10);
  const criticalThreshold = parseInt(process.env.QUEUE_CRITICAL_THRESHOLD || '50000', 10);

  if (totalPending >= criticalThreshold) {
    return 'critical';
  } else if (totalPending >= warningThreshold) {
    return 'warning';
  } else if (totalPending >= warningThreshold * 0.5) {
    return 'degraded';
  }
  return 'healthy';
};

const getQueueCounts = async () => {
  try {
    return await ruleEngineQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed'
    );
  } catch (error) {
    logger.error(`Failed to get queue counts: ${error.message}`);
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }
};

module.exports = {
  queueName,
  ruleEngineQueue,
  getQueueMetrics,
  getQueueCounts
};
