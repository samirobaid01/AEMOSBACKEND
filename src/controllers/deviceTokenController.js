const deviceTokenService = require('../services/deviceTokenService');
const logger = require('../utils/logger');

// Create a new token for a sensor
const createToken = async (req, res) => {
  try {
    const { sensorId, expiresAt } = req.body;
    
    const token = await deviceTokenService.createToken(sensorId, expiresAt);
    
    res.status(201).json({
      status: 'success',
      data: {
        id: token.id,
        token: token.token,
        sensorId: token.sensorId,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt
      }
    });
  } catch (error) {
    logger.error(`Error creating device token: ${error.message}`);
    
    // Specific error for sensor not found
    if (error.message === 'Sensor not found') {
      return res.status(404).json({
        status: 'error',
        message: 'Sensor not found'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create device token'
    });
  }
};

// Get all tokens for a sensor
const getTokensBySensor = async (req, res) => {
  try {
    const { sensorId } = req.query;
    
    const tokens = await deviceTokenService.getTokensBySensor(sensorId);
    
    // Don't return the actual token value in the response for security
    const sanitizedTokens = tokens.map(token => ({
      id: token.id,
      sensorId: token.sensorId,
      expiresAt: token.expiresAt,
      lastUsed: token.lastUsed,
      status: token.status,
      createdAt: token.createdAt
    }));
    
    res.status(200).json({
      status: 'success',
      results: sanitizedTokens.length,
      data: sanitizedTokens
    });
  } catch (error) {
    logger.error(`Error getting tokens for sensor: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve device tokens'
    });
  }
};

// Get a token by ID
const getTokenById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const token = await deviceTokenService.getTokenById(id);
    
    if (!token) {
      return res.status(404).json({
        status: 'error',
        message: 'Token not found'
      });
    }
    
    // Don't return the actual token value for security
    res.status(200).json({
      status: 'success',
      data: {
        id: token.id,
        sensorId: token.sensorId,
        expiresAt: token.expiresAt,
        lastUsed: token.lastUsed,
        status: token.status,
        createdAt: token.createdAt,
        sensor: token.Sensor ? {
          id: token.Sensor.id,
          name: token.Sensor.name
        } : null
      }
    });
  } catch (error) {
    logger.error(`Error getting token by id: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve token'
    });
  }
};

// Revoke a token
const revokeToken = async (req, res) => {
  try {
    const { id } = req.params;
    
    await deviceTokenService.revokeToken(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Token revoked successfully'
    });
  } catch (error) {
    logger.error(`Error revoking token: ${error.message}`);
    
    if (error.message === 'Token not found') {
      return res.status(404).json({
        status: 'error',
        message: 'Token not found'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke token'
    });
  }
};

// Delete a token permanently
const deleteToken = async (req, res) => {
  try {
    const { id } = req.params;
    
    await deviceTokenService.deleteToken(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Token deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting token: ${error.message}`);
    
    if (error.message === 'Token not found') {
      return res.status(404).json({
        status: 'error',
        message: 'Token not found'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete token'
    });
  }
};

// Verify a token (for testing purposes)
const verifyToken = async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const tokenData = await deviceTokenService.validateToken(token);
    
    if (!tokenData) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Token is valid',
      data: {
        sensorId: tokenData.sensorId,
        sensor: {
          id: tokenData.sensor.id,
          name: tokenData.sensor.name
        }
      }
    });
  } catch (error) {
    logger.error(`Error verifying token: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify token'
    });
  }
};

module.exports = {
  createToken,
  getTokensBySensor,
  getTokenById,
  revokeToken,
  deleteToken,
  verifyToken
}; 