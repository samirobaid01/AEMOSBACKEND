const Redis = require('ioredis');
const logger = require('../utils/logger');
const redisConnection = require('../config/redis');

const NOTIFICATION_CHANNEL = 'notifications:device-state-change';

class NotificationBridgeService {
  constructor() {
    this.publisher = null;
    this.subscriber = null;
    this.isPublisher = false;
    this.isSubscriber = false;
  }

  initializePublisher() {
    if (this.publisher) {
      logger.warn('Notification publisher already initialized');
      return;
    }

    // Prevent dual-role misuse: cannot initialize publisher if subscriber is active
    if (this.isSubscriber) {
      throw new Error('Cannot initialize publisher on subscriber instance');
    }

    try {
      const nodeEnv = process.env.NODE_ENV || 'development';
      const redisPassword = process.env.REDIS_PASSWORD;
      
      if (nodeEnv === 'production' && !redisPassword) {
        throw new Error('REDIS_PASSWORD required for notification bridge in production');
      }

      // Reuse shared connection instead of creating new one
      // NOTE: redisConnection lifecycle is managed globally by the application.
      // NotificationBridge must never disconnect it, as it's shared with:
      // - BullMQ (RuleEngineQueue, RuleEngineWorker)
      // - RuleChainIndex (caching)
      // - Health routes (readiness checks)
      this.publisher = redisConnection;
      
      // CRITICAL: Only call connect() when status === 'end' to avoid race conditions
      // Other states (connecting, ready, reconnecting) should be left alone
      // Calling connect() during these states can cause:
      // - Thrown errors
      // - Unnecessary reconnect logic
      // - Race conditions with BullMQ, Indexing, Health checks
      if (redisConnection.status === 'end') {
        redisConnection.connect().catch(err => {
          logger.error('Failed to connect shared Redis for publisher:', err);
        });
      }

      this.isPublisher = true;
      logger.info('Notification publisher initialized (reusing shared Redis connection)');
    } catch (error) {
      logger.error('Failed to initialize notification publisher:', error);
      throw error;
    }
  }

  initializeSubscriber(handler) {
    if (this.subscriber) {
      logger.warn('Notification subscriber already initialized');
      return;
    }

    try {
      const nodeEnv = process.env.NODE_ENV || 'development';
      const redisPassword = process.env.REDIS_PASSWORD;
      
      if (nodeEnv === 'production' && !redisPassword) {
        throw new Error('REDIS_PASSWORD required for notification bridge in production');
      }

      this.subscriber = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: redisPassword || undefined,
        username: process.env.REDIS_USERNAME || undefined,
        lazyConnect: false,
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });

      this.subscriber.on('error', (err) => {
        if (err.message.includes('NOAUTH') || err.message.includes('Authentication')) {
          logger.error('Notification subscriber authentication failed');
        } else {
          logger.error('Notification subscriber error:', err);
        }
      });

      let hasSubscribed = false;
      
      const subscribeToChannel = () => {
        this.subscriber.subscribe(NOTIFICATION_CHANNEL, (err) => {
          if (err) {
            logger.error('Failed to subscribe to notifications channel:', err);
          } else {
            logger.info(`Subscribed to ${NOTIFICATION_CHANNEL}`);
            hasSubscribed = true;
          }
        });
      };

      this.subscriber.on('reconnecting', () => {
        logger.warn('Redis subscriber reconnecting...');
        hasSubscribed = false;
      });

      this.subscriber.once('ready', () => {
        if (!hasSubscribed) {
          subscribeToChannel();
        }
      });

      if (this.subscriber.status === 'ready') {
        subscribeToChannel();
      }

      this.subscriber.on('ready', () => {
        if (!hasSubscribed) {
          subscribeToChannel();
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
      throw error;
    }
  }

  async publish(notification) {
    if (!this.publisher || !this.isPublisher) {
      logger.debug('Notification publisher not initialized, skipping publish');
      return;
    }

    try {
      const enrichedNotification = {
        ...notification,
        protocols: notification.protocols || this.inferProtocols(notification.type),
        publishedAt: new Date().toISOString()
      };

      const message = JSON.stringify(enrichedNotification);
      await this.publisher.publish(NOTIFICATION_CHANNEL, message);
      logger.debug('Published multi-protocol notification to Redis', {
        type: enrichedNotification.type,
        protocols: enrichedNotification.protocols
      });
    } catch (error) {
      logger.error('Error publishing notification:', error);
    }
  }

  inferProtocols(notificationType) {
    const protocolMap = {
      'socket': ['socket'],
      'mqtt': ['mqtt'],
      'coap': ['coap'],
      'multi-protocol': ['socket', 'mqtt', 'coap']
    };

    return protocolMap[notificationType] || ['socket', 'mqtt', 'coap'];
  }

  /**
   * Shutdown publisher and subscriber
   * NOTE: redisConnection lifecycle is managed globally.
   * NotificationBridge must never disconnect it.
   */
  shutdown() {
    // Don't disconnect shared connection - it's used by other services
    // Only disconnect if publisher is a separate connection (shouldn't happen after refactor)
    if (this.publisher && this.publisher !== redisConnection) {
      this.publisher.disconnect();
    }
    this.publisher = null;
    this.isPublisher = false;

    if (this.subscriber) {
      this.subscriber.disconnect();
      this.subscriber = null;
      this.isSubscriber = false;
    }

    logger.info('Notification bridge shut down');
  }
}

module.exports = new NotificationBridgeService();
