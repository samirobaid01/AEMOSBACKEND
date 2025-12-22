jest.mock('../../../src/models/notification', () => ({
    Notification: {
      create: jest.fn()
    }
  }));
  
  jest.mock('../../../src/notifications/channels/socketChannel', () => ({
    send: jest.fn()
  }));
  
  jest.mock('../../../src/notifications/channels/emailChannel', () => ({
    send: jest.fn()
  }));
  
  jest.mock('../../../src/notifications/channels/smsChannel', () => ({
    send: jest.fn()
  }));
  
  const NotificationManager =
    require('../../../src/notifications/NotificationManager');
  
  const socketChannel =
    require('../../../src/notifications/channels/socketChannel');
  const emailChannel =
    require('../../../src/notifications/channels/emailChannel');
  
  describe('Notification dispatching', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('routes to socket channel only', async () => {
      await NotificationManager.dispatch({
        channels: ['socket'],
        data: { msg: 'hello' }
      });
  
      expect(socketChannel.send).toHaveBeenCalledWith({ msg: 'hello' });
      expect(emailChannel.send).not.toHaveBeenCalled();
    });
  
    it('routes to multiple channels', async () => {
      await NotificationManager.dispatch({
        channels: ['socket', 'email'],
        data: { msg: 'hello' }
      });
  
      expect(socketChannel.send).toHaveBeenCalled();
      expect(emailChannel.send).toHaveBeenCalled();
    });
  });
  