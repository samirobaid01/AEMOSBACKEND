import { http, HttpResponse } from 'msw';

// Mock database to store user walkthrough statuses
const userWalkthroughStatus = new Map<string, boolean>();

// Define types for request bodies
interface WalkthroughRequestBody {
  userId: string;
}

// Create mock handlers to simulate the API
export const handlers = [
  // Walkthrough status endpoint
  http.get('/api/walkthrough/status', () => {
    // For demo purposes, return enabled: true from the server
    return HttpResponse.json({
      enabled: true,
      message: 'Walkthrough status retrieved successfully'
    });
  }),

  // Mark walkthrough as completed
  http.post('/api/walkthrough/complete', async ({ request }) => {
    const body = await request.json() as WalkthroughRequestBody;
    const { userId } = body;
    
    if (!userId) {
      return HttpResponse.json(
        {
          success: false,
          message: 'User ID is required'
        },
        { status: 400 }
      );
    }
    
    // Store completion status
    userWalkthroughStatus.set(userId, true);
    
    return HttpResponse.json({
      success: true,
      message: 'Walkthrough marked as completed'
    });
  }),

  // Reset walkthrough completion status (for testing)
  http.post('/api/walkthrough/reset', async ({ request }) => {
    const body = await request.json() as WalkthroughRequestBody;
    const { userId } = body;
    
    if (!userId) {
      return HttpResponse.json(
        {
          success: false,
          message: 'User ID is required'
        },
        { status: 400 }
      );
    }
    
    // Remove completion status
    userWalkthroughStatus.delete(userId);
    
    return HttpResponse.json({
      success: true,
      message: 'Walkthrough status reset successfully'
    });
  }),
]; 