const request = require('supertest');

// Mock organization controller
jest.mock('../../src/controllers/organizationController', () => ({
  getAllOrganizations: (req, res) => {
    const organizations = [
      { id: 1, name: 'Organization 1', detail: 'Test organization 1', status: true },
      { id: 2, name: 'Organization 2', detail: 'Test organization 2', status: true }
    ];
    res.status(200).json({
      status: 'success',
      results: organizations.length,
      data: { organizations }
    });
  },
  getOrganizationById: (req, res, next) => {
    const { id } = req.params;
    if (id === '999') {
      return res.status(404).json({
        status: 'error',
        message: `Organization with ID ${id} not found`
      });
    }
    const organization = {
      id: Number(id),
      name: `Organization ${id}`,
      detail: 'Test organization',
      status: true
    };
    res.status(200).json({
      status: 'success',
      data: { organization }
    });
  },
  createOrganization: (req, res) => {
    const organization = {
      id: 1,
      ...req.body
    };
    res.status(201).json({
      status: 'success',
      data: { organization }
    });
  },
  updateOrganization: (req, res, next) => {
    const { id } = req.params;
    if (id === '999') {
      return res.status(404).json({
        status: 'error',
        message: `Organization with ID ${id} not found`
      });
    }
    const organization = {
      id: Number(id),
      ...req.body,
      status: true
    };
    res.status(200).json({
      status: 'success',
      data: { organization }
    });
  },
  deleteOrganization: (req, res, next) => {
    const { id } = req.params;
    if (id === '999') {
      return res.status(404).json({
        status: 'error',
        message: `Organization with ID ${id} not found`
      });
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  }
}));

// Mock middleware
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

describe('Organization API Endpoints', () => {
  describe('GET /organizations', () => {
    it('should return all organizations', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/organizations');
        
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data.organizations)).toBe(true);
    });
  });

  describe('GET /organizations/:id', () => {
    it('should return an organization by id', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/organizations/1');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toBeDefined();
    });

    it('should return 404 if organization not found', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/organizations/999');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /organizations', () => {
    it('should create a new organization', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/organizations')
        .send({
          name: 'New Organization',
          detail: 'Test organization',
          status: true
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toBeDefined();
    });
  });

  describe('PATCH /organizations/:id', () => {
    it('should update an organization', async () => {
      // Act
      const response = await request(app)
        .patch('/api/v1/organizations/1')
        .send({
          name: 'Updated Organization',
          detail: 'Updated details',
          organizationId: 1
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organization).toBeDefined();
    });

    it('should return 404 if organization not found', async () => {
      // Act
      const response = await request(app)
        .patch('/api/v1/organizations/999')
        .send({
          name: 'Updated Organization',
          organizationId: 1
        });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /organizations/:id', () => {
    it('should delete an organization', async () => {
      // Act
      const response = await request(app)
        .delete('/api/v1/organizations/1')
        .query({ organizationId: 1 });

      // Assert
      expect(response.status).toBe(204);
    });

    it('should return 404 if organization not found', async () => {
      // Act
      const response = await request(app)
        .delete('/api/v1/organizations/999')
        .query({ organizationId: 1 });

      // Assert
      expect(response.status).toBe(404);
    });
  });
}); 