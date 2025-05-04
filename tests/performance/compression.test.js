const request = require('supertest');
const app = require('../../src/app');

describe('Response Compression', () => {
  it('should compress responses', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('Accept-Encoding', 'gzip');
    
    expect(response.headers['content-encoding']).toBe('gzip');
  });
});

describe('Response Time Tracking', () => {
  it('should track response time', async () => {
    // This is more of an integration test
    // We need to spy on the logger
    const logSpy = jest.spyOn(require('../../src/utils/logger'), 'warn');
    
    // Create a slow endpoint for testing
    app.get('/api/v1/slow', (req, res) => {
      setTimeout(() => res.send('Slow response'), 1100);
    });
    
    await request(app).get('/api/v1/slow');
    
    // Check if warning was logged for slow response
    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls[0][0]).toContain('Slow response');
    
    logSpy.mockRestore();
  });
});