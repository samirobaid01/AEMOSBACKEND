// src/notifications/NotificationEventBus.js
const EventEmitter = require('events');

class NotificationEventBus extends EventEmitter {}

module.exports = new NotificationEventBus();
