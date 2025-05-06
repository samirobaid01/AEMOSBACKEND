const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

// Mock auth middleware before requiring app
jest.mock('../../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    // Add a mock user to the request
    req.user = {
      id: 1,
      userName: 'Test User',
      email: 'test@example.com',
      status: true
    };
    req.token = 'mock-token';
    next();
  },
  authorize: (roles) => (req, res, next) => next()
}));

// Now require the app after mocking
const app = require('../../src/app');
const { Device } = require('../../src/models/initModels');

// Mock Sequelize models
jest.mock('../../src/models/initModels', () => ({
  Device: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

describe('Device API Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /devices', () => {
    it('should return all devices', async () => {
      // Arrange
      const mockDevices = [
        { id: 1, name: 'Device 1' },
        { id: 2, name: 'Device 2' },
      ];
      Device.findAll.mockResolvedValue(mockDevices);
      
      // Act
      const response = await request(app)
        .get('/api/v1/devices');
        
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.devices).toEqual(mockDevices);
    });
  });

  describe('GET /devices/:id', () => {
    it('should return a device by id', async () => {
      // Arrange
      const mockDevice = { id: 1, name: 'Device 1' };
      Device.findByPk.mockResolvedValue(mockDevice);

      // Act
      const response = await request(app)
        .get('/api/v1/devices/1');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device).toEqual(mockDevice);
    });

    it('should return 404 if device not found', async () => {
      // Arrange
      Device.findByPk.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/api/v1/devices/999');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /devices', () => {
    it('should create a new device', async () => {
      // Arrange
      const mockDeviceData = { 
        name: 'New Device', 
        description: 'Test device',
        status: true
      };
      const mockCreatedDevice = { 
        id: 1, 
        ...mockDeviceData,
        uuid: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      Device.create.mockResolvedValue(mockCreatedDevice);

      // Act
      const response = await request(app)
        .post('/api/v1/devices')
        .send(mockDeviceData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device).toEqual(mockCreatedDevice);
    });

    it('should return 400 for invalid input', async () => {
      // Arrange
      const invalidData = { /* missing required name */ };

      // Act
      const response = await request(app)
        .post('/api/v1/devices')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
    });
  });
}); 