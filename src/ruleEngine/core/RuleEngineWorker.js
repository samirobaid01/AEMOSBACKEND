const { Worker } = require('bullmq');
const logger = require('../../utils/logger');
const redisConnection = require('../../config/redis');
const { queueName } = require('./RuleEngineQueue');
const { ruleChainService } = require('../../services/ruleChainService');
const config = require('../../config');
const { TimeoutError, ERROR_CODES } = require('../../utils/TimeoutError');
const timeoutMetrics = require('../../utils/timeoutMetrics');

let workerInstance = null;

const processEvent = async (job) => {
  const jobStartTime = Date.now();
  const { eventType, payload } = job.data || {};

  if (!eventType) {
    return { status: 'ignored', reason: 'Missing eventType' };
  }

  try {
    switch (eventType) {
      case 'telemetry-data': {
        const sensorUUID = payload?.sensorUUID;
        if (!sensorUUID) {
          return { status: 'ignored', reason: 'Missing sensorUUID' };
        }

        const variableNames = payload?.variableNames || [];
        const result = await ruleChainService.trigger(sensorUUID, variableNames);
        
        const duration = Date.now() - jobStartTime;
        logger.debug(`Rule engine job ${job.id} completed (telemetry-data)`, {
          sensorUUID,
          variableNames: variableNames.length,
          duration,
          ruleChainsExecuted: result?.totalRuleChains || 0
        });

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
        
        const duration = Date.now() - jobStartTime;
        logger.debug(`Rule engine job ${job.id} completed (scheduled)`, {
          ruleChainId,
          duration
        });

        return { status: 'ok', result };
      }
      default:
        return { status: 'ignored', reason: `Unknown eventType ${eventType}` };
    }
  } catch (error) {
    const duration = Date.now() - jobStartTime;

    if (error.isTimeout) {
      logger.error(`Rule engine job ${job.id} timed out`, {
        eventType,
        errorCode: error.code,
        duration,
        context: error.context
      });

      timeoutMetrics.recordTimeout(error.code, duration);
      throw error;
    }

    logger.error(`Rule engine job ${job.id} failed`, {
      eventType,
      error: error.message,
      duration
    });

    throw error;
  }
};

const start = () => {
  if (workerInstance) return workerInstance;

  const { timeouts } = config.ruleEngine;

  workerInstance = new Worker(queueName, processEvent, {
    connection: redisConnection,
    concurrency: config.ruleEngine.workerConcurrency,
    lockDuration: timeouts.workerLock,
    maxStalledCount: timeouts.workerMaxStalledCount
  });

  workerInstance.on('completed', (job) => {
    logger.debug(`Rule engine job ${job.id} completed`);
  });

  workerInstance.on('failed', (job, error) => {
    const errorCode = error.isTimeout ? error.code : 'UNKNOWN_ERROR';
    logger.error(`Rule engine job ${job?.id} failed`, {
      error: error.message,
      errorCode,
      isTimeout: error.isTimeout || false,
      attemptsMade: job?.attemptsMade || 0
    });

    if (error.isTimeout) {
      timeoutMetrics.recordTimeout(error.code, error.context?.duration || 0);
    }
  });

  workerInstance.on('stalled', (jobId) => {
    logger.warn(`Rule engine job ${jobId} stalled`);
  });

  logger.info('Rule engine worker started', {
    concurrency: config.ruleEngine.workerConcurrency,
    lockDuration: timeouts.workerLock,
    maxStalledCount: timeouts.workerMaxStalledCount
  });

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
