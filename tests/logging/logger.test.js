const logger = require('../../src/utils/logger');
const sinon = require('sinon');
const loggerSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});

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
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});

    logger.info('Test info message');

    expect(spy).toHaveBeenCalled(); // optionally: .toHaveBeenCalledWith(expect.stringContaining('Test info message'))
    spy.mockRestore();
  });

  it('should log error messages', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});

    logger.error('Test error message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should include metadata in logs', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    const meta = { user: 'test-user', action: 'login' };

    logger.info('User action', meta);

    expect(spy).toHaveBeenCalled();

    // Inspect what was logged
    const loggedOutput = spy.mock.calls[0][0]; // first call, first argument

    expect(loggedOutput).toContain('User action');
    expect(loggedOutput).toContain('test-user');
    expect(loggedOutput).toContain('login');

    spy.mockRestore();
  });
});
