const notificationBridgeService = require('../../src/services/notificationBridgeService');

jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  
  class RedisMock extends EventEmitter {
    constructor() {
      super();
      this.published = [];
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
    it('should initialize publisher successfully', () => {
      notificationBridgeService.initializePublisher();
      expect(notificationBridgeService.isPublisher).toBe(true);
      expect(notificationBridgeService.publisher).toBeDefined();
    });

    it('should initialize subscriber successfully', () => {
      const handler = jest.fn();
      notificationBridgeService.initializeSubscriber(handler);
      expect(notificationBridgeService.isSubscriber).toBe(true);
      expect(notificationBridgeService.subscriber).toBeDefined();
    });

    it.skip('should call handler when message received (tested in integration)', () => {
      expect(true).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should disconnect publisher and subscriber', () => {
      notificationBridgeService.initializePublisher();
      const mockDisconnect = jest.spyOn(notificationBridgeService.publisher, 'disconnect');
      
      notificationBridgeService.shutdown();
      
      expect(mockDisconnect).toHaveBeenCalled();
      expect(notificationBridgeService.publisher).toBeNull();
      expect(notificationBridgeService.isPublisher).toBe(false);
    });
  });
});
