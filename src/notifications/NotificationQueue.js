// src/notifications/NotificationQueue.js
const { Queue } = require('bullmq');
const connection = require('./redisConnection');

const queue = new Queue('notifications', { connection });

async function publish(payload) {
  return queue.add('notify', payload, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false
  });
}

module.exports = {
  queue,
  publish
};
