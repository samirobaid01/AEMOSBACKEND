const request = require('supertest');
const { Organization } = require('../../src/models/initModels');

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

// Mock Sequelize models
jest.mock('../../src/models/initModels', () => ({
  Organization: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockImplementation(function() { return Promise.resolve([1, [this]]); }),
    destroy: jest.fn().mockResolvedValue(1)
  }
}));

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
      Organization.findAll.mockResolvedValue(mockOrganizations);
      
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
      Organization.findByPk.mockResolvedValue(mockOrganization);

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
      Organization.findByPk.mockResolvedValue(null);

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
      
      Organization.create.mockResolvedValue(mockCreatedOrganization);

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
        status: true,
        update: jest.fn().mockResolvedValue(true)
      };
      
      Organization.findByPk.mockResolvedValue(mockUpdatedOrganization);

      // Act
      const response = await request(app)
        .patch('/api/v1/organizations/1')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      // Exclude function properties when comparing
      const { update, ...orgWithoutFunctions } = mockUpdatedOrganization;
      expect(response.body.data.organization).toEqual(orgWithoutFunctions);
    });

    it('should return 404 if organization not found', async () => {
      // Arrange
      Organization.findByPk.mockResolvedValue(null);

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
      const mockOrganization = { 
        id: 1, 
        destroy: jest.fn().mockResolvedValue(true)
      };
      
      Organization.findByPk.mockResolvedValue(mockOrganization);

      // Act
      const response = await request(app)
        .delete('/api/v1/organizations/1');

      // Assert
      expect(response.status).toBe(204);
    });

    it('should return 404 if organization not found', async () => {
      // Arrange
      Organization.findByPk.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .delete('/api/v1/organizations/999');

      // Assert
      expect(response.status).toBe(404);
    });
  });
}); 