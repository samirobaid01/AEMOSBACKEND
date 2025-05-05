const winston = require('winston');
const config = require('../config');

// Define the custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create a Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, ...meta }) => {
            return `${timestamp} ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
          }
        )
      )
    })
  ]
});

// Add file transports in production environment
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  );
  logger.add(
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

module.exports = logger; 