const request = require('supertest');
const app = require('../../src/app');
const { Device } = require('../../src/models/initModels');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

// Mock Sequelize models
jest.mock('../../src/models/initModels', () => ({
  Device: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  User: {
    findByPk: jest.fn().mockResolvedValue({ id: 1, name: 'Test User' })
  },
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue()
  },
  initModels: jest.fn().mockResolvedValue()
}));

describe('Device API Endpoints', () => {
  let token;

  beforeEach(() => {
    // Generate a valid token for testing
    token = jwt.sign({ id: 1 }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/devices', () => {
    it('should return all devices', async () => {
      // Arrange
      const mockDevices = [
        { id: 1, name: 'Device 1' },
        { id: 2, name: 'Device 2' },
      ];
      Device.findAll.mockResolvedValue(mockDevices);

      // Act
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.devices).toEqual(mockDevices);
    });

    it('should return 401 if no token provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/devices');

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/devices/:id', () => {
    it('should return a device by id', async () => {
      // Arrange
      const mockDevice = { id: 1, name: 'Device 1' };
      Device.findByPk.mockResolvedValue(mockDevice);

      // Act
      const response = await request(app)
        .get('/api/v1/devices/1')
        .set('Authorization', `Bearer ${token}`);

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
        .get('/api/v1/devices/999')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/devices', () => {
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
        .set('Authorization', `Bearer ${token}`)
        .send(mockDeviceData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device).toEqual(mockCreatedDevice);
    });

    it.skip('should return 400 for invalid input', async () => {
      // Arrange
      const invalidData = { /* missing required name */ };

      // Act
      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
    });
  });
}); 