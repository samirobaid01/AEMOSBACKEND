const http = require('http');
const mqtt = require('mqtt');
const coap = require('coap');

const deviceUuid = '11111111-1111-1111-1111-111111111111';

const waitForEvent = (emitter, eventName, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${eventName}`)), timeoutMs);
    emitter.once(eventName, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

describe('Notification protocols (socket/mqtt/coap)', () => {
  let server;
  let port;
  let socketManager;
  let socketClient;
  let mqttClient;
  let mqttService;
  let mqttPublisher;
  let notificationManager;
  let coapPublisher;
  let coapServer;
  let coapPort;

  beforeAll(async () => {
    process.env.ENABLE_SOCKET_IO = 'true';
    process.env.ENABLE_MQTT = 'true';
    process.env.MQTT_HOST = '127.0.0.1';
    process.env.MQTT_PORT = '1885';
    process.env.MQTT_AUTH_ENABLED = 'true';

    jest.resetModules();

    const app = require('../../src/app');
    socketManager = require('../../src/utils/socketManager');
    mqttService = require('../../src/services/mqttService');
    mqttPublisher = require('../../src/services/mqttPublisherService');
    notificationManager = require('../../src/utils/notificationManager');
    coapPublisher = require('../../src/services/coapPublisherService');

    server = http.createServer(app);
    socketManager.initialize(server);
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });

    mqttService.initialize(1885, '127.0.0.1');
    await mqttPublisher.initialize();

    coapServer = coap.createServer((req, res) => {
      req.on('data', () => {});
      req.on('end', () => {
        res.end('ok');
      });
    });

    await new Promise((resolve) => {
      coapServer.listen(0, () => {
        coapPort = coapServer._sock.address().port;
        resolve();
      });
    });

    const observers = new Map();
    observers.set(
      deviceUuid,
      new Set([
        JSON.stringify({
          address: '127.0.0.1',
          port: coapPort,
          path: `/devices/${deviceUuid}/state`
        })
      ])
    );
    coapPublisher.setObserverRegistry(observers);
    coapPublisher.initialize();
  });

  afterAll(() => {
    if (socketClient) socketClient.close();
    if (mqttClient) mqttClient.end(true);
    if (mqttPublisher) mqttPublisher.shutdown();
    if (mqttService) mqttService.stop();
    if (coapServer) coapServer.close();
    if (server) server.close();
  });

  it('delivers device state change notifications on socket, mqtt, and coap', async () => {
    const { io } = require('socket.io-client');

    socketClient = io(`http://127.0.0.1:${port}`, {
      transports: ['websocket']
    });

    await waitForEvent(socketClient, 'connect');

    const socketEventPromise = waitForEvent(socketClient, 'device-state-change');

    mqttClient = mqtt.connect('mqtt://127.0.0.1:1885', {
      username: 'publisher',
      password: 'publisher-secret',
      clientId: 'notification-test-subscriber'
    });

    await new Promise((resolve, reject) => {
      mqttClient.once('connect', resolve);
      mqttClient.once('error', reject);
    });

    await new Promise((resolve, reject) => {
      mqttClient.subscribe(`devices/${deviceUuid}/state`, { qos: 1 }, (err) => {
        if (err) reject(err);
        resolve();
      });
    });

    const mqttMessagePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for MQTT message')), 5000);
      mqttClient.on('message', (topic, message) => {
        if (topic === `devices/${deviceUuid}/state`) {
          clearTimeout(timeout);
          resolve(JSON.parse(message.toString()));
        }
      });
    });

    const coapMessagePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for CoAP notification')), 5000);
      coapServer.removeAllListeners('request');
      coapServer.on('request', (req, res) => {
        let body = '';
        req.on('data', chunk => (body += chunk.toString()));
        req.on('end', () => {
          clearTimeout(timeout);
          res.end('ok');
          resolve(JSON.parse(body));
        });
      });
    });

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

    const [socketPayload, mqttPayload, coapPayload] = await Promise.all([
      socketEventPromise,
      mqttMessagePromise,
      coapMessagePromise
    ]);

    expect(socketPayload.deviceUuid).toBe(deviceUuid);
    expect(socketPayload.metadata.stateName).toBe('Pump Power');
    expect(String(socketPayload.metadata.newValue)).toBe('off');

    expect(mqttPayload.deviceUuid).toBe(deviceUuid);
    expect(mqttPayload.stateName).toBe('Pump Power');
    expect(String(mqttPayload.newValue)).toBe('off');

    expect(coapPayload.deviceUuid).toBe(deviceUuid);
  });
});
