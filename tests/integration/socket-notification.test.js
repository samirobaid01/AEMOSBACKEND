const http = require('http');
const { io } = require('socket.io-client');

const deviceUuid = '11111111-1111-1111-1111-111111111111';

const waitForEvent = (emitter, eventName, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${eventName}`)), timeoutMs);
    emitter.once(eventName, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

describe('Socket notification delivery', () => {
  let server;
  let port;
  let socketClient;
  let socketManager;
  let notificationManager;

  beforeAll(async () => {
    process.env.ENABLE_SOCKET_IO = 'true';

    jest.resetModules();
    jest.unmock('../../src/utils/notificationManager');

    jest.mock('../../src/services/mqttPublisherService', () => ({
      publishDeviceStateChange: jest.fn().mockResolvedValue(true)
    }));

    jest.mock('../../src/services/coapPublisherService', () => ({
      notifyObservers: jest.fn().mockResolvedValue(true)
    }));

    jest.mock('../../src/config', () => ({
      broadcastAll: true,
      features: {
        notifications: {
          broadcastAll: true,
          bufferSize: 1000,
          broadcastInterval: 1000
        }
      }
    }));

    socketManager = require('../../src/utils/socketManager');
    notificationManager = require('../../src/utils/notificationManager');

    server = http.createServer((req, res) => {
      res.statusCode = 200;
      res.end('ok');
    });
    socketManager.initialize(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterAll(() => {
    if (notificationManager && notificationManager.shutdown) {
      notificationManager.shutdown();
    }
    if (socketClient) socketClient.close();
    if (server) server.close();
  });

  it('emits device-state-change events to socket clients', async () => {
    socketClient = io(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
    await waitForEvent(socketClient, 'connect');

    const socketEventPromise = waitForEvent(socketClient, 'device-state-change');

    notificationManager.queueStateChangeNotification(
      {
        deviceId: 1,
        deviceUuid,
        deviceName: 'Test Pump',
        deviceType: 'actuator',
        isCritical: true,
        stateName: 'Pump Power',
        oldValue: 'on',
        newValue: 'off',
        initiatedBy: 'test'
      },
      'high',
      true
    );

    const payload = await socketEventPromise;
    expect(payload.deviceUuid).toBe(deviceUuid);
    expect(payload.metadata.stateName).toBe('Pump Power');
    expect(String(payload.metadata.newValue)).toBe('off');
  });
});
