/**
 * Helper functions for managing walkthrough state in localStorage
 */

/**
 * Get the walkthrough status from localStorage
 * @returns Current walkthrough status
 */
export const getWalkthroughStatus = (): { completed: boolean, currentStep: number } => {
  try {
    const savedStatus = localStorage.getItem('walkthrough_status');
    if (savedStatus) {
      return JSON.parse(savedStatus);
    }
  } catch (error) {
    console.error('Error loading walkthrough status from localStorage:', error);
  }
  return { completed: false, currentStep: 0 };
};

/**
 * Save walkthrough status to localStorage
 * @param completed Whether the walkthrough is completed
 * @param currentStep Current step index
 */
export const saveWalkthroughStatus = (completed: boolean, currentStep: number): void => {
  try {
    localStorage.setItem('walkthrough_status', JSON.stringify({ completed, currentStep }));
  } catch (error) {
    console.error('Error saving walkthrough status to localStorage:', error);
  }
};

/**
 * Mark the walkthrough as completed (useful for manual override)
 */
export const markWalkthroughCompleted = (): void => {
  saveWalkthroughStatus(true, 0);
};

/**
 * Reset the walkthrough status
 */
export const resetWalkthroughStatus = (): void => {
  saveWalkthroughStatus(false, 0);
};

/**
 * Completely disable walkthrough by marking as completed and removing from localStorage
 * This can fix issues with walkthrough causing page reloads or redirects
 */
export const disableWalkthroughCompletely = (): void => {
  // Mark as completed in localStorage
  saveWalkthroughStatus(true, 0);
  
  // Also add a more permanent flag
  try {
    localStorage.setItem('walkthrough_disabled', 'true');
  } catch (error) {
    console.error('Error disabling walkthrough completely:', error);
  }
  
  console.log('Walkthrough completely disabled to prevent redirects');
}; 