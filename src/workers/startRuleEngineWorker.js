const sequelize = require('../config/database');
const { initModels } = require('../models/initModels');
const logger = require('../utils/logger');
const RuleEngineWorker = require('../ruleEngine/core/RuleEngineWorker');
const ScheduleManager = require('../ruleEngine/scheduling/ScheduleManager');
const notificationBridge = require('../services/notificationBridgeService');

const start = async () => {
  try {
    await sequelize.authenticate();
    await initModels();
    
    // Initialize notification bridge as publisher
    notificationBridge.initializePublisher();
    logger.info('Notification bridge publisher initialized');

    RuleEngineWorker.start();
    await ScheduleManager.initialize();

    logger.info('Rule engine worker and scheduler started');
  } catch (error) {
    logger.error(`Failed to start rule engine worker: ${error.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  await ScheduleManager.stop();
  await RuleEngineWorker.stop();
  notificationBridge.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await ScheduleManager.stop();
  await RuleEngineWorker.stop();
  notificationBridge.shutdown();
  process.exit(0);
});

start();
