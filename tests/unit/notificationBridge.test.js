const notificationBridgeService = require('../../src/services/notificationBridgeService');
const redisConnection = require('../../src/config/redis');

jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  
  class RedisMock extends EventEmitter {
    constructor() {
      super();
      this.published = [];
      this.status = 'ready';
      this.connect = jest.fn(() => Promise.resolve());
    }

    async publish(channel, message) {
      this.published.push({ channel, message: JSON.parse(message) });
      return 1;
    }

    async subscribe(channel, callback) {
      if (callback) callback(null);
      return 1;
    }

    disconnect() {}
  }

  return RedisMock;
});

describe('NotificationBridgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    beforeEach(() => {
      if (notificationBridgeService.publisher) {
        notificationBridgeService.publisher.published = [];
      }
    });

    it('should publish notification with protocols', async () => {
      notificationBridgeService.initializePublisher();
      
      await notificationBridgeService.publish({
        type: 'socket',
        event: 'test-event',
        notification: { test: 'data' }
      });

      const published = notificationBridgeService.publisher.published[0];
      expect(published.message).toHaveProperty('protocols');
      expect(published.message).toHaveProperty('publishedAt');
      expect(published.message).toHaveProperty('type');
    });

    it('should preserve explicitly specified protocols', async () => {
      notificationBridgeService.initializePublisher();
      
      await notificationBridgeService.publish({
        type: 'multi-protocol',
        protocols: ['socket', 'mqtt', 'coap'],
        event: 'test-event',
        notification: { test: 'data' }
      });

      const published = notificationBridgeService.publisher.published[0];
      expect(published.message.protocols).toContain('socket');
      expect(published.message.protocols).toContain('mqtt');
      expect(published.message.protocols).toContain('coap');
    });

    it('should add publishedAt timestamp', async () => {
      notificationBridgeService.initializePublisher();
      
      await notificationBridgeService.publish({
        type: 'socket',
        event: 'test-event',
        notification: { test: 'data' }
      });

      const published = notificationBridgeService.publisher.published[0];
      expect(published.message).toHaveProperty('publishedAt');
      expect(typeof published.message.publishedAt).toBe('string');
      expect(new Date(published.message.publishedAt)).toBeInstanceOf(Date);
    });
  });

  describe('inferProtocols', () => {
    it('should infer socket protocol for socket type', () => {
      const protocols = notificationBridgeService.inferProtocols('socket');
      expect(protocols).toEqual(['socket']);
    });

    it('should infer mqtt protocol for mqtt type', () => {
      const protocols = notificationBridgeService.inferProtocols('mqtt');
      expect(protocols).toEqual(['mqtt']);
    });

    it('should infer coap protocol for coap type', () => {
      const protocols = notificationBridgeService.inferProtocols('coap');
      expect(protocols).toEqual(['coap']);
    });

    it('should infer all protocols for multi-protocol type', () => {
      const protocols = notificationBridgeService.inferProtocols('multi-protocol');
      expect(protocols).toEqual(['socket', 'mqtt', 'coap']);
    });

    it('should default to all protocols for unknown type', () => {
      const protocols = notificationBridgeService.inferProtocols('unknown');
      expect(protocols).toEqual(['socket', 'mqtt', 'coap']);
    });
  });

  describe('initialization', () => {
    beforeEach(() => {
      notificationBridgeService.publisher = null;
      notificationBridgeService.subscriber = null;
      notificationBridgeService.isPublisher = false;
      notificationBridgeService.isSubscriber = false;
    });

    it('should initialize publisher successfully and reuse shared connection', () => {
      notificationBridgeService.initializePublisher();
      expect(notificationBridgeService.isPublisher).toBe(true);
      expect(notificationBridgeService.publisher).toBeDefined();
      expect(notificationBridgeService.publisher).toBe(redisConnection);
    });

    it('should initialize subscriber successfully with separate connection', () => {
      const handler = jest.fn();
      notificationBridgeService.initializeSubscriber(handler);
      expect(notificationBridgeService.isSubscriber).toBe(true);
      expect(notificationBridgeService.subscriber).toBeDefined();
      expect(notificationBridgeService.subscriber).not.toBe(redisConnection);
    });

    it('should prevent dual-role misuse (cannot initialize publisher when subscriber active)', () => {
      const handler = jest.fn();
      notificationBridgeService.initializeSubscriber(handler);
      expect(notificationBridgeService.isSubscriber).toBe(true);

      expect(() => {
        notificationBridgeService.initializePublisher();
      }).toThrow('Cannot initialize publisher on subscriber instance');
    });

    it('should be idempotent (multiple initialization calls are safe)', () => {
      notificationBridgeService.initializePublisher();
      const firstPublisher = notificationBridgeService.publisher;
      
      notificationBridgeService.initializePublisher();
      expect(notificationBridgeService.publisher).toBe(firstPublisher);
    });

    it('should only call connect() when status is "end"', () => {
      const originalStatus = redisConnection.status;
      redisConnection.connect.mockClear();
      redisConnection.connect.mockResolvedValue();
      
      Object.defineProperty(redisConnection, 'status', {
        value: 'end',
        writable: true,
        configurable: true
      });

      notificationBridgeService.initializePublisher();
      expect(redisConnection.connect).toHaveBeenCalled();

      Object.defineProperty(redisConnection, 'status', {
        value: originalStatus,
        writable: true,
        configurable: true
      });
    });

    it('should not call connect() when status is "ready"', () => {
      const originalStatus = redisConnection.status;
      redisConnection.connect.mockClear();
      
      Object.defineProperty(redisConnection, 'status', {
        value: 'ready',
        writable: true,
        configurable: true
      });

      notificationBridgeService.initializePublisher();
      expect(redisConnection.connect).not.toHaveBeenCalled();

      Object.defineProperty(redisConnection, 'status', {
        value: originalStatus,
        writable: true,
        configurable: true
      });
    });

    it.skip('should call handler when message received (tested in integration)', () => {
      expect(true).toBe(true);
    });
  });

  describe('shutdown', () => {
    beforeEach(() => {
      notificationBridgeService.publisher = null;
      notificationBridgeService.subscriber = null;
      notificationBridgeService.isPublisher = false;
      notificationBridgeService.isSubscriber = false;
    });

    it('should not disconnect shared connection (publisher reuses redisConnection)', () => {
      redisConnection.connect.mockResolvedValue();
      notificationBridgeService.initializePublisher();
      const disconnectSpy = jest.spyOn(redisConnection, 'disconnect');
      
      notificationBridgeService.shutdown();
      
      expect(disconnectSpy).not.toHaveBeenCalled();
      expect(notificationBridgeService.publisher).toBeNull();
      expect(notificationBridgeService.isPublisher).toBe(false);
      
      disconnectSpy.mockRestore();
    });

    it('should disconnect subscriber connection', () => {
      const handler = jest.fn();
      notificationBridgeService.initializeSubscriber(handler);
      const disconnectSpy = jest.spyOn(notificationBridgeService.subscriber, 'disconnect');
      
      notificationBridgeService.shutdown();
      
      expect(disconnectSpy).toHaveBeenCalled();
      expect(notificationBridgeService.subscriber).toBeNull();
      expect(notificationBridgeService.isSubscriber).toBe(false);
    });

    it('should handle shutdown when publisher is separate connection (backward compatibility)', () => {
      const mockPublisher = {
        disconnect: jest.fn()
      };
      notificationBridgeService.publisher = mockPublisher;
      notificationBridgeService.isPublisher = true;
      
      notificationBridgeService.shutdown();
      
      expect(mockPublisher.disconnect).toHaveBeenCalled();
      expect(notificationBridgeService.publisher).toBeNull();
      expect(notificationBridgeService.isPublisher).toBe(false);
    });
  });
});
