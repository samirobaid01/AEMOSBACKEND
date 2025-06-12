const logger = require('../utils/logger');
const { UniqueConstraintError } = require('sequelize');

// Custom error class for API-related errors
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handler for converting errors to API responses
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500
  });

  // Handle Sequelize unique constraint violations
  if (err instanceof UniqueConstraintError) {
    // Check if it's the RuleChainNode name uniqueness violation
    if (err.errors[0]?.message.includes('unique_name_per_rule_chain')) {
      return res.status(400).json({
        status: 'fail',
        statusCode: 400,
        message: 'A node with this name already exists in this rule chain'
      });
    }
    return res.status(400).json({
      status: 'fail',
      statusCode: 400,
      message: 'A unique constraint was violated'
    });
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      statusCode: err.statusCode,
      message: err.message,
      stack: err.stack
    });
  } else {
    res.status(err.statusCode).json({
      status: err.status,
      statusCode: err.statusCode,
      message: err.message
    });
  }
};

module.exports = {
  ApiError,
  errorHandler
}; 