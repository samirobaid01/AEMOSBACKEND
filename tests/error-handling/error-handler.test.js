const request = require('supertest');
const app = require('../../src/app');
const { ApiError } = require('../../src/middlewares/errorHandler');

// Add a test route that generates errors
app.get('/api/v1/test-error/:code', (req, res, next) => {
  const code = parseInt(req.params.code);
  next(new ApiError(code, 'Test error'));
});

describe('Error Handler Middleware', () => {
  it('should return 404 for nonexistent routes', async () => {
    const response = await request(app).get('/api/v1/nonexistent-route');
    expect(response.status).toBe(404);
    expect(response.body.status).toBe('error');
  });

  it('should format error responses consistently', async () => {
    const response = await request(app).get('/api/v1/test-error/404');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('message');
  });

  it('should hide stack traces in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const response = await request(app).get('/api/v1/test-error/500');
    expect(response.body).not.toHaveProperty('stack');
    
    process.env.NODE_ENV = originalEnv;
  });
});