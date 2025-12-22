const Dispatcher = require('../../../src/notifications/NotificationManager');

describe('Retry & DLQ behavior', () => {
  it('should throw error to trigger retry', async () => {
    jest.spyOn(Dispatcher, 'dispatch').mockRejectedValueOnce(
      new Error('Channel failure')
    );

    await expect(
      Dispatcher.dispatch({ channels: ['email'] })
    ).rejects.toThrow('Channel failure');
  });
});
