// tests/unit/notifications/notificationWorker.test.js
jest.mock('../../../src/notifications/factory/channelFactory');
jest.mock('../../../src/notifications/NotificationEventBus');

const channelFactory =
  require('../../../src/notifications/factory/channelFactory');
const eventBus =
  require('../../../src/notifications/NotificationEventBus');

const {
  notificationProcessor
} = require('../../../src/notifications/NotificationWorker');

describe('NotificationWorker', () => {
  it('processes a notification job', async () => {
    const sendMock = jest.fn();

    channelFactory.getChannels.mockReturnValue([
      { name: 'socket', send: sendMock }
    ]);

    const job = {
      data: { message: 'hello' }
    };

    const result = await notificationProcessor(job);

    expect(sendMock).toHaveBeenCalledWith(job.data);
    expect(eventBus.emit).toHaveBeenCalledWith(
      'notification.sent',
      job.data
    );
    expect(result).toBe(true);
  });
});
