const logger = require('../../src/utils/logger');
const sinon = require('sinon');

describe('Logger', () => {
  beforeEach(() => {
    // Spy on console methods
    sinon.spy(console, 'log');
    sinon.spy(console, 'error');
  });

  afterEach(() => {
    // Restore console methods
    console.log.restore();
    console.error.restore();
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    expect(console.log.calledOnce).toBe(true);
  });

  it('should log error messages', () => {
    logger.error('Test error message');
    expect(console.error.calledOnce).toBe(true);
  });

  it('should include metadata in logs', () => {
    const meta = { user: 'test-user', action: 'login' };
    logger.info('User action', meta);
    
    const logCall = console.log.getCall(0);
    const logArg = logCall.args[0];
    
    expect(logArg).toContain('test-user');
    expect(logArg).toContain('login');
  });
});