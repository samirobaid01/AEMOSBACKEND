// src/notifications/NotificationWorker.js
const { Worker } = require('bullmq');
const channelFactory = require('./factory/channelFactory');
const eventBus = require('./NotificationEventBus');
const connection = require('./redisConnection');

// ✅ EXTRACTED processor
async function notificationProcessor(job) {
  const payload = job.data;

  const channels = channelFactory.getChannels();

  for (const channel of channels) {
    try {
      await channel.send(payload);
    } catch (e) {
      console.error(`[NotificationWorker] Failed in ${channel.name}:`, e);
    }
  }

  eventBus.emit('notification.sent', payload);
  return true;
}

// Worker uses the extracted processor
const worker = new Worker(
  'notifications',
  notificationProcessor,
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Notification job completed (ID: ${job.id})`);
});

worker.on('failed', (job, err) => {
  console.error(`Notification job failed (ID: ${job.id})`, err);
});

// ✅ Export both
module.exports = {
  worker,
  notificationProcessor
};
