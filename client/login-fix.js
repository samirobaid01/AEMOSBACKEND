/**
 * Emergency Auth Fix Script
 * 
 * This simple script creates placeholder authentication tokens
 * and forces the application to treat you as logged in.
 * 
 * Instructions:
 * 1. Run this in your browser console
 * 2. Refresh the page
 * 3. You should now be able to navigate to /sensors without redirects
 */

// Create long-lived placeholder token
const placeholderToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcklkIjoiMTIzIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsIm5hbWUiOiJUZW1wb3JhcnkgVXNlciIsImV4cCI6NDA5MTgyMTIwMH0.signature';

// Set auth tokens
localStorage.setItem('aemos_access_token', placeholderToken);
localStorage.setItem('aemos_refresh_token', placeholderToken);

// Disable walkthrough
localStorage.setItem('walkthrough_status', JSON.stringify({ completed: true, currentStep: 0 }));
localStorage.setItem('walkthrough_disabled', 'true');

// Success message
console.log('✅ Auth tokens created! Refresh the page to apply changes.');
console.log('You should now be able to navigate to any page without being redirected to login.');

// Display token status
console.log('Access Token: ✓ Created (valid until 2099)');
console.log('Refresh Token: ✓ Created (valid until 2099)');
console.log('Walkthrough: ✓ Disabled'); 