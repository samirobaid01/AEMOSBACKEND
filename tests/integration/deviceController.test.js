const request = require('supertest');

// Mock all middleware before requiring app
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

// Mock the permission middleware
jest.mock('../../src/middlewares/permission', () => ({
  checkPermission: () => (req, res, next) => next(),
  checkOrgPermission: () => (req, res, next) => next()
}));

// Mock the deviceService
jest.mock('../../src/services/deviceService', () => ({
  getAllDevices: jest.fn(),
  getDeviceById: jest.fn(),
  createDevice: jest.fn(),
  updateDevice: jest.fn(),
  deleteDevice: jest.fn()
}));

// Now require the app and services
const app = require('../../src/app');
const deviceService = require('../../src/services/deviceService');

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
      deviceService.getAllDevices.mockResolvedValue(mockDevices);
      
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
      deviceService.getDeviceById.mockResolvedValue(mockDevice);

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
      deviceService.getDeviceById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/api/v1/devices/999');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
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
      
      deviceService.createDevice.mockResolvedValue(mockCreatedDevice);

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
      expect(response.body.status).toBe('error');
    });
  });

  describe('PATCH /devices/:id', () => {
    it('should update a device', async () => {
      // Arrange
      const updateData = { 
        name: 'Updated Device',
        description: 'Updated description' 
      };
      
      const mockUpdatedDevice = { 
        id: 1, 
        name: 'Updated Device',
        description: 'Updated description',
        status: true
      };
      
      deviceService.updateDevice.mockResolvedValue(mockUpdatedDevice);

      // Act
      const response = await request(app)
        .patch('/api/v1/devices/1')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device).toEqual(mockUpdatedDevice);
    });

    it('should return 404 if device not found', async () => {
      // Arrange
      deviceService.updateDevice.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .patch('/api/v1/devices/999')
        .send({ name: 'Updated Device' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('DELETE /devices/:id', () => {
    it('should delete a device', async () => {
      // Arrange
      deviceService.deleteDevice.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .delete('/api/v1/devices/1');

      // Assert
      expect(response.status).toBe(204);
    });

    it('should return 404 if device not found', async () => {
      // Arrange
      deviceService.deleteDevice.mockResolvedValue(false);

      // Act
      const response = await request(app)
        .delete('/api/v1/devices/999');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });
}); 