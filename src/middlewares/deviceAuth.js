const { validateToken } = require('../services/deviceTokenService');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate requests using device tokens
 * This is a lightweight alternative to the full user authentication
 * specifically designed for IoT devices with high-frequency requests
 */
const deviceAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    // Check if header exists and has the right format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('Device auth failed: No Bearer token provided');
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.debug('Device auth failed: Empty token');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token format'
      });
    }
    
    // Set a timeout for token validation to avoid hanging
    const timeoutMs = 2000; // 2 seconds timeout
    
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Token validation timed out')), timeoutMs);
    });
    
    // Race the token validation against the timeout
    const tokenData = await Promise.race([
      validateToken(token),
      timeoutPromise
    ]);
    
    if (!tokenData) {
      logger.debug(`Device auth failed: Invalid or expired token`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }
    
    // Attach the sensor info to the request for use in controllers
    req.sensor = tokenData.sensor;
    req.sensorId = tokenData.sensorId;
    req.deviceToken = tokenData.token;
    
    // Continue to the next middleware/controller
    next();
  } catch (error) {
    logger.error(`Device authentication error: ${error.message}`);
    
    // Check if it's a timeout error
    if (error.message === 'Token validation timed out') {
      return res.status(503).json({
        status: 'error',
        message: 'Authentication service unavailable, please try again'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed due to server error'
    });
  }
};

module.exports = {
  deviceAuth
}; 