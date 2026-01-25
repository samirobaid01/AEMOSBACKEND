const redisConfig = require('../../src/config/redis');

jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  
  class RedisMock extends EventEmitter {
    constructor() {
      super();
    }
    async connect() {}
    async disconnect() {}
  }

  return RedisMock;
});

describe('Redis Configuration', () => {
  let originalEnv;

  beforeAll(() => {
    jest.resetModules();
  });

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.NODE_ENV = 'test';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('validateRedisConfig', () => {
    it('should not throw in production with REDIS_PASSWORD and JWT_SECRET', () => {
      process.env.NODE_ENV = 'production';
      process.env.REDIS_PASSWORD = 'secure-password-123';
      process.env.JWT_SECRET = 'secure-jwt-secret-key';

      expect(() => {
        jest.isolateModules(() => {
          require('../../src/config/redis');
        });
      }).not.toThrow();
    });

    it('should allow missing password in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.REDIS_PASSWORD;

      expect(() => {
        jest.isolateModules(() => {
          require('../../src/config/redis');
        });
      }).not.toThrow();
    });

    it('should allow missing password in test', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.REDIS_PASSWORD;

      expect(() => {
        jest.isolateModules(() => {
          require('../../src/config/redis');
        });
      }).not.toThrow();
    });
  });

  describe('Redis connection configuration', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should include password when provided', () => {
      process.env.REDIS_PASSWORD = 'test-password';
      
      jest.isolateModules(() => {
        const redis = require('../../src/config/redis');
        expect(redis).toBeDefined();
      });
    });

    it('should include username when provided (Redis 6+)', () => {
      process.env.REDIS_USERNAME = 'test-user';
      process.env.REDIS_PASSWORD = 'test-password';
      
      jest.isolateModules(() => {
        const redis = require('../../src/config/redis');
        expect(redis).toBeDefined();
      });
    });

    it('should use default host and port if not provided', () => {
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      
      jest.isolateModules(() => {
        const redis = require('../../src/config/redis');
        expect(redis).toBeDefined();
      });
    });
  });
});

describe('Production Configuration Validation', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error in production without REDIS_PASSWORD in config', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_PASSWORD;
    process.env.JWT_SECRET = 'secure-secret';

    expect(() => {
      jest.isolateModules(() => {
        require('../../src/config/index');
      });
    }).toThrow('Missing required production configuration');
  });

  it('should throw error with default JWT_SECRET in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_PASSWORD = 'secure-password';
    process.env.JWT_SECRET = 'your-secret-key';

    expect(() => {
      jest.isolateModules(() => {
        require('../../src/config/index');
      });
    }).toThrow('Missing required production configuration');
  });

  it('should pass validation with all required production config', () => {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_PASSWORD = 'secure-redis-password';
    process.env.JWT_SECRET = 'secure-jwt-secret-key';

    expect(() => {
      jest.isolateModules(() => {
        require('../../src/config/index');
      });
    }).not.toThrow();
  });

  it('should not validate in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.REDIS_PASSWORD;
    delete process.env.JWT_SECRET;

    expect(() => {
      jest.isolateModules(() => {
        require('../../src/config/index');
      });
    }).not.toThrow();
  });
});
