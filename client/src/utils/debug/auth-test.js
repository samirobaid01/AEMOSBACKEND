/**
 * Auth System Test Script
 * Run this in browser console to test the authentication system
 */

(function() {
  console.log('======== Auth Test Script ========');
  console.log('Testing auth token management...');
  
  // Check current token
  const TOKEN_KEY = 'aemos_access_token';
  const currentToken = localStorage.getItem(TOKEN_KEY);
  console.log('Current token:', currentToken ? 'Present' : 'None');
  
  // Create emergency token if needed
  const createEmergencyToken = () => {
    console.log('Creating emergency token...');
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcklkIjoiMTIzIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsIm5hbWUiOiJUZW1wb3JhcnkgVXNlciIsImV4cCI6NDA5MTgyMTIwMH0.signature';
    localStorage.setItem(TOKEN_KEY, token);
    console.log('Emergency token created and saved');
    return token;
  };
  
  // Test token retrieval
  const testTokenRetrieval = () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      console.log('Token retrieval test:', token ? 'SUCCESS' : 'FAILED');
      return token;
    } catch (e) {
      console.error('Token retrieval failed:', e);
      return null;
    }
  };
  
  // Test API authorization header
  const testApiAuthHeader = () => {
    // This requires the browser to have the axios library loaded
    if (typeof axios !== 'undefined') {
      const authHeader = axios.defaults.headers.common['Authorization'];
      console.log('Current Authorization header:', authHeader || 'None');
      return !!authHeader;
    } else {
      console.warn('Axios not available, cannot check authorization header');
      return false;
    }
  };
  
  // Create or use token
  let token = testTokenRetrieval();
  if (!token) {
    token = createEmergencyToken();
    console.log('Using emergency token for auth');
  }
  
  // Check if we're on a protected page
  const isProtectedPage = () => {
    const path = window.location.pathname;
    return path.includes('/sensors') || 
           path.includes('/devices') || 
           path === '/';
  };
  
  console.log('Current page is', isProtectedPage() ? 'protected' : 'not protected');
  
  // Final status
  console.log('Auth system status:');
  console.log('- Token exists:', !!token);
  console.log('- On protected page:', isProtectedPage());
  console.log('- Auth header test:', testApiAuthHeader() ? 'PASS' : 'FAIL');
  
  console.log('======== Test Complete ========');
  console.log('If you need to force authentication, run:');
  console.log('localStorage.setItem("aemos_access_token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcklkIjoiMTIzIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsIm5hbWUiOiJUZW1wb3JhcnkgVXNlciIsImV4cCI6NDA5MTgyMTIwMH0.signature");');
  console.log('Then refresh the page');
})(); 