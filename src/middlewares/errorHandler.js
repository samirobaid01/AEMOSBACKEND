const logger = require('../utils/logger');

// Custom error class for API-related errors
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Handler for converting errors to API responses
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  
  // Default status code and messages for unknown errors
  if (!statusCode) statusCode = 500;
  
  // In production, don't expose error details for 500s unless they're operational errors
  if (statusCode === 500 && !err.isOperational) {
    message = 'Internal Server Error';
  }

  // Log the error
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel](message, {
    url: req.originalUrl,
    method: req.method,
    ...(err.isOperational ? { stack: err.stack } : {})
  });

  // Send error response to client
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  ApiError,
  errorHandler
}; 