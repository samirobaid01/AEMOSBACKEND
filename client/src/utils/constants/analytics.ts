// Mixpanel configuration for different environments
interface MixpanelConfig {
  token: string;
  enabled: boolean;
  debug: boolean;
}

interface AnalyticsConfig {
  mixpanel: MixpanelConfig;
}

// Map different Mixpanel projects based on environment
const getEnvironmentConfig = (): AnalyticsConfig => {
  const env = import.meta.env.MODE || 'development';
  
  // Default configuration (disabled in development)
  const defaultConfig: AnalyticsConfig = {
    mixpanel: {
      token: '',
      enabled: false,
      debug: true
    }
  };

  // Environment-specific configurations
  switch (env) {
    case 'production':
      return {
        mixpanel: {
          // Replace with your actual production Mixpanel token
          token: 'PROD_MIXPANEL_TOKEN',
          enabled: true,
          debug: false
        }
      };
    case 'staging':
      return {
        mixpanel: {
          // Replace with your actual staging Mixpanel token
          token: 'STAGING_MIXPANEL_TOKEN',
          enabled: true,
          debug: true
        }
      };
    case 'development':
    default:
      return defaultConfig;
  }
};

// Export the configuration
export const analyticsConfig = getEnvironmentConfig(); 