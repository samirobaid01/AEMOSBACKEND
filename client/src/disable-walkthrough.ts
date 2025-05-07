/**
 * Utility script to completely disable the walkthrough feature
 * 
 * Run this script with:
 * npx ts-node disable-walkthrough.ts
 * 
 * or within your browser console with:
 * localStorage.setItem('walkthrough_status', JSON.stringify({ completed: true, currentStep: 0 }));
 * localStorage.setItem('walkthrough_disabled', 'true');
 */

import { disableWalkthroughCompletely } from './utils/walkthroughHelpers';

// Disable the walkthrough completely
disableWalkthroughCompletely();

console.log('✅ Walkthrough feature has been completely disabled');
console.log('This should fix the page reload issues when navigating to /sensors');
console.log('');
console.log('To re-enable the walkthrough in the future, run:');
console.log('localStorage.removeItem("walkthrough_disabled");');
console.log('localStorage.setItem("walkthrough_status", JSON.stringify({ completed: false, currentStep: 0 }));'); 