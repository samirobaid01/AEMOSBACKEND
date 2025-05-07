/**
 * Walkthrough Disabler Script
 * 
 * Instructions:
 * 1. Open your browser developer tools (F12 or right-click -> Inspect)
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to execute
 * 
 * This will permanently disable the walkthrough feature that's causing the
 * page reload issues when navigating to /sensors.
 */

(function() {
  // Check if localStorage is available
  if (typeof localStorage === 'undefined') {
    console.error('❌ LocalStorage not available in this browser!');
    return;
  }
  
  try {
    // Set walkthrough as completed in localStorage
    localStorage.setItem('walkthrough_status', JSON.stringify({ 
      completed: true, 
      currentStep: 0 
    }));
    
    // Add a permanent flag to disable walkthrough
    localStorage.setItem('walkthrough_disabled', 'true');
    
    // Also try to disable any related features
    localStorage.setItem('walkthrough_seen', 'true');
    localStorage.setItem('tour_completed', 'true');
    
    console.log('✅ Walkthrough completely disabled!');
    console.log('Please refresh the page for changes to take effect.');
    
    return true;
  } catch (error) {
    console.error('❌ Error disabling walkthrough:', error);
    return false;
  }
})(); 