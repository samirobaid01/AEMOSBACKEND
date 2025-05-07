const authController = require('../../src/controllers/authController');
const authService = require('../../src/services/authService');
const { ApiError } = require('../../src/middlewares/errorHandler');

// Mock dependencies
jest.mock('../../src/services/authService');
jest.mock('../../src/services/userService');

describe('Auth Controller', () => {
  // Mock request and response objects
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      user: {},
      token: 'mock-token'
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('refreshToken', () => {
    it('should refresh token and return new token', async () => {
      // Arrange
      req.body.refreshToken = 'valid-refresh-token';
      authService.refreshToken.mockResolvedValue({ token: 'new-access-token' });

      // Act
      await authController.refreshToken(req, res, next);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          token: 'new-access-token'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 error when refresh token is missing', async () => {
      // Arrange
      req.body = {}; // No refreshToken
      
      // Act
      await authController.refreshToken(req, res, next);

      // Assert
      expect(authService.refreshToken).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(400);
      expect(next.mock.calls[0][0].message).toBe('Refresh token is required');
    });

    it('should handle service errors', async () => {
      // Arrange
      req.body.refreshToken = 'invalid-refresh-token';
      const error = new Error('Service error');
      authService.refreshToken.mockRejectedValue(error);

      // Act
      await authController.refreshToken(req, res, next);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith('invalid-refresh-token');
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle invalid refresh token errors', async () => {
      // Arrange
      req.body.refreshToken = 'expired-refresh-token';
      const apiError = new ApiError(401, 'Refresh token expired');
      authService.refreshToken.mockRejectedValue(apiError);

      // Act
      await authController.refreshToken(req, res, next);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith('expired-refresh-token');
      expect(next).toHaveBeenCalledWith(apiError);
    });
  });
}); 