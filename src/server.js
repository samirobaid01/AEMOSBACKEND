const app = require('./app');
const http = require('http');
const sequelize = require('./config/database');
const { initModels } = require('./models/initModels');
const config = require('./config');
const logger = require('./utils/logger');
const socketManager = require('./utils/socketManager');

// Set port from environment variables or default
const PORT = config.server.port;

// Start server function
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Initialize all models and their associations
    await initModels();
    
    // Add a direct test route to the HTTP server
    app.get('/direct-test', (req, res) => {
      console.log('*** DIRECT TEST ROUTE HIT ***');
      res.status(200).json({
        status: 'success',
        message: 'Direct test route is working!'
      });
    });
    
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
    });
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