import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import our slices
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import languageReducer from './slices/languageSlice';
import analyticsReducer from './slices/analyticsSlice';

// Create a root reducer with all our feature reducers
const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  language: languageReducer,
  analytics: analyticsReducer,
  // Add more slices here as we create them
});

// Configuration for redux-persist
const persistConfig = {
  key: 'aemos-root',
  storage,
  whitelist: ['auth', 'ui', 'language', 'analytics'], // Only persist these slices
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
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 