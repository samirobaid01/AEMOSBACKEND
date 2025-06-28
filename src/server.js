const app = require('./app');
const http = require('http');
const sequelize = require('./config/database');
const { initModels } = require('./models/initModels');
const config = require('./config');
const logger = require('./utils/logger');
const socketManager = require('./utils/socketManager');
// const { ruleEngine } = require('./ruleEngine'); // Temporarily disabled

// Set port from environment variables or default
const PORT = config.server.port;

// Only import rule engine if not explicitly disabled
let ruleEngine = null;
const ruleEngineEnabled = process.env.DISABLE_RULE_ENGINE !== 'true';

if (ruleEngineEnabled) {
  try {
    logger.info('Importing rule engine...');
    const ruleEngineModule = require('./ruleEngine');
    ruleEngine = ruleEngineModule.ruleEngine;
    logger.info('Rule engine imported successfully');
  } catch (error) {
    logger.error('Rule engine import failed:', error.message);
    logger.warn('Server will continue without rule engine functionality');
  }
} else {
  logger.info('Rule engine import skipped (DISABLE_RULE_ENGINE=true)');
}

// Start server function
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Initialize all models and their associations
    await initModels();
    
    logger.info('Rule engine initialization will happen after server starts listening');
    
    // In development, you might want to sync the database, but be careful!
    // This should be disabled in production and replaced with proper migrations
    if (config.server.nodeEnv === 'development') {
      // WARNING: Using { force: true } will drop tables and recreate them
      // await sequelize.sync({ force: true });
      // logger.info('Database synchronized (tables recreated)');
      
      // Using { alter: true } is less destructive but still dangerous in production
      // await sequelize.sync({ alter: true });
      // logger.info('Database synchronized (tables altered if needed)');
    }
    
    // Create HTTP server with Express app
    const server = http.createServer(app);
    
    // Initialize Socket.io if enabled in features
    if (config.features.socketio && config.features.socketio.enabled) {
      socketManager.initialize(server);
      logger.info('Socket.io server initialized');
    }
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running in ${config.server.nodeEnv} mode on port ${PORT}`);
      if (config.features.socketio && config.features.socketio.enabled) {
        logger.info(`Socket.io server running on port ${PORT}`);
      }
      
      // Initialize rule engine AFTER server is listening (non-blocking)
      if (ruleEngine && process.env.DISABLE_RULE_ENGINE !== 'true') {
        setTimeout(async () => {
          try {
            logger.info('Starting rule engine initialization (after server startup)...');
            await ruleEngine.initialize();
            logger.info('Rule Engine initialized successfully');
            
            const ruleEngineStatus = ruleEngine.getHealthStatus();
            logger.info(`Rule Engine status: ${ruleEngineStatus.initialized ? 'Ready' : 'Not initialized'}`);
          } catch (error) {
            logger.error('Failed to initialize Rule Engine:', error);
            logger.warn('Server will continue running without rule engine functionality');
          }
        }, 1000); // 1 second delay to ensure server is fully started
      } else {
        logger.info('Rule Engine initialization skipped');
      }
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Close server
        await new Promise((resolve) => {
          server.close(resolve);
        });
        
        // Shutdown rule engine
        if (ruleEngine) {
          try {
            await ruleEngine.shutdown();
            logger.info('Rule Engine shut down successfully');
          } catch (error) {
            logger.error('Error shutting down Rule Engine:', error);
          }
        }
        
        // Close database connection
        await sequelize.close();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', error => {
  logger.error('UNHANDLED REJECTION:', error);
  
  // Gracefully shutdown
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Start the server
startServer(); 