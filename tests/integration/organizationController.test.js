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

// Mock the organizationService
jest.mock('../../src/services/organizationService', () => ({
  getAllOrganizations: jest.fn(),
  getOrganizationById: jest.fn(),
  createOrganization: jest.fn(),
  updateOrganization: jest.fn(),
  deleteOrganization: jest.fn()
}));

// Now require the app and services
const app = require('../../src/app');
const organizationService = require('../../src/services/organizationService');

describe('Organization API Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /organizations', () => {
    it('should return all organizations', async () => {
      // Arrange
      const mockOrganizations = [
        { id: 1, name: 'Organization 1' },
        { id: 2, name: 'Organization 2' },
      ];
      organizationService.getAllOrganizations.mockResolvedValue(mockOrganizations);
      
      // Act
      const response = await request(app)
        .get('/api/v1/organizations');
        
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organizations).toEqual(mockOrganizations);
    });
  });

  describe('GET /organizations/:id', () => {
    it('should return an organization by id', async () => {
      // Arrange
      const mockOrganization = { id: 1, name: 'Organization 1' };
      organizationService.getOrganizationById.mockResolvedValue(mockOrganization);

      // Act
      const response = await request(app)
        .get('/api/v1/organizations/1');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toEqual(mockOrganization);
    });

    it('should return 404 if organization not found', async () => {
      // Arrange
      organizationService.getOrganizationById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/api/v1/organizations/999');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /organizations', () => {
    it('should create a new organization', async () => {
      // Arrange
      const mockOrganizationData = { 
        name: 'New Organization', 
        detail: 'Test organization',
        status: true
      };
      const mockCreatedOrganization = { 
        id: 1, 
        ...mockOrganizationData
      };
      
      organizationService.createOrganization.mockResolvedValue(mockCreatedOrganization);

      // Act
      const response = await request(app)
        .post('/api/v1/organizations')
        .send(mockOrganizationData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toEqual(mockCreatedOrganization);
    });
  });

  describe('PATCH /organizations/:id', () => {
    it('should update an organization', async () => {
      // Arrange
      const updateData = { 
        name: 'Updated Organization',
        detail: 'Updated details' 
      };
      
      const mockUpdatedOrganization = { 
        id: 1, 
        name: 'Updated Organization',
        detail: 'Updated details',
        status: true
      };
      
      organizationService.updateOrganization.mockResolvedValue(mockUpdatedOrganization);

      // Act
      const response = await request(app)
        .patch('/api/v1/organizations/1')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toEqual(mockUpdatedOrganization);
    });

    it('should return 404 if organization not found', async () => {
      // Arrange
      organizationService.updateOrganization.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .patch('/api/v1/organizations/999')
        .send({ name: 'Updated Organization' });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /organizations/:id', () => {
    it('should delete an organization', async () => {
      // Arrange
      organizationService.deleteOrganization.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .delete('/api/v1/organizations/1');

      // Assert
      expect(response.status).toBe(204);
    });

    it('should return 404 if organization not found', async () => {
      // Arrange
      organizationService.deleteOrganization.mockResolvedValue(false);

      // Act
      const response = await request(app)
        .delete('/api/v1/organizations/999');

      // Assert
      expect(response.status).toBe(404);
    });
  });
}); 