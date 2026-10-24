const redis = require('../config/redis');
const logger = require('../utils/logger');

const BLACKLIST_PREFIX = 'jwt:blacklist:';

// Add a token to the blacklist until its natural expiry time (epoch ms)
const blacklistToken = async (token, expiresAt) => {
  const ttl = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  const key = `${BLACKLIST_PREFIX}${token}`;
  try {
    await redis.set(key, '1', 'EX', ttl);
  } catch (err) {
    logger.error('Failed to blacklist token in Redis', { error: err.message });
    // Fail open — logout succeeds even if Redis is temporarily unavailable
  }
};

// Returns true if the token has been blacklisted
const isTokenBlacklisted = async (token) => {
  const key = `${BLACKLIST_PREFIX}${token}`;
  try {
    const val = await redis.get(key);
    return val !== null;
  } catch (err) {
    logger.error('Failed to check token blacklist in Redis', { error: err.message });
    return false; // Fail open — do not block all requests if Redis is down
  }
};

module.exports = {
  blacklistToken,
  isTokenBlacklisted
}; 