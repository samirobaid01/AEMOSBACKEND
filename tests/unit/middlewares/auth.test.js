const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../../../src/middlewares/auth');
const { ApiError } = require('../../../src/middlewares/errorHandler');
const { User, Role } = require('../../../src/models/initModels');
const { isTokenBlacklisted } = require('../../../src/services/tokenBlacklistService');
const config = require('../../../src/config');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../src/models/initModels', () => ({
  User: {
    findByPk: jest.fn()
  },
  Role: {
    findByPk: jest.fn()
  }
}));
jest.mock('../../../src/services/tokenBlacklistService', () => ({
  isTokenBlacklisted: jest.fn()
}));

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should pass when token is valid', async () => {
      // Arrange
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
      const mockToken = 'valid.jwt.token';
      req.headers.authorization = `Bearer ${mockToken}`;

      isTokenBlacklisted.mockReturnValue(false);
      jwt.verify.mockReturnValue({ id: 1 });
      User.findByPk.mockResolvedValue(mockUser);

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, config.jwt.secret);
      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(req.user).toEqual(mockUser);
      expect(req.token).toEqual(mockToken);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject when no token is provided', async () => {
      // Arrange
      req.headers.authorization = undefined;

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
    });

    it('should reject when token format is invalid', async () => {
      // Arrange
      req.headers.authorization = 'InvalidFormat';

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
    });

    it('should reject when token is blacklisted', async () => {
      // Arrange
      const mockToken = 'blacklisted.jwt.token';
      req.headers.authorization = `Bearer ${mockToken}`;
      isTokenBlacklisted.mockReturnValue(true);

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(isTokenBlacklisted).toHaveBeenCalledWith(mockToken);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('Token is no longer valid');
    });

    it('should reject when user does not exist', async () => {
      // Arrange
      const mockToken = 'valid.jwt.token';
      req.headers.authorization = `Bearer ${mockToken}`;
      isTokenBlacklisted.mockReturnValue(false);
      jwt.verify.mockReturnValue({ id: 999 });
      User.findByPk.mockResolvedValue(null);

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, config.jwt.secret);
      expect(User.findByPk).toHaveBeenCalledWith(999, expect.any(Object));
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('User not found or inactive');
    });

    it('should handle JWT verification errors', async () => {
      // Arrange
      const mockToken = 'invalid.jwt.token';
      req.headers.authorization = `Bearer ${mockToken}`;
      isTokenBlacklisted.mockReturnValue(false);
      
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => { throw jwtError; });

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, config.jwt.secret);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('Invalid token');
    });

    it('should handle expired token errors', async () => {
      // Arrange
      const mockToken = 'expired.jwt.token';
      req.headers.authorization = `Bearer ${mockToken}`;
      isTokenBlacklisted.mockReturnValue(false);
      
      const jwtError = new Error('Token expired');
      jwtError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => { throw jwtError; });

      // Act
      await authenticate(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, config.jwt.secret);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('Token expired');
    });
  });

  describe('authorize', () => {
    it('should pass when user has the required role', async () => {
      // Arrange
      req.user = { id: 1, role: 2 };
      const mockRole = { id: 2, name: 'admin' };
      Role.findByPk.mockResolvedValue(mockRole);
      const middleware = authorize(['admin', 'superuser']);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(Role.findByPk).toHaveBeenCalledWith(2);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject when user does not have the required role', async () => {
      // Arrange
      req.user = { id: 1, role: 3 };
      const mockRole = { id: 3, name: 'user' };
      Role.findByPk.mockResolvedValue(mockRole);
      const middleware = authorize(['admin', 'superuser']);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(Role.findByPk).toHaveBeenCalledWith(3);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toBe('Access denied: Insufficient permissions');
    });

    it('should reject when role is not found', async () => {
      // Arrange
      req.user = { id: 1, role: 4 };
      Role.findByPk.mockResolvedValue(null);
      const middleware = authorize(['admin', 'superuser']);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(Role.findByPk).toHaveBeenCalledWith(4);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toBe('Access denied: Insufficient permissions');
    });

    it('should reject when user object is not present', async () => {
      // Arrange
      req.user = undefined;
      const middleware = authorize(['admin']);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toBe('Authentication required');
    });

    it('should handle role lookup errors', async () => {
      // Arrange
      req.user = { id: 1, role: 2 };
      const mockError = new Error('Database error');
      Role.findByPk.mockRejectedValue(mockError);
      const middleware = authorize(['admin']);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(Role.findByPk).toHaveBeenCalledWith(2);
      expect(next).toHaveBeenCalledWith(mockError);
    });
  });
}); 