const socketManager = require('../../src/utils/socketManager');
const notificationService = require('../../src/services/notificationService');

// Mock socket manager functions
jest.mock('../../src/utils/socketManager', () => ({
  broadcastToRoom: jest.fn().mockReturnValue(true),
  broadcastToAll: jest.fn().mockReturnValue(true),
  sendToClient: jest.fn().mockReturnValue(true),
  getIo: jest.fn()
}));

// Mock config module with broadcastAll flag
jest.mock('../../src/config', () => {
  // Create a mock config object that we can change during tests
  const mockConfig = {
    broadcastAll: true,
    features: {
      notifications: {
        broadcastAll: true,
        bufferSize: 1000,
        broadcastInterval: 1000
      }
    }
  };
  
  return mockConfig;
});

// Get access to the mocked config
const mockConfig = require('../../src/config');

describe('Socket Notification Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset broadcastAll to true for most tests
    mockConfig.broadcastAll = true;
    mockConfig.features.notifications.broadcastAll = true;
  });

  it('should send socket notification to a single user', () => {
    // Arrange
    const userId = '123';
    const event = 'test-event';
    const data = { message: 'Test message' };

    // Act
    const result = notificationService.sendSocketNotification(userId, event, data);

    // Assert
    expect(result).toBe(true);
    expect(socketManager.broadcastToRoom).toHaveBeenCalledWith(userId, event, data);
    expect(socketManager.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(socketManager.broadcastToAll).not.toHaveBeenCalled();
  });

  it('should send socket notifications to multiple targets', () => {
    // Arrange
    const targets = ['123', '456', '789'];
    const event = 'test-event';
    const data = { message: 'Test message' };

    // Act
    const result = notificationService.sendSocketNotification(targets, event, data);

    // Assert
    expect(result).toBe(true);
    expect(socketManager.broadcastToRoom).toHaveBeenCalledTimes(3);
    expect(socketManager.broadcastToRoom).toHaveBeenCalledWith('123', event, data);
    expect(socketManager.broadcastToRoom).toHaveBeenCalledWith('456', event, data);
    expect(socketManager.broadcastToRoom).toHaveBeenCalledWith('789', event, data);
  });

  it('should broadcast to all when no targets provided and broadcastAll is enabled', () => {
    // Arrange
    const event = 'test-event';
    const data = { message: 'Test message' };

    // Act
    const result = notificationService.sendSocketNotification(null, event, data);

    // Assert
    expect(result).toBe(true);
    expect(socketManager.broadcastToAll).toHaveBeenCalledWith(event, data);
    expect(socketManager.broadcastToRoom).not.toHaveBeenCalled();
  });
  
  it('should NOT broadcast to all when no targets provided and broadcastAll is disabled', () => {
    // Arrange
    const event = 'test-event';
    const data = { message: 'Test message' };
    
    // Disable broadcastAll for this test
    mockConfig.broadcastAll = false;

    // Act
    const result = notificationService.sendSocketNotification(null, event, data);

    // Assert
    expect(result).toBe(true);
    expect(socketManager.broadcastToAll).not.toHaveBeenCalled();
    expect(socketManager.broadcastToRoom).not.toHaveBeenCalled();
  });
  
  it('should handle invalid event names', () => {
    // Arrange
    const userId = '123';
    const data = { message: 'Test message' };

    // Act - calling with null event name
    const result = notificationService.sendSocketNotification(userId, null, data);

    // Assert
    expect(result).toBe(false);
    expect(socketManager.broadcastToRoom).not.toHaveBeenCalled();
    expect(socketManager.broadcastToAll).not.toHaveBeenCalled();
  });
  
  it('should handle non-object data by converting to message object', () => {
    // Arrange
    const userId = '123';
    const event = 'test-event';
    const stringData = 'String message';
    const expectedData = { message: 'String message' };

    // Act
    const result = notificationService.sendSocketNotification(userId, event, stringData);

    // Assert
    expect(result).toBe(true);
    expect(socketManager.broadcastToRoom).toHaveBeenCalledWith(userId, event, expectedData);
  });
  
  it('should filter out invalid targets from array', () => {
    // Arrange
    const targets = ['123', null, '456', undefined, ''];
    const event = 'test-event';
    const data = { message: 'Test message' };

    // Act
    const result = notificationService.sendSocketNotification(targets, event, data);

    // Assert
    expect(result).toBe(true);
    expect(socketManager.broadcastToRoom).toHaveBeenCalledTimes(2); // Only 2 valid targets
    expect(socketManager.broadcastToRoom).toHaveBeenCalledWith('123', event, data);
    expect(socketManager.broadcastToRoom).toHaveBeenCalledWith('456', event, data);
  });
  
  it('should broadcast to all when array of targets is empty after filtering and broadcastAll is enabled', () => {
    // Arrange
    const targets = [null, undefined, ''];
    const event = 'test-event';
    const data = { message: 'Test message' };

    // Act
    const result = notificationService.sendSocketNotification(targets, event, data);

    // Assert
    expect(result).toBe(true);
    expect(socketManager.broadcastToRoom).not.toHaveBeenCalled();
    expect(socketManager.broadcastToAll).toHaveBeenCalledWith(event, data);
  });
  
  it('should NOT broadcast to all when array of targets is empty and broadcastAll is disabled', () => {
    // Arrange
    const targets = [null, undefined, ''];
    const event = 'test-event';
    const data = { message: 'Test message' };
    
    // Disable broadcastAll for this test
    mockConfig.broadcastAll = false;

    // Act
    const result = notificationService.sendSocketNotification(targets, event, data);

    // Assert
    expect(result).toBe(true);
    expect(socketManager.broadcastToRoom).not.toHaveBeenCalled();
    expect(socketManager.broadcastToAll).not.toHaveBeenCalled();
  });
  
  it('should respect forceBroadcast parameter even when broadcastAll is disabled', () => {
    // Arrange
    const targets = [null, undefined, ''];
    const event = 'test-event';
    const data = { message: 'Test message' };
    const forceBroadcast = true;
    
    // Disable broadcastAll for this test
    mockConfig.broadcastAll = false;

    // Act
    const result = notificationService.sendSocketNotification(targets, event, data, forceBroadcast);

    // Assert
    expect(result).toBe(true);
    expect(socketManager.broadcastToRoom).not.toHaveBeenCalled();
    expect(socketManager.broadcastToAll).toHaveBeenCalledWith(event, data);
  });
}); 