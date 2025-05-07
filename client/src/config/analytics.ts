interface MixpanelConfig {
  enabled: boolean;
  token?: string;
  debug?: boolean;
}

interface AnalyticsConfig {
  mixpanel: MixpanelConfig;
}

export const analyticsConfig: AnalyticsConfig = {
  mixpanel: {
    enabled: import.meta.env.PROD, // Only enable in production by default
    token: import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined,
    debug: import.meta.env.DEV,
  },
}; 