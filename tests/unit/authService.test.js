const { User } = require('../../src/models/initModels');
const { ApiError } = require('../../src/middlewares/errorHandler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../../src/config');
const tokenBlacklistService = require('../../src/services/tokenBlacklistService');

// Mock dependencies
jest.mock('../../src/models/initModels', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn()
  }
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn()
}));

jest.mock('../../src/services/tokenBlacklistService', () => ({
  blacklistToken: jest.fn()
}));

// Import the service after mocking dependencies
const authService = require('../../src/services/authService');

describe('Auth Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        roleId: 2
      };
      
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      
      // Mock JWT sign to return our expected token
      jwt.sign.mockReturnValue('mock-token');
      
      // Act
      const result = await authService.login('test@example.com', 'password123');
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 2
        },
        token: 'mock-token',
        refreshToken: 'mock-token'
      });
    });
    
    it('should throw error with invalid email', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);
      
      // Act & Assert
      await expect(authService.login('wrong@example.com', 'password123'))
        .rejects
        .toThrow('Invalid email or password');
    });
    
    it('should throw error with invalid password', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password'
      };
      
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      
      // Act & Assert
      await expect(authService.login('test@example.com', 'wrong_password'))
        .rejects
        .toThrow('Invalid email or password');
    });
  });
  
  describe('logout', () => {
    it('should blacklist valid token', () => {
      // Arrange
      const mockToken = 'valid-token';
      const mockDecodedToken = { id: 1, exp: Math.floor(Date.now() / 1000) + 3600 }; // token expires in 1 hour
      
      jwt.verify.mockReturnValue(mockDecodedToken);
      
      // Act
      const result = authService.logout(mockToken);
      
      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, config.jwt.secret);
      expect(tokenBlacklistService.blacklistToken).toHaveBeenCalledWith(mockToken, expect.any(Number));
      expect(result).toBe(true);
    });
    
    it('should handle invalid token gracefully', () => {
      // Arrange
      const mockToken = 'invalid-token';
      
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Act
      const result = authService.logout(mockToken);
      
      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, config.jwt.secret);
      expect(tokenBlacklistService.blacklistToken).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
  
  describe('generateToken', () => {
    it('should generate JWT with correct payload', () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        roleId: 2
      };
      
      // Act
      // Override the jwt.sign implementation just for this test
      jwt.sign.mockReturnValueOnce('mock-token');
      const token = authService.generateToken(mockUser);
      
      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: 1,
          email: 'test@example.com',
          roleId: 2
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      expect(token).toBe('mock-token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct payload', () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        roleId: 2
      };
      
      // Act
      jwt.sign.mockReturnValueOnce('mock-refresh-token');
      const token = authService.generateRefreshToken(mockUser);
      
      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: 1,
          tokenType: 'refresh'
        },
        config.jwt.secret,
        { expiresIn: '7d' }
      );
      expect(token).toBe('mock-refresh-token');
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Arrange
      const mockRefreshToken = 'valid-refresh-token';
      const mockDecodedToken = { 
        id: 1, 
        tokenType: 'refresh'
      };
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        roleId: 2
      };
      
      jwt.verify.mockReturnValue(mockDecodedToken);
      User.findByPk.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValueOnce('new-access-token');
      
      // Act
      const result = await authService.refreshToken(mockRefreshToken);
      
      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockRefreshToken, config.jwt.secret);
      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        token: 'new-access-token'
      });
    });
    
    it('should throw error when token is not a refresh token', async () => {
      // Arrange
      const mockToken = 'not-refresh-token';
      const mockDecodedToken = { 
        id: 1,
        // Missing tokenType: 'refresh'
      };
      
      jwt.verify.mockReturnValue(mockDecodedToken);
      
      // Act & Assert
      await expect(authService.refreshToken(mockToken))
        .rejects
        .toThrow('Invalid refresh token');
    });
    
    it('should throw error when user not found', async () => {
      // Arrange
      const mockToken = 'valid-refresh-token';
      const mockDecodedToken = { 
        id: 999, // Non-existent user ID
        tokenType: 'refresh'
      };
      
      jwt.verify.mockReturnValue(mockDecodedToken);
      User.findByPk.mockResolvedValue(null);
      
      // Act & Assert
      await expect(authService.refreshToken(mockToken))
        .rejects
        .toThrow('User not found');
    });
    
    it('should throw error when token has invalid signature', async () => {
      // Arrange
      const mockToken = 'invalid-signature-token';
      
      jwt.verify.mockImplementation(() => {
        const error = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });
      
      // Act & Assert
      await expect(authService.refreshToken(mockToken))
        .rejects
        .toThrow('Invalid refresh token');
    });
    
    it('should throw error when token is expired', async () => {
      // Arrange
      const mockToken = 'expired-token';
      
      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });
      
      // Act & Assert
      await expect(authService.refreshToken(mockToken))
        .rejects
        .toThrow('Refresh token expired');
    });
  });
  
  describe('verifyToken', () => {
    it('should verify valid token', () => {
      // Arrange
      const mockToken = 'valid-token';
      const mockDecodedToken = { id: 1, email: 'test@example.com' };
      
      jwt.verify.mockReturnValue(mockDecodedToken);
      
      // Act
      const result = authService.verifyToken(mockToken);
      
      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, config.jwt.secret);
      expect(result).toEqual(mockDecodedToken);
    });
    
    it('should throw error for invalid token', () => {
      // Arrange
      const mockToken = 'invalid-token';
      
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Act & Assert
      expect(() => authService.verifyToken(mockToken))
        .toThrow('Invalid or expired token');
    });
  });
}); 