/**
 * Global Jest setup - handles common mocks and cleanup
 */
// -----------------------------
// ENV DEFAULTS
// -----------------------------
process.env.NODE_ENV = 'test';
process.env.NOTIFICATIONS_ENABLED = 'true';
process.env.REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

// -----------------------------
// STORE ORIGINAL IMPLEMENTATIONS
// ----------------------------- 

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

// -----------------------------
// AUTO-MOCK BullMQ
// -----------------------------
jest.mock('bullmq', () => {
  const addMock = jest.fn();

  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: addMock
    })),

    Worker: jest.fn().mockImplementation((name, processor) => ({
      name,
      processor,
      on: jest.fn()
    })),

    QueueEvents: jest.fn(),

    __addMock: addMock
  };
});
// -----------------------------
// CLEAN UP BEFORE EACH TEST
// -----------------------------
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