import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './state/store'
import './i18n/i18n'
import './index.css'
import App from './App.tsx'

// IMMEDIATE FIX: Forcefully disable walkthrough on application start
// This should prevent any page reloads or navigation issues
try {
  // Check if running in a browser environment with localStorage available
  if (typeof window !== 'undefined' && window.localStorage) {
    // Set walkthrough as completed
    localStorage.setItem('walkthrough_status', JSON.stringify({ completed: true, currentStep: 0 }));
    // Permanently disable walkthrough to prevent issues
    localStorage.setItem('walkthrough_disabled', 'true');
    console.log('✅ Walkthrough forcefully disabled on application start');
  }
} catch (error) {
  console.error('Failed to disable walkthrough:', error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
)
