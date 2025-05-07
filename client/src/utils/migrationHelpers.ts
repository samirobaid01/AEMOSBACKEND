/**
 * Migration Helpers
 * 
 * This file contains utilities to help with the migration from Context API to Redux.
 * It acts as a compatibility layer to keep the application working during the migration.
 */

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { fetchCurrentUser } from '../state/slices/authSlice';
import type { RootState } from '../state/store';

/**
 * SyncAuthState - A hook to synchronize auth state between Context and Redux
 * during the migration phase. Use this in the App component to ensure
 * both state management systems have the same authentication state.
 */
export const useSyncAuthState = () => {
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const reduxAuthState = useAppSelector((state: RootState) => state.auth);

  // Enhanced logging for auth state
  useEffect(() => {
    console.log('Auth State Sync Debug:');
    console.log('Context Auth:', { isAuthenticated, user: user ? 'exists' : 'null' });
    console.log('Redux Auth:', { 
      isAuthenticated: reduxAuthState.isAuthenticated, 
      user: reduxAuthState.user ? 'exists' : 'null',
      loading: reduxAuthState.loading,
      error: reduxAuthState.error 
    });
  }, [isAuthenticated, user, reduxAuthState]);

  // If user is authenticated in context but not in redux, fetch the user in redux
  useEffect(() => {
    if (isAuthenticated && !reduxAuthState.isAuthenticated) {
      console.log('Auth mismatch detected: Fetching user from API');
      dispatch(fetchCurrentUser());
    }
  }, [isAuthenticated, reduxAuthState.isAuthenticated, dispatch]);

  return {
    contextUser: user,
    reduxUser: reduxAuthState.user,
    contextAuthenticated: isAuthenticated,
    reduxAuthenticated: reduxAuthState.isAuthenticated,
    inSync: (isAuthenticated === reduxAuthState.isAuthenticated)
  };
};

/**
 * Migration Status Helper - Use this to track migration progress
 */
export const logMigrationStatus = () => {
  const components = [
    { name: 'Login', migrated: true },
    { name: 'Register', migrated: true },
    { name: 'ProtectedRoute', migrated: true },
    { name: 'MainLayout', migrated: false },
    { name: 'NotificationCenter', migrated: false },
    // Add more components here as they are migrated
  ];

  const totalComponents = components.length;
  const migratedComponents = components.filter(c => c.migrated).length;
  const percentage = Math.round((migratedComponents / totalComponents) * 100);

  console.log(`Migration Progress: ${percentage}% (${migratedComponents}/${totalComponents})`);
  console.log('Components migrated:', components.filter(c => c.migrated).map(c => c.name).join(', '));
  console.log('Components to migrate:', components.filter(c => !c.migrated).map(c => c.name).join(', '));

  return { percentage, migratedComponents, totalComponents };
}; 