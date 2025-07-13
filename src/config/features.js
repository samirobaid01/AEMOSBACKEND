module.exports = {
  security: {
    helmet: process.env.ENABLE_HELMET !== 'false', // Default: true
    rateLimit: {
      enabled: process.env.ENABLE_RATE_LIMIT !== 'false',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000, 10), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || 100, 10) // 100 requests per window
    },
    mongoSanitize: process.env.ENABLE_MONGO_SANITIZE !== 'false',
    hpp: process.env.ENABLE_HPP !== 'false'
  },
  
  performance: {
    compression: process.env.ENABLE_COMPRESSION !== 'false',
    responseTime: {
      enabled: process.env.ENABLE_RESPONSE_TIME !== 'false',
      threshold: parseInt(process.env.RESPONSE_TIME_THRESHOLD || 1000, 10) // Log if >1000ms
    }
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    console: process.env.ENABLE_CONSOLE_LOGS !== 'false',
    fileRotation: {
      enabled: process.env.ENABLE_FILE_LOGS !== 'false',
      retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || 14, 10)
    }
  },
  
  notifications: {
    broadcastAll: process.env.ENABLE_BROADCAST_ALL === 'true', // Default: false
    bufferSize: parseInt(process.env.NOTIFICATION_BUFFER_SIZE || 1000, 10),
    broadcastInterval: parseInt(process.env.NOTIFICATION_INTERVAL || 1000, 10) // ms
  },
  
  errorHandling: {
    showStackTraces: process.env.NODE_ENV === 'development',
    operationalErrorsOnly: process.env.NODE_ENV === 'production',
    centralizedHandler: process.env.ENABLE_CENTRAL_ERROR_HANDLER !== 'false'
  },
  
  healthChecks: {
    enabled: process.env.ENABLE_HEALTH_CHECKS !== 'false',
    detailed: process.env.ENABLE_DETAILED_HEALTH_CHECKS === 'true',
    includeDatabase: process.env.HEALTH_CHECK_DATABASE !== 'false'
  },
  
  featureFlags: {
    enabled: process.env.ENABLE_FEATURE_FLAGS === 'true',
    provider: process.env.FEATURE_FLAG_PROVIDER || 'local', // 'local', 'unleash', etc.
    url: process.env.FEATURE_FLAG_URL || ''
  },
  
  socketio: {
    enabled: process.env.ENABLE_SOCKET_IO !== 'false', // Default to true
    cors: process.env.SOCKET_IO_CORS !== 'false', // Default to true
    pingInterval: parseInt(process.env.SOCKET_IO_PING_INTERVAL || 10000, 10),
    pingTimeout: parseInt(process.env.SOCKET_IO_PING_TIMEOUT || 5000, 10)
  },
  
  mqtt: {
    enabled: process.env.ENABLE_MQTT === 'true',
    port: parseInt(process.env.MQTT_PORT || 1883, 10),
    host: process.env.MQTT_HOST || '0.0.0.0',
    authentication: {
      enabled: process.env.MQTT_AUTH_ENABLED !== 'false',
      tokenBased: process.env.MQTT_TOKEN_AUTH === 'true'
    },
    topics: {
      dataStream: 'devices/+/datastream',
      deviceStatus: 'devices/+/status',
      commands: 'devices/+/commands'
    },
    qos: {
      default: parseInt(process.env.MQTT_DEFAULT_QOS || 1, 10),
      dataStream: parseInt(process.env.MQTT_DATASTREAM_QOS || 1, 10)
    }
  }
};
