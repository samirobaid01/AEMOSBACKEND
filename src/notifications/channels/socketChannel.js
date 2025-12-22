// src/notifications/channels/socketChannel.js
const socketManager = require('../../utils/socketManager');

module.exports = {
  name: 'socket',

  send: async (payload) => {
    if (!payload.userId) return;
    socketManager.sendNotification(payload.userId, payload);
  }
};
