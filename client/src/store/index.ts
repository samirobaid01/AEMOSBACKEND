import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../state/slices/authSlice';
import walkthroughReducer from '../state/slices/walkthroughSlice';
import languageReducer from '../state/slices/languageSlice';
import analyticsReducer from '../state/slices/analyticsSlice';
import uiReducer from '../state/slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    walkthrough: walkthroughReducer,
    language: languageReducer,
    analytics: analyticsReducer,
    ui: uiReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 