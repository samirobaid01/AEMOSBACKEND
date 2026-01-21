const app = require('./app');
const http = require('http');
const sequelize = require('./config/database');
const { initModels } = require('./models/initModels');
const config = require('./config');
const logger = require('./utils/logger');
const socketManager = require('./utils/socketManager');
const mqttService = require('./services/mqttService');
const coapService = require('./services/coapService');
const notificationBridge = require('./services/notificationBridgeService');
const mqttPublisher = require('./services/mqttPublisherService');
const coapPublisher = require('./services/coapPublisherService');

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
        message: 'Direct test route is working!',
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
      
      // Initialize notification bridge subscriber to handle worker notifications
      notificationBridge.initializeSubscriber((notification) => {
        if (notification.type === 'socket') {
          const { event, notification: data, broadcastAll, rooms } = notification;
          
          if (broadcastAll) {
            socketManager.broadcastToAll(event, data);
          } else if (rooms && rooms.length > 0) {
            rooms.forEach(room => {
              socketManager.broadcastToRoom(room, event, data);
            });
          }
          
          logger.debug(`Emitted socket event '${event}' from worker notification`);
        }
      });
      
      logger.info('Notification bridge subscriber initialized');
    }

    // Initialize MQTT server if enabled in features
    if (config.features.mqtt && config.features.mqtt.enabled) {
      try {
        mqttService.initialize();
        logger.info('MQTT server initialized');

        // Initialize MQTT publisher
        const mqttPublisher = require('./services/mqttPublisherService');
        await mqttPublisher.initialize();
        logger.info('MQTT publisher initialized');
      } catch (error) {
        logger.error(`Failed to initialize MQTT server: ${error.message}`);
        throw error;
      }
    }
    if (config.features.coap && config.features.coap.enabled) {
      try {
        coapService.initialize(config.features.coap.host, config.features.coap.port);
        logger.info('CoAP server initialized');
      } catch (err) {
        logger.error('Failed to initialize CoAP server', err);
      }
    }
    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running in ${config.server.nodeEnv} mode on port ${PORT}`);
      if (config.features.socketio && config.features.socketio.enabled) {
        logger.info(`Socket.io server running on port ${PORT}`);
      }
      if (config.features.mqtt && config.features.mqtt.enabled) {
        logger.info(`MQTT server running on port ${config.features.mqtt.port}`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (config.features.mqtt && config.features.mqtt.enabled) {
    mqttService.stop();
  }
  if (config.features.coap && config.features.coap.enabled) {
    try {
      coapService.stop();
    } catch (err) {
      logger.error('Error stopping CoAP service:', err);
    }
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (config.features.mqtt && config.features.mqtt.enabled) {
    mqttService.stop();
  }
  if (config.features.coap && config.features.coap.enabled) {
    try {
      coapService.stop();
    } catch (err) {
      logger.error('Error stopping CoAP service:', err);
    }
  }
  process.exit(0);
});

// Start the server
startServer();
