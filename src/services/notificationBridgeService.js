/**
 * Notification Bridge Service
 * 
 * Bridges notifications between worker processes and the main server via Redis pub/sub.
 * Workers publish notifications, main server subscribes and emits via Socket.IO/MQTT/CoAP.
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

const NOTIFICATION_CHANNEL = 'notifications:device-state-change';

class NotificationBridgeService {
  constructor() {
    this.publisher = null;
    this.subscriber = null;
    this.isPublisher = false;
    this.isSubscriber = false;
  }

  /**
   * Initialize as publisher (for worker processes)
   */
  initializePublisher() {
    if (this.publisher) {
      logger.warn('Notification publisher already initialized');
      return;
    }

    try {
      this.publisher = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: false,
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });

      this.publisher.on('error', (err) => {
        logger.error('Notification publisher error:', err);
      });

      this.isPublisher = true;
      logger.info('Notification publisher initialized');
    } catch (error) {
      logger.error('Failed to initialize notification publisher:', error);
    }
  }

  /**
   * Initialize as subscriber (for main server process)
   * @param {Function} handler - Handler function to call when notification is received
   */
  initializeSubscriber(handler) {
    if (this.subscriber) {
      logger.warn('Notification subscriber already initialized');
      return;
    }

    try {
      this.subscriber = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: false,
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });

      this.subscriber.on('error', (err) => {
        logger.error('Notification subscriber error:', err);
      });

      this.subscriber.subscribe(NOTIFICATION_CHANNEL, (err) => {
        if (err) {
          logger.error('Failed to subscribe to notifications channel:', err);
        } else {
          logger.info(`Subscribed to ${NOTIFICATION_CHANNEL}`);
        }
      });

      this.subscriber.on('message', (channel, message) => {
        if (channel === NOTIFICATION_CHANNEL) {
          try {
            const notification = JSON.parse(message);
            handler(notification);
          } catch (error) {
            logger.error('Error parsing notification message:', error);
          }
        }
      });

      this.isSubscriber = true;
      logger.info('Notification subscriber initialized');
    } catch (error) {
      logger.error('Failed to initialize notification subscriber:', error);
    }
  }

  /**
   * Publish a notification (called from worker)
   * @param {Object} notification - Notification payload
   */
  async publish(notification) {
    if (!this.publisher || !this.isPublisher) {
      logger.debug('Notification publisher not initialized, skipping publish');
      return;
    }

    try {
      const message = JSON.stringify(notification);
      await this.publisher.publish(NOTIFICATION_CHANNEL, message);
      logger.debug('Published notification to Redis');
    } catch (error) {
      logger.error('Error publishing notification:', error);
    }
  }

  /**
   * Shutdown publisher and subscriber
   */
  shutdown() {
    if (this.publisher) {
      this.publisher.disconnect();
      this.publisher = null;
      this.isPublisher = false;
    }

    if (this.subscriber) {
      this.subscriber.disconnect();
      this.subscriber = null;
      this.isSubscriber = false;
    }

    logger.info('Notification bridge shut down');
  }
}

module.exports = new NotificationBridgeService();
