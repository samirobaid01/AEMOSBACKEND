import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { analyticsConfig } from '../../config/analytics';
import analyticsService from '../../services/analytics';

// State interface
interface AnalyticsState {
  enabled: boolean;
}

// Get initial state from analytics config and localStorage
const getInitialState = (): AnalyticsState => {
  // Check localStorage for user preference
  const storedPreference = localStorage.getItem('aemos_analytics_enabled');
  
  // If a preference exists in localStorage, use it
  if (storedPreference !== null) {
    return {
      enabled: storedPreference === 'true',
    };
  }
  
  // Otherwise use the config default
  return {
    enabled: analyticsConfig.mixpanel.enabled,
  };
};

// Initial state
const initialState: AnalyticsState = getInitialState();

// Create the analytics slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setAnalyticsEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
      
      // Update localStorage
      localStorage.setItem('aemos_analytics_enabled', String(action.payload));
      
      // Log this change
      console.log(`Analytics ${action.payload ? 'enabled' : 'disabled'} by user preference`);
    },
  },
});

// Export actions and reducer
export const { setAnalyticsEnabled } = analyticsSlice.actions;
export default analyticsSlice.reducer; 