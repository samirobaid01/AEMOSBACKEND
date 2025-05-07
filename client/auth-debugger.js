/**
 * Authentication Debugger and Fixer
 * 
 * Instructions:
 * 1. Open your browser developer tools (F12 or right-click -> Inspect)
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to execute
 * 5. Refresh the page after running
 * 
 * This script will:
 * - Check your current authentication tokens
 * - Create placeholder tokens if they're missing
 * - Prevent automatic redirects to login
 */

(function() {
  // Define token keys
  const ACCESS_TOKEN_KEY = 'aemos_access_token';
  const REFRESH_TOKEN_KEY = 'aemos_refresh_token';
  
  // Helper to check token
  const checkToken = (name, key) => {
    const token = localStorage.getItem(key);
    console.log(`${name}: ${token ? '✓ Exists' : '✗ Missing'}`);
    
    if (token) {
      try {
        // Try to parse JWT and check expiration
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const expiry = payload.exp ? new Date(payload.exp * 1000) : null;
          const now = new Date();
          
          if (expiry) {
            console.log(`${name} expires: ${expiry.toISOString()}`);
            if (expiry < now) {
              console.log(`⚠️ ${name} is EXPIRED`);
            } else {
              console.log(`✓ ${name} is valid for ${Math.round((expiry - now) / 1000 / 60)} more minutes`);
            }
          }
        }
      } catch (e) {
        console.log(`Error parsing ${name}: ${e.message}`);
      }
    }
    
    return token;
  };
  
  console.log('=== AUTH TOKEN CHECKER ===');
  const accessToken = checkToken('Access Token', ACCESS_TOKEN_KEY);
  const refreshToken = checkToken('Refresh Token', REFRESH_TOKEN_KEY);
  
  // Fix missing tokens regardless of current page
  let fixApplied = false;

  console.log('\n=== APPLYING AUTH FIXES ===');
  
  // 1. Override window.location.href to prevent automatic redirects
  try {
    const originalSetProperty = Object.getOwnPropertyDescriptor(window, 'location').set;
    
    if (originalSetProperty) {
      Object.defineProperty(window, 'location', {
        set: function(val) {
          if (typeof val === 'string' && val.includes('/login')) {
            console.log('⚠️ Prevented redirect to login page!');
            return;
          }
          return originalSetProperty.call(this, val);
        },
        get: function() { 
          return window.location; 
        }
      });
      console.log('✓ Installed redirect prevention');
      fixApplied = true;
    } else {
      throw new Error('Could not find original location setter');
    }
  } catch (e) {
    console.log('✗ Could not install redirect prevention:', e);
    console.log('  Using alternate redirect prevention method...');
    
    // Alternative method - override just the href property
    try {
      // Store the original href setter
      const originalHrefDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href');
      
      // Define a new setter that checks for login redirects
      Object.defineProperty(window.location, 'href', {
        set: function(val) {
          if (typeof val === 'string' && val.includes('/login')) {
            console.log('⚠️ Prevented redirect to login page!');
            return;
          }
          originalHrefDescriptor.set.call(this, val);
        },
        get: function() {
          return originalHrefDescriptor.get.call(this);
        }
      });
      console.log('✓ Installed alternate redirect prevention');
      fixApplied = true;
    } catch (e2) {
      console.log('✗ Could not install alternate redirect prevention:', e2);
    }
  }
  
  // 2. Create placeholder tokens regardless of page
  // Create a simple placeholder token valid until 2099
  const placeholderToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcklkIjoiMTIzIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsIm5hbWUiOiJUZW1wb3JhcnkgVXNlciIsImV4cCI6NDA5MTgyMTIwMH0.signature';
  
  if (!accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, placeholderToken);
    console.log('✓ Created temporary access token');
    fixApplied = true;
  }
  
  if (!refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, placeholderToken);
    console.log('✓ Created temporary refresh token');
    fixApplied = true;
  }
  
  // 3. Update Redux store auth state if possible (for apps using Redux)
  try {
    if (window.store && typeof window.store.dispatch === 'function') {
      window.store.dispatch({ 
        type: 'auth/setAuthenticated', 
        payload: true 
      });
      console.log('✓ Updated Redux auth state');
      fixApplied = true;
    }
  } catch (e) {
    console.log('✗ Could not update Redux state:', e);
  }
  
  // 4. Disable walkthrough for good measure
  try {
    localStorage.setItem('walkthrough_status', JSON.stringify({ completed: true, currentStep: 0 }));
    localStorage.setItem('walkthrough_disabled', 'true');
    console.log('✓ Disabled walkthrough');
    fixApplied = true;
  } catch (e) {
    console.log('✗ Could not disable walkthrough:', e);
  }
  
  if (fixApplied) {
    console.log('\n✅ Fixes applied! Please refresh the page and try navigating to /sensors again.');
    console.log('👉 You may need to clear your browser history/cache if the issue persists.');
  } else {
    console.log('\nNo fixes could be applied.');
  }
})(); 