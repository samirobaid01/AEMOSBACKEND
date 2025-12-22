// src/notifications/factory/channelFactory.js
const socketChannel = require('../channels/socketChannel');
const emailChannel = require('../channels/emailChannel');
const smsChannel = require('../channels/smsChannel');

const channelMap = {
  socket: socketChannel,
  email: emailChannel,
  sms: smsChannel,
};

module.exports = {
  getChannels() {
    return [socketChannel, emailChannel, smsChannel];
  },
  // NEW API (needed by dispatcher)
  get(name) {
    return channelMap[name];
  }
};
