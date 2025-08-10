/**
 * src/services/coapService.js
 *
 * CoAP server service:
 *  - Listens for POST/PUT/GET requests
 *  - Supports Observe (register/unregister observers)
 *  - Normalizes message via coapAdapter and routes via messageRouter
 */

const coap = require('coap'); // npm i coap
const url = require('url');
const config = require('../config'); // adjust path if your config exports features
const logger = require('../utils/logger');
const coapAdapter = require('../adapters/coapAdapter');
const messageRouter = require('./messageRouter');
const coapPublisher = require('./coapPublisherService');

class CoAPService {
  constructor() {
    this.server = null;
    // observers: Map<key, Set<observerJsonString>> where key usually deviceUuid or path
    this.observers = new Map();
  }

  initialize(host = config.features.coap.host || '0.0.0.0', port = config.features.coap.port || 5683) {
    if (this.server) {
      logger.warn('CoAP server already initialized');
      return;
    }

    this.server = coap.createServer((req, res) => {
      // ensure errors don't crash
      this._handleRequest(req, res).catch(err => {
        logger.error('Error handling CoAP request:', err);
        if (!res.finished) {
          try { res.code = '5.00'; res.end('Internal Server Error'); } catch (_) {}
        }
      });
    });

    this.server.on('error', (err) => {
      logger.error('CoAP server error:', err);
    });

    this.server.listen(port, host, () => {
      logger.info(`CoAP server started on ${host}:${port}`);
    });

    // give publisher access to the registry
    coapPublisher.setObserverRegistry(this.observers);
    coapPublisher.initialize();
  }

  async _handleRequest(req, res) {
    const parsedUrl = url.parse(req.url || '');
    const method = (req.method || '').toUpperCase(); // 'POST' 'PUT' 'GET' etc
    const pathname = parsedUrl.pathname || '/';
    const query = parsedUrl.query || '';
    const rsinfo = req.rsinfo || {}; // { address, port }

    logger.debug(`CoAP ${method} ${pathname} from ${rsinfo.address}:${rsinfo.port}`);

    // Check for Observe option (subscribe)
    // node-coap indicates Observe by presence of 'Observe' option in req.headers or req.options maybe
    const observeOption = req.headers && (req.headers.Observe !== undefined || req.headers.observe !== undefined);

    // Handle Observe GET subscriptions
    if (observeOption && method === 'GET') {
      try {
        const token = req._packet && req._packet.token ? req._packet.token.toString('hex') : undefined;
        const observer = {
          address: rsinfo.address,
          port: rsinfo.port,
          path: pathname,
          token
        };

        // prefer deviceUuid if extractable, else fallback to path
        const deviceUuid = coapAdapter.extractDeviceUuid(pathname, { query });
        const key = deviceUuid || pathname;

        if (!this.observers.has(key)) this.observers.set(key, new Set());
        this.observers.get(key).add(JSON.stringify(observer));

        logger.info(`Registered CoAP observer for ${key} from ${observer.address}:${observer.port}`);
        res.code = '2.05'; // Content
        res.end(JSON.stringify({ success: true, observing: true }));
        return;
      } catch (err) {
        logger.error('Failed to register observer:', err);
        res.code = '5.00';
        res.end('Observer registration failed');
        return;
      }
    }

    // Handle POST/PUT (telemetry/state)
    if (method === 'POST' || method === 'PUT') {
      try {
        const raw = req.payload ? req.payload.toString() : '';
        const normalized = coapAdapter.normalizeMessage(pathname, Buffer.from(raw), {
          protocol: 'coap',
          rsinfo,
          method,
          query
        });

        if (!coapAdapter.validateMessage(normalized)) {
          logger.warn('Invalid CoAP message format', { pathname, raw });
          res.code = '4.00';
          res.end('Invalid payload');
          return;
        }

        // Route into application logic (messageRouter should accept normalized messages)
        const result = await messageRouter.route(normalized); // adapt if your router API differs

        // Optionally route may trigger publisher notifications itself.
        res.code = '2.04'; // Changed
        res.end(JSON.stringify({ ok: true, result }));

        return;
      } catch (err) {
        logger.error('Error processing CoAP publish:', err);
        res.code = '5.00';
        res.end('Server error');
        return;
      }
    }

    // Non-observe GET or other methods
    if (method === 'GET') {
      res.code = '2.05';
      res.end(JSON.stringify({ message: 'CoAP endpoint' }));
      return;
    }

    // Default method not allowed
    res.code = '4.05';
    res.end('Method Not Allowed');
  }

  stop() {
    if (!this.server) {
      logger.warn('CoAP server not running');
      return;
    }
    try {
      this.server.close(() => logger.info('CoAP server stopped'));
    } catch (err) {
      logger.error('Error closing CoAP server:', err);
    }
    this.server = null;
    this.observers.clear();
  }
}

module.exports = new CoAPService();
