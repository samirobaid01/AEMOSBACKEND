const Redis = require('ioredis');
const logger = require('../utils/logger');

const validateRedisConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const redisPassword = process.env.REDIS_PASSWORD;
  
  if (nodeEnv === 'production' && !redisPassword) {
    logger.error('CRITICAL: REDIS_PASSWORD is required in production environment');
    logger.error('Please set REDIS_PASSWORD environment variable before starting the application');
    logger.error('Example: export REDIS_PASSWORD=your-secure-password');
    throw new Error('REDIS_PASSWORD must be set when NODE_ENV=production');
  }
  
  if (nodeEnv === 'staging' && !redisPassword) {
    logger.warn('WARNING: REDIS_PASSWORD not set in staging environment');
    logger.warn('This is not recommended for security reasons');
  }
  
  if ((nodeEnv === 'development' || nodeEnv === 'test') && !redisPassword) {
    logger.warn('Running Redis without authentication (development/test mode)');
    logger.warn('Set REDIS_PASSWORD for production-like testing');
  }

  if (redisPassword) {
    logger.info('Redis authentication enabled');
  }
};

validateRedisConfig();

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDIS_USERNAME || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('Redis connection failed after 10 retries');
      return null;
    }
    return Math.min(times * 50, 2000);
  }
});

redisConnection.on('connect', () => {
  logger.info('Redis connection established');
});

redisConnection.on('ready', () => {
  logger.info('Redis connection ready');
});

redisConnection.on('error', (error) => {
  if (error.message.includes('NOAUTH') || error.message.includes('Authentication')) {
    logger.error('Redis authentication failed - check REDIS_PASSWORD');
    logger.error('Make sure REDIS_PASSWORD matches your Redis server configuration');
  } else {
    logger.error(`Redis connection error: ${error.message}`);
  }
});

redisConnection.on('close', () => {
  logger.warn('Redis connection closed');
});

redisConnection.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

module.exports = redisConnection;
module.exports.validateRedisConfig = validateRedisConfig;