// tests/health/health-checks.test.js
const request = require('supertest');
const app = require('../../src/app');
const sequelize = require('../../src/config/database');

describe('Health Check Endpoints', () => {
  it('should return appropriate response for basic health check', async () => {
    const response = await request(app).get('/api/v1/health');
    console.log("Health check response status:", response.status);
    console.log("Health check response body:", response.body);
    
    // Allow either 200 or 500 based on database connection status
    expect([200, 500]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.body.status).toBe('ok');
      expect(response.body.services.database.status).toBe('ok');
    } else {
      expect(response.body.status).toBe('error');
      expect(response.body.services.database.status).toBe('error');
      expect(response.body.services.database.message).toBeDefined();
    }
  });

  it('should include database status in health check', async () => {
    // Mock the database connection
    const authenticateSpy = jest.spyOn(sequelize, 'authenticate');
    authenticateSpy.mockResolvedValue();
    
    const response = await request(app).get('/api/v1/health');
    expect(response.body.services.database.status).toBe('ok');
    
    authenticateSpy.mockRestore();
  });

  it('should report error when database is down', async () => {
    // Mock a failed database connection
    const authenticateSpy = jest.spyOn(sequelize, 'authenticate');
    authenticateSpy.mockRejectedValue(new Error('Connection failed'));
    
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(500);
    expect(response.body.services.database.status).toBe('error');
    
    authenticateSpy.mockRestore();
  });
});