// src/notifications/NotificationManager.js
const NotificationQueue = require('./NotificationQueue');
const NotificationPayload = require('./NotificationPayload');
const channelFactory = require('./factory/channelFactory');
const EventBus = require('./NotificationEventBus');
const { Notification } = require('../models/notification');

class NotificationManager {
  // PERSIST + ENQUEUE
  static async notify(payload) {
    const valid = NotificationPayload.validate(payload);
    if (!valid.success) {
      throw new Error(`Invalid notification payload: ${valid.error}`);
    }

    const saved = await Notification.create({
      type: payload.type,
      title: payload.title,
      message: payload.message,
      severity: payload.severity,
      userId: payload.userId,
      organizationId: payload.organizationId,
      meta: JSON.stringify(payload.meta || {}),
    });

    payload.id = saved.id;

    await NotificationQueue.add('send-notification', payload);
    return saved;
  }

  // 🚀 DISPATCH (NO DB, PURE LOGIC)
  static async dispatch(job) {
    const { channels = [], data } = job;

    for (const channelName of channels) {
      const channel = channelFactory.get(channelName);
      if (!channel) continue;

      await channel.send(data);
    }

    EventBus.emit('notification.sent', { channels, data });
  }
}

module.exports = NotificationManager;
