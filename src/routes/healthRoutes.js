const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const redisConnection = require('../config/redis');
const { getQueueMetrics } = require('../ruleEngine/core/RuleEngineQueue');
const backpressureManager = require('../services/backpressureManager');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  let httpStatus = 200;

  try {
    await sequelize.authenticate();
    healthCheck.services.database = {
      status: 'healthy',
      type: 'mysql',
      connection: 'active'
    };
  } catch (error) {
    healthCheck.services.database = {
      status: 'unhealthy',
      error: error.message
    };
    healthCheck.status = 'unhealthy';
    httpStatus = 503;
    logger.error(`Database health check failed: ${error.message}`);
  }

  try {
    await redisConnection.ping();
    healthCheck.services.redis = {
      status: 'healthy',
      connection: 'active'
    };
  } catch (error) {
    healthCheck.services.redis = {
      status: 'unhealthy',
      error: error.message
    };
    healthCheck.status = 'unhealthy';
    httpStatus = 503;
    logger.error(`Redis health check failed: ${error.message}`);
  }

  try {
    const queueMetrics = await getQueueMetrics();
    const backpressureStatus = backpressureManager.getStatus();
    
    const totalPending = (queueMetrics.counts.waiting || 0) + (queueMetrics.counts.active || 0);
    
    let queueStatus = 'healthy';
    if (queueMetrics.health === 'critical' || backpressureStatus.circuitState === 'OPEN') {
      queueStatus = 'critical';
      if (healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    } else if (queueMetrics.health === 'warning' || backpressureStatus.circuitState === 'HALF_OPEN') {
      queueStatus = 'warning';
      if (healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    } else if (queueMetrics.health === 'degraded') {
      queueStatus = 'degraded';
    }

    healthCheck.services.ruleEngineQueue = {
      status: queueStatus,
      health: queueMetrics.health,
      queueDepth: totalPending,
      workers: queueMetrics.workers.count,
      circuitState: backpressureStatus.circuitState,
      backpressureEnabled: backpressureStatus.enabled
    };

    if (queueMetrics.workers.count === 0) {
      healthCheck.services.ruleEngineQueue.warning = 'No active workers detected';
      if (healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    }
  } catch (error) {
    healthCheck.services.ruleEngineQueue = {
      status: 'unknown',
      error: error.message
    };
    logger.error(`Queue health check failed: ${error.message}`);
  }

  healthCheck.services.application = {
    status: 'healthy',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
    }
  };

  res.status(httpStatus).json(healthCheck);
});

router.get('/liveness', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

router.get('/readiness', async (req, res) => {
  let ready = true;
  const checks = {};

  try {
    await sequelize.authenticate();
    checks.database = 'ready';
  } catch (error) {
    checks.database = 'not ready';
    ready = false;
  }

  try {
    await redisConnection.ping();
    checks.redis = 'ready';
  } catch (error) {
    checks.redis = 'not ready';
    ready = false;
  }

  try {
    const backpressureStatus = backpressureManager.getStatus();
    if (backpressureStatus.circuitState === 'OPEN') {
      checks.backpressure = 'circuit open - not accepting traffic';
      ready = false;
    } else {
      checks.backpressure = 'ready';
    }
  } catch (error) {
    checks.backpressure = 'unknown';
  }

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
    checks
  });
});

module.exports = router;
