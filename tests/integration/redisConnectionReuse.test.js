const notificationBridgeService = require('../../src/services/notificationBridgeService');
const redisConnection = require('../../src/config/redis');

describe('Redis Connection Reuse - Integration Tests', () => {
  beforeEach(() => {
    notificationBridgeService.publisher = null;
    notificationBridgeService.subscriber = null;
    notificationBridgeService.isPublisher = false;
    notificationBridgeService.isSubscriber = false;
  });

  afterEach(() => {
    notificationBridgeService.shutdown();
  });

  describe('Connection Reuse', () => {
    it('should reuse shared redisConnection for publisher', () => {
      notificationBridgeService.initializePublisher();
      
      expect(notificationBridgeService.publisher).toBe(redisConnection);
      expect(notificationBridgeService.isPublisher).toBe(true);
    });

    it('should create separate connection for subscriber', () => {
      const handler = jest.fn();
      notificationBridgeService.initializeSubscriber(handler);
      
      expect(notificationBridgeService.subscriber).not.toBe(redisConnection);
      expect(notificationBridgeService.isSubscriber).toBe(true);
    });

    it('should publish using shared connection', async () => {
      notificationBridgeService.initializePublisher();
      
      const notification = {
        type: 'socket',
        event: 'test-event',
        notification: { test: 'data' }
      };

      await expect(
        notificationBridgeService.publish(notification)
      ).resolves.not.toThrow();
    });
  });

  describe('Redis Reconnect During Publish', () => {
    it('should handle Redis disconnection and reconnection gracefully', async () => {
      notificationBridgeService.initializePublisher();
      
      const notification = {
        type: 'socket',
        event: 'test-event',
        notification: { test: 'data' }
      };

      await expect(
        notificationBridgeService.publish(notification)
      ).resolves.not.toThrow();

      if (redisConnection.status === 'ready') {
        redisConnection.disconnect();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await expect(
          notificationBridgeService.publish(notification)
        ).resolves.not.toThrow();
      }
    }, 10000);
  });

  describe('Shutdown Safety', () => {
    it('should not disconnect shared connection on shutdown', () => {
      notificationBridgeService.initializePublisher();
      const disconnectSpy = jest.spyOn(redisConnection, 'disconnect');
      
      notificationBridgeService.shutdown();
      
      expect(disconnectSpy).not.toHaveBeenCalled();
      
      disconnectSpy.mockRestore();
    });

    it('should disconnect subscriber connection on shutdown', () => {
      const handler = jest.fn();
      notificationBridgeService.initializeSubscriber(handler);
      const disconnectSpy = jest.spyOn(notificationBridgeService.subscriber, 'disconnect');
      
      notificationBridgeService.shutdown();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});
