import mixpanel from 'mixpanel-browser';
import { analyticsConfig } from '../config/analytics';

// User properties interface
export interface UserProperties {
  userId?: string;
  email?: string;
  username?: string;
  [key: string]: any; // Allow any additional properties
}

// Initialize mixpanel with configuration
const initMixpanel = (): void => {
  const { token, debug } = analyticsConfig.mixpanel;
  
  if (token) {
    mixpanel.init(token, {
      debug,
      track_pageview: true,
      persistence: 'localStorage',
    });
    console.log('Mixpanel initialized');
  } else {
    console.log('Mixpanel disabled: No token provided');
  }
};

// Track an event with optional properties
const trackEvent = (eventName: string, properties: Record<string, any> = {}): void => {
  if (!analyticsConfig.mixpanel.enabled) {
    console.log(`[Analytics Disabled] Event: ${eventName}`, properties);
    return;
  }

  try {
    mixpanel.track(eventName, properties);
    console.log(`[Analytics] Tracked: ${eventName}`, properties);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

// Identify user for tracking
const identify = (userId: string, userProperties: UserProperties = {}): void => {
  if (!analyticsConfig.mixpanel.enabled) {
    console.log(`[Analytics Disabled] Identify: ${userId}`, userProperties);
    return;
  }

  try {
    mixpanel.identify(userId);
    mixpanel.people.set(userProperties);
    console.log(`[Analytics] Identified user: ${userId}`);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
};

// Reset the user identity (for logouts)
const reset = (): void => {
  if (!analyticsConfig.mixpanel.enabled) {
    console.log('[Analytics Disabled] Reset user');
    return;
  }

  try {
    mixpanel.reset();
    console.log('[Analytics] Reset user tracking');
  } catch (error) {
    console.error('Failed to reset analytics:', error);
  }
};

// Set global properties that will be sent with every event
const setGlobalProperties = (properties: Record<string, any>): void => {
  if (!analyticsConfig.mixpanel.enabled) {
    console.log('[Analytics Disabled] Set global properties', properties);
    return;
  }

  try {
    mixpanel.register(properties);
    console.log('[Analytics] Set global properties', properties);
  } catch (error) {
    console.error('Failed to set global properties:', error);
  }
};

// Initialize the service when imported
initMixpanel();

// Export the analytics service
const analyticsService = {
  trackEvent,
  identify,
  reset,
  setGlobalProperties,
  isEnabled: analyticsConfig.mixpanel.enabled
};

export default analyticsService; 