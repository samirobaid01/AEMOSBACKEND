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
  }
};
