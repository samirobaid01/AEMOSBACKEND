const request = require('supertest');
const express = require('express');
const compression = require('compression');

describe('Response Compression', () => {
  it('should compress responses', async () => {
    // Create a new express app specifically for this test
    const testApp = express();
    
    // Apply compression middleware
    testApp.use(compression());
    
    // Create a route that returns a large response
    testApp.get('/large-response', (req, res) => {
      // Generate a large string (over 1KB to ensure compression kicks in)
      const largeData = { data: 'x'.repeat(2000) };
      res.json(largeData);
    });
    
    // Make request with Accept-Encoding: gzip header
    const response = await request(testApp)
      .get('/large-response')
      .set('Accept-Encoding', 'gzip');
    
    // Verify compression was applied
    expect(response.headers['content-encoding']).toBe('gzip');
  });
});

describe('Response Time Tracking', () => {
  it('should track response time', async () => {
    // Load the logger
    const logger = require('../../src/utils/logger');
    
    // Set up spy on logger
    const logSpy = jest.spyOn(logger, 'warn');
    
    // Create a new express app for testing
    const testApp = express();
    const responseTime = require('response-time');
    
    // Add response time middleware with a low threshold
    testApp.use(responseTime((req, res, time) => {
      if (time > 50) { // Low threshold for testing
        logger.warn(`Slow response: ${req.method} ${req.originalUrl} - ${time.toFixed(2)}ms`);
      }
    }));
    
    // Add a slow endpoint
    testApp.get('/slow', (req, res) => {
      // Sleep for 100ms (above our 50ms threshold)
      return new Promise(resolve => {
        setTimeout(() => {
          res.send('Slow response');
          resolve();
        }, 100);
      });
    });
    
    // Make the request to the slow endpoint
    await request(testApp).get('/slow');
    
    // Verify logger was called with warning about slow response
    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls[0][0]).toContain('Slow response');
    
    // Clean up
    logSpy.mockRestore();
  });
});