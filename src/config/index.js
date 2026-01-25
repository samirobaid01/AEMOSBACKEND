require('dotenv').config();
const features = require('./features');

const validateProductionConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    const errors = [];
    
    if (!process.env.REDIS_PASSWORD) {
      errors.push('REDIS_PASSWORD is required in production');
    }
    
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
      errors.push('JWT_SECRET must be set to a secure value in production');
    }
    
    if (errors.length > 0) {
      console.error('\n❌ PRODUCTION CONFIGURATION ERRORS:\n');
      errors.forEach(error => console.error(`   - ${error}`));
      console.error('\nPlease set the required environment variables before starting in production.\n');
      throw new Error('Missing required production configuration');
    }
  }
};

validateProductionConfig();

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
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined
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
    workerConcurrency: parseInt(process.env.RULE_ENGINE_WORKER_CONCURRENCY || '20', 10),
    timeouts: {
      dataCollection: parseInt(process.env.DATA_COLLECTION_TIMEOUT || '5000', 10),
      ruleChain: parseInt(process.env.RULE_CHAIN_TIMEOUT || '30000', 10),
      workerLock: parseInt(process.env.WORKER_LOCK_DURATION || '60000', 10),
      workerMaxStalledCount: parseInt(process.env.WORKER_MAX_STALLED_COUNT || '2', 10)
    }
  },
  features,
  broadcastAll: features.notifications.broadcastAll
};

const validateTimeoutConfig = () => {
  const { timeouts } = module.exports.ruleEngine;
  const errors = [];

  if (timeouts.dataCollection < 1000 || timeouts.dataCollection > 30000) {
    errors.push(`DATA_COLLECTION_TIMEOUT must be between 1000-30000ms, got ${timeouts.dataCollection}`);
  }

  if (timeouts.ruleChain < 10000 || timeouts.ruleChain > 120000) {
    errors.push(`RULE_CHAIN_TIMEOUT must be between 10000-120000ms, got ${timeouts.ruleChain}`);
  }

  if (timeouts.workerLock < 30000 || timeouts.workerLock > 300000) {
    errors.push(`WORKER_LOCK_DURATION must be between 30000-300000ms, got ${timeouts.workerLock}`);
  }

  if (timeouts.dataCollection >= timeouts.ruleChain) {
    errors.push(`DATA_COLLECTION_TIMEOUT (${timeouts.dataCollection}ms) must be less than RULE_CHAIN_TIMEOUT (${timeouts.ruleChain}ms)`);
  }

  if (timeouts.ruleChain >= timeouts.workerLock) {
    errors.push(`RULE_CHAIN_TIMEOUT (${timeouts.ruleChain}ms) must be less than WORKER_LOCK_DURATION (${timeouts.workerLock}ms)`);
  }

  if (errors.length > 0) {
    console.error('\n❌ TIMEOUT CONFIGURATION ERRORS:\n');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\nPlease fix the timeout configuration.\n');
    throw new Error('Invalid timeout configuration');
  }
};

validateTimeoutConfig(); 