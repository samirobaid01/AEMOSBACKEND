// tests/security/helmet.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Security Headers (Helmet)', () => {
  it('should set X-XSS-Protection header', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.headers['x-xss-protection']).toBeDefined();
  });

  it('should set X-Frame-Options header', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});

describe('Rate Limiting', () => {
  it('should allow requests under the rate limit', async () => {
    // Make requests under the limit
    for (let i = 0; i < 5; i++) {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).not.toBe(429);
    }
  });

  it('should block requests over the rate limit', async () => {
    // Mock time to bypass actual waiting
    jest.useFakeTimers();
    
    // Make requests over the limit
    const promises = Array(101).fill().map(() => 
      request(app).get('/api/v1/health')
    );
    
    const responses = await Promise.all(promises);
    const tooManyRequests = responses.filter(r => r.status === 429);
    expect(tooManyRequests.length).toBeGreaterThan(0);
    
    jest.useRealTimers();
  });
});