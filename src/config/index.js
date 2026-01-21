require('dotenv').config();
const features = require('./features');

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'aemos_core',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  backpressure: {
    enabled: process.env.ENABLE_BACKPRESSURE !== 'false',
    warningThreshold: parseInt(process.env.QUEUE_WARNING_THRESHOLD || '10000', 10),
    criticalThreshold: parseInt(process.env.QUEUE_CRITICAL_THRESHOLD || '50000', 10),
    recoveryThreshold: parseInt(process.env.QUEUE_RECOVERY_THRESHOLD || '5000', 10),
    defaultEventPriority: parseInt(process.env.DEFAULT_EVENT_PRIORITY || '5', 10)
  },
  ruleEngine: {
    workerConcurrency: parseInt(process.env.RULE_ENGINE_WORKER_CONCURRENCY || '20', 10)
  },
  features,
  broadcastAll: features.notifications.broadcastAll
}; 