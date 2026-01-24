const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: true,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

redisConnection.on('connect', () => {
  logger.info('Redis connection established');
});

redisConnection.on('ready', () => {
  logger.info('Redis connection ready');
});

redisConnection.on('error', (error) => {
  logger.error(`Redis connection error: ${error.message}`);
});

redisConnection.on('close', () => {
  logger.warn('Redis connection closed');
});

redisConnection.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

module.exports = redisConnection;
