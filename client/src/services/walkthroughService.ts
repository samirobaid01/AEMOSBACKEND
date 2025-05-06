import apiClient from '../api/apiClient';
import walkthroughConfig from '../config/walkthrough';

// Get walkthrough status from the API
const getWalkthroughStatus = async (): Promise<{ enabled: boolean }> => {
  try {
    const response = await apiClient.get(walkthroughConfig.apiEndpoint);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch walkthrough status:', error);
    // Default to configuration value if API fails
    return { enabled: walkthroughConfig.enabled };
  }
};

// Update user's walkthrough completion status on the server (optional)
const completeWalkthrough = async (userId: string): Promise<void> => {
  try {
    await apiClient.post('/api/walkthrough/complete', { userId });
  } catch (error) {
    console.error('Failed to update walkthrough completion status:', error);
  }
};

// Reset walkthrough status on the server (for testing)
const resetWalkthrough = async (userId: string): Promise<void> => {
  try {
    await apiClient.post('/api/walkthrough/reset', { userId });
  } catch (error) {
    console.error('Failed to reset walkthrough status:', error);
  }
};

const walkthroughService = {
  getWalkthroughStatus,
  completeWalkthrough,
  resetWalkthrough
};

export default walkthroughService; 