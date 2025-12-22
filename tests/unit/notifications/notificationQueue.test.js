jest.mock('bullmq');

const { __addMock } = require('bullmq');
const { publish } = require('../../../src/notifications/NotificationQueue');

describe('NotificationQueue', () => {
  it('should enqueue a notification job', async () => {
    const payload = {
      type: 'DEVICE_ALERT',
      channels: ['socket'],
      data: { deviceId: '123' }
    };

    await publish(payload);

    expect(__addMock).toHaveBeenCalledWith(
      'notify',
      payload,
      expect.objectContaining({
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 }
      })
    );
  });
});
