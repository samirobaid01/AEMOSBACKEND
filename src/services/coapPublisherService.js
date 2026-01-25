/**
 * src/services/coapPublisherService.js
 *
 * - publish(options) sends a one-off CoAP request (confirmable by default)
 * - notifyObservers(deviceUuid, payload) notifies all registered observers for a device
 * - setObserverRegistry(registry) used by coapService to share registry
 */

const coap = require('coap');
const logger = require('../utils/logger');
const config = require('../config');

class CoAPPublisher {
  constructor() {
    this.isInitialized = false;
    this.observers = null; // Map reference set by coapService
  }

  initialize() {
    this.isInitialized = true;
    logger.info('CoAP publisher initialized');
  }

  setObserverRegistry(registry) {
    // registry: Map<string, Set<json-string>>
    this.observers = registry;
  }

  /**
   * Publish a one-off CoAP request to a device
   * options: { host, port, path, method='POST', payload, confirmable=true, extraOptions }
   */
  publish({ host, port = 5683, path = '/', method = 'POST', payload = {}, confirmable = true, extraOptions = {} }) {
    return new Promise((resolve, reject) => {
      try {
        const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

        const reqOpts = {
          hostname: host,
          port,
          pathname: path,
          method,
          confirmable,
          retrySend: true,
          // If you need to customize agent or options, pass via extraOptions
          ...extraOptions
        };

        const req = coap.request(reqOpts);

        // Response handling
        req.on('response', (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk.toString()));
          res.on('end', () => {
            logger.debug(`CoAP publish response ${res.code} from ${host}:${port}${path}`);
            resolve({ code: res.code, body });
          });
        });

        req.on('error', (err) => {
          logger.error('CoAP publish error:', err && err.message ? err.message : err);
          reject(err);
        });

        req.end(payloadStr);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Notify observers registered for a given deviceUuid
   * Walks the observer registry and sends a POST (or method you prefer).
   */
  async notifyObservers(deviceUuid, payload) {
    if (!this.observers) {
      logger.debug('No observer registry available to notify observers');
      return;
    }

    const observersSet = this.observers.get(deviceUuid);
    if (!observersSet || observersSet.size === 0) {
      logger.debug(`No observers for device ${deviceUuid}`);
      return;
    }

    const metricsManager = require('../utils/metricsManager');
    try {
      metricsManager.incrementCounter('notifications_sent_total', {
        protocol: 'coap'
      });
    } catch (err) {
      logger.warn('Failed to record CoAP notification metric', { error: err.message });
    }

    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const promises = Array.from(observersSet).map(async (obsJson) => {
      try {
        const obs = JSON.parse(obsJson);
        const host = obs.address;
        const port = obs.port;
        const path = obs.path || `/devices/${deviceUuid}/state`;

        // we send a POST notify to observer
        const res = await this.publish({ host, port, path, method: 'POST', payload: payloadStr });
        logger.info(`Notified observer ${host}:${port}${path} -> ${res.code}`);
        return res;
      } catch (err) {
        logger.error('Error notifying observer:', err);
        return null;
      }
    });

    await Promise.all(promises);
  }
}

module.exports = new CoAPPublisher();
