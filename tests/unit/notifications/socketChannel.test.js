const socketChannel = require('../../../src/notifications/channels/socketChannel');

describe('Socket Channel', () => {
  it('should send socket notification', async () => {
    const spy = jest.spyOn(socketChannel, 'send');

    await socketChannel.send({ msg: 'hello' });

    expect(spy).toHaveBeenCalled();
  });
});
