const crypto = require('crypto');
const DeviceToken = require('../models/DeviceToken');
const Sensor = require('../models/Sensor');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Simple in-memory cache for tokens with TTL
// This significantly reduces database lookups for token validation
class TokenCache {
  constructor(ttlSeconds = 3600) { // 1 hour default TTL
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
    
    // Clean expired entries periodically (every 10 minutes)
    setInterval(() => this.cleanExpired(), 600000);
  }

  set(token, data) {
    this.cache.set(token, {
      data,
      expiry: Date.now() + this.ttl
    });
    return data;
  }

  get(token) {
    const entry = this.cache.get(token);
    if (!entry) return null;
    
    // Return null if entry expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(token);
      return null;
    }
    
    return entry.data;
  }

  invalidate(token) {
    this.cache.delete(token);
  }

  cleanExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Initialize token cache
const tokenCache = new TokenCache();

// Helper function to generate a secure random token
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Create a new device token for a sensor
const createToken = async (sensorId, expiresAt = null) => {
  try {
    // Verify the sensor exists
    const sensor = await Sensor.findByPk(sensorId);
    if (!sensor) {
      throw new Error('Sensor not found');
    }

    // Generate a secure token
    const token = generateToken();
    
    // Create the token record
    const deviceToken = await DeviceToken.create({
      token,
      sensorId,
      expiresAt,
      status: 'active'
    });

    // Fetch the created token with sensor data to include deviceUuid
    const tokenWithSensor = await DeviceToken.findOne({
      where: { id: deviceToken.id },
      include: [{ 
        model: Sensor, 
        attributes: ['uuid'] 
      }]
    });

    return tokenWithSensor;
  } catch (error) {
    logger.error(`Error creating device token: ${error.message}`);
    throw error;
  }
};

// Validate a token and return associated sensor
const validateToken = async (token, updateLastUsed = true) => {
  // Check cache first
  const cachedData = tokenCache.get(token);
  if (cachedData) {
    // If we need to update lastUsed, do it in the background without awaiting
    if (updateLastUsed) {
      DeviceToken.update(
        { lastUsed: new Date() },
        { where: { token } }
      ).catch(err => logger.error(`Error updating lastUsed timestamp: ${err.message}`));
    }
    return cachedData;
  }

  // If not in cache, check database with a timeout
  const now = new Date();
  
  try {
    const deviceToken = await DeviceToken.findOne({
      where: {
        token,
        status: 'active',
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: now } }
        ]
      },
      include: [{ model: Sensor }]
    });

    if (!deviceToken) {
      return null;
    }

    // Update lastUsed timestamp if requested
    if (updateLastUsed) {
      deviceToken.lastUsed = now;
      await deviceToken.save();
    }

    // Cache the token data for future requests
    const result = {
      token: deviceToken.token,
      sensorId: deviceToken.sensorId,
      sensor: deviceToken.Sensor
    };
    
    tokenCache.set(token, result);
    return result;
  } catch (error) {
    logger.error(`Error validating token: ${error.message}`);
    return null;
  }
};

// Get all tokens for a sensor
const getTokensBySensor = async (sensorId) => {
  try {
    return await DeviceToken.findAll({
      where: { sensorId },
      order: [['createdAt', 'DESC']]
    });
  } catch (error) {
    logger.error(`Error getting tokens for sensor: ${error.message}`);
    throw error;
  }
};

// Revoke a token
const revokeToken = async (tokenId) => {
  try {
    const token = await DeviceToken.findByPk(tokenId);
    if (!token) {
      throw new Error('Token not found');
    }
    
    // Remove from cache if present
    tokenCache.invalidate(token.token);
    
    // Update status
    token.status = 'revoked';
    await token.save();
    
    return token;
  } catch (error) {
    logger.error(`Error revoking token: ${error.message}`);
    throw error;
  }
};

// Get a token by ID
const getTokenById = async (id) => {
  try {
    return await DeviceToken.findByPk(id, {
      include: [{ model: Sensor }]
    });
  } catch (error) {
    logger.error(`Error getting token by id: ${error.message}`);
    throw error;
  }
};

// Delete a token permanently
const deleteToken = async (tokenId) => {
  try {
    const token = await DeviceToken.findByPk(tokenId);
    if (!token) {
      throw new Error('Token not found');
    }
    
    // Remove from cache if present
    tokenCache.invalidate(token.token);
    
    // Delete the token
    await token.destroy();
    
    return true;
  } catch (error) {
    logger.error(`Error deleting token: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createToken,
  validateToken,
  getTokensBySensor,
  revokeToken,
  getTokenById,
  deleteToken
}; 