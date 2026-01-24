const { Worker } = require('bullmq');
const logger = require('../../utils/logger');
const redisConnection = require('../../config/redis');
const { queueName } = require('./RuleEngineQueue');
const { ruleChainService } = require('../../services/ruleChainService');

let workerInstance = null;

const processEvent = async (job) => {
  const { eventType, payload } = job.data || {};

  if (!eventType) {
    return { status: 'ignored', reason: 'Missing eventType' };
  }

  switch (eventType) {
    case 'telemetry-data': {
      const sensorUUID = payload?.sensorUUID;
      if (!sensorUUID) {
        return { status: 'ignored', reason: 'Missing sensorUUID' };
      }

      const result = await ruleChainService.trigger(sensorUUID);
      return { status: 'ok', result };
    }
    case 'scheduled': {
      const ruleChainId = payload?.ruleChainId;
      if (!ruleChainId) {
        return { status: 'ignored', reason: 'Missing ruleChainId' };
      }

      const result = await ruleChainService.execute(ruleChainId, {
        sensorData: [],
        deviceData: []
      });
      return { status: 'ok', result };
    }
    default:
      return { status: 'ignored', reason: `Unknown eventType ${eventType}` };
  }
};

const start = () => {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(queueName, processEvent, {
    connection: redisConnection,
    concurrency: parseInt(process.env.RULE_ENGINE_WORKER_CONCURRENCY || '20', 10)
  });

  workerInstance.on('completed', (job) => {
    logger.debug(`Rule engine job ${job.id} completed`);
  });

  workerInstance.on('failed', (job, error) => {
    logger.error(`Rule engine job ${job?.id} failed: ${error.message}`);
  });

  logger.info('Rule engine worker started');
  return workerInstance;
};

const stop = async () => {
  if (!workerInstance) return;
  await workerInstance.close();
  workerInstance = null;
};

module.exports = {
  start,
  stop
};
