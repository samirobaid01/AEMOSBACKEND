const app = require('./app');
const sequelize = require('./config/database');
const { initModels } = require('./models/initModels');
const config = require('./config');
const logger = require('./utils/logger');

// Set port from environment variables or default
const PORT = config.server.port;

// Start server function
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Initialize models and their associations
    await initModels();
    
    // In development, you might want to sync the database, but be careful!
    // This should be disabled in production and replaced with proper migrations
    if (config.server.nodeEnv === 'development') {
      // WARNING: Using { force: true } will drop tables and recreate them
      // await sequelize.sync({ force: true });
      // logger.info('Database synchronized (tables recreated)');
      
      // Using { alter: true } is less destructive but still dangerous in production
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized (tables altered if needed)');
    }
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running in ${config.server.nodeEnv} mode on port ${PORT}`);
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

// Start the server
startServer(); 