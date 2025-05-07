import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import type { PersistConfig } from 'redux-persist';

// Import our slices
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import languageReducer from './slices/languageSlice';
import analyticsReducer from './slices/analyticsSlice';
import walkthroughReducer from './slices/walkthroughSlice';
import sensorReducer from './slices/sensorSlice';

// Define root state type
export interface RootState {
  auth: ReturnType<typeof authReducer>;
  ui: ReturnType<typeof uiReducer>;
  language: ReturnType<typeof languageReducer>;
  analytics: ReturnType<typeof analyticsReducer>;
  walkthrough: ReturnType<typeof walkthroughReducer>;
  sensors: ReturnType<typeof sensorReducer>;
}

// Create a root reducer with all our feature reducers
const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  language: languageReducer,
  analytics: analyticsReducer,
  walkthrough: walkthroughReducer,
  sensors: sensorReducer,
});

// Configuration for redux-persist
const persistConfig: PersistConfig<RootState> = {
  key: 'aemos-root',
  storage,
  whitelist: ['auth', 'ui', 'language', 'analytics', 'walkthrough'], // Only persist these slices
};

// Create the persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the Redux store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Create the persisted store
export const persistor = persistStore(store);

// Export types for TypeScript usage
export type AppDispatch = typeof store.dispatch; 