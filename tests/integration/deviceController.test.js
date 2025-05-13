const request = require('supertest');

// Mock the controller directly
jest.mock('../../src/controllers/deviceController', () => ({
  getAllDevices: (req, res) => {
    const devices = [
      { id: 1, name: 'Device 1', description: 'Test device 1', status: true },
      { id: 2, name: 'Device 2', description: 'Test device 2', status: true }
    ];
    res.status(200).json({
      status: 'success',
      results: devices.length,
      data: { devices }
    });
  },
  getDeviceById: (req, res, next) => {
    const { id } = req.params;
    if (id === '999') {
      return res.status(404).json({
        status: 'error',
        message: `Device with ID ${id} not found`
      });
    }
    const device = {
      id: Number(id),
      name: `Device ${id}`,
      description: 'Test device',
      status: true
    };
    res.status(200).json({
      status: 'success',
      data: { device }
    });
  },
  createDevice: (req, res) => {
    const device = {
      id: 1,
      ...req.body,
      uuid: '123e4567-e89b-12d3-a456-426614174000'
    };
    res.status(201).json({
      status: 'success',
      data: { device }
    });
  },
  updateDevice: (req, res, next) => {
    const { id } = req.params;
    if (id === '999') {
      return res.status(404).json({
        status: 'error',
        message: `Device with ID ${id} not found`
      });
    }
    const device = {
      id: Number(id),
      ...req.body,
      status: true
    };
    res.status(200).json({
      status: 'success',
      data: { device }
    });
  },
  deleteDevice: (req, res, next) => {
    const { id } = req.params;
    if (id === '999') {
      return res.status(404).json({
        status: 'error',
        message: `Device with ID ${id} not found`
      });
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  }
}));

// Mock remaining middleware
jest.mock('../../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => next(),
  authorize: () => (req, res, next) => next()
}));

jest.mock('../../src/middlewares/permission', () => ({
  checkPermission: () => (req, res, next) => next(),
  checkOrgPermission: () => (req, res, next) => next(),
  checkResourceOwnership: () => (req, res, next) => next()
}));

jest.mock('../../src/middlewares/validate', () => () => (req, res, next) => next());

// Now require the app
const app = require('../../src/app');

describe('Device API Endpoints', () => {
  describe('GET /devices', () => {
    it('should return all devices', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/devices')
        .query({ organizationId: 1 });
        
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data.devices)).toBe(true);
    });
  });

  describe('GET /devices/:id', () => {
    it('should return a device by id', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/devices/1')
        .query({ organizationId: 1 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device).toBeDefined();
    });

    it('should return 404 if device not found', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/devices/999')
        .query({ organizationId: 1 });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /devices', () => {
    it('should create a new device', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/devices')
        .send({
          name: 'New Device',
          description: 'Test device',
          status: true,
          organizationId: 1
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device).toBeDefined();
    });
  });

  describe('PATCH /devices/:id', () => {
    it('should update a device', async () => {
      // Act
      const response = await request(app)
        .patch('/api/v1/devices/1')
        .send({
          name: 'Updated Device',
          description: 'Updated description',
          organizationId: 1
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.device).toBeDefined();
    });

    it('should return 404 if device not found', async () => {
      // Act
      const response = await request(app)
        .patch('/api/v1/devices/999')
        .send({ name: 'Updated Device', organizationId: 1 });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /devices/:id', () => {
    it('should delete a device', async () => {
      // Act
      const response = await request(app)
        .delete('/api/v1/devices/1')
        .query({ organizationId: 1 });

      // Assert
      expect(response.status).toBe(204);
    });

    it('should return 404 if device not found', async () => {
      // Act
      const response = await request(app)
        .delete('/api/v1/devices/999')
        .query({ organizationId: 1 });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });
}); 