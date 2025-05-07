const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models/initModels');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');
const authService = require('../../src/services/authService');

// Mock user data
const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedPassword123',
  roleId: 2
};

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh token with valid refresh token', async () => {
      // Mock authService.refreshToken to test only the API endpoint
      const refreshSpy = jest.spyOn(authService, 'refreshToken').mockResolvedValue({
        token: 'new-access-token'
      });

      // Make the request with a valid refresh token
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'valid-refresh-token'
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.token).toBe('new-access-token');
      expect(refreshSpy).toHaveBeenCalledWith('valid-refresh-token');
      
      // Restore the original method
      refreshSpy.mockRestore();
    });

    it('should return 400 when refresh token is missing', async () => {
      // Make the request without refresh token
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({});
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation error: "refreshToken" is required');
    });

    it('should return 401 with invalid refresh token', async () => {
      // Mock the service to throw an error
      const refreshSpy = jest.spyOn(authService, 'refreshToken').mockRejectedValue({
        statusCode: 401,
        message: 'Invalid refresh token'
      });

      // Make the request with an invalid token
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'invalid-refresh-token'
        });
      
      // Assertions
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      
      // Restore the original method
      refreshSpy.mockRestore();
    });

    it('should return 401 with expired refresh token', async () => {
      // Mock the service to throw an error for expired token
      const refreshSpy = jest.spyOn(authService, 'refreshToken').mockRejectedValue({
        statusCode: 401,
        message: 'Refresh token expired'
      });

      // Make the request with an expired token
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({
          refreshToken: 'expired-refresh-token'
        });
      
      // Assertions
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      
      // Restore the original method
      refreshSpy.mockRestore();
    });
  });
}); 