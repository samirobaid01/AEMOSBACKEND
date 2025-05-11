/**
 * Global Jest setup - handles common mocks and cleanup
 */

// Store the original implementations to restore later
const originalSetInterval = global.setInterval;
let cleanupFns = [];

// Mock setInterval to track and clean up intervals
global.setInterval = function mockedSetInterval(fn, delay) {
  // Call the original function to create the interval
  const intervalId = originalSetInterval(fn, delay);
  
  // Register a cleanup function
  cleanupFns.push(() => clearInterval(intervalId));
  
  return intervalId;
};

// Auto-mock the notification manager in all tests
jest.mock('../src/utils/notificationManager', () => {
  // Create a mock implementation with the same API but no actual intervals
  const sendImmediateNotificationMock = jest.fn();
  
  const mockManager = {
    dataBuffers: new Map(),
    broadcastInterval: 100,
    maxBufferSize: 100,
    debug: false,
    intervalId: null,

    // Mock methods with proper implementation
    sendImmediateNotification: sendImmediateNotificationMock,
    
    queueDataStreamNotification: jest.fn().mockImplementation((dataStream, priority, broadcastAll) => {
      if (priority === 'high') {
        sendImmediateNotificationMock(dataStream, broadcastAll);
      }
      return true;
    }),
    
    processPendingNotifications: jest.fn(),
    
    shutdown: jest.fn(() => {
      mockManager.dataBuffers.clear();
    })
  };
  
  return mockManager;
});

// Clean up before each test
beforeEach(() => {
  // Reset mocks
  jest.resetAllMocks();
});

// Clean up after all tests
afterAll(() => {
  // Clean up all tracked intervals
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  
  // Restore original setInterval
  global.setInterval = originalSetInterval;
}); 