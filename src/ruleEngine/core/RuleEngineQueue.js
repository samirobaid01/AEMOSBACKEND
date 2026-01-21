const { Queue } = require('bullmq');
const redisConnection = require('../../config/redis');

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

module.exports = {
  queueName,
  ruleEngineQueue
};
