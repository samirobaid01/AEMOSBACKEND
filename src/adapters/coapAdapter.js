/**
 * src/adapters/coapAdapter.js
 *
 * Functions:
 *  - normalizeMessage(path, payloadBuffer, meta)
 *  - validateMessage(normalized)
 *  - extractDeviceUuid(path, meta)
 *  - extractOrganizationId(path, meta)
 *
 * Keep consistent with mqttAdapter expectations.
 */

const logger = require('../utils/logger');

const DEVICE_PATH_REGEX = /^\/devices\/([^/]+)\/?(.*)$/; // e.g. /devices/{uuid}/telemetry
const ORG_DEVICE_REGEX = /^\/orgs\/([^/]+)\/devices\/([^/]+)\/?(.*)$/; // /orgs/{org}/devices/{uuid}/...

function normalizeMessage(path, payloadBuffer, meta = {}) {
  try {
    const raw = payloadBuffer ? payloadBuffer.toString() : '';
    let body = null;

    try { body = JSON.parse(raw); } catch (e) { body = raw; }

    const orgMatch = (path || '').match(ORG_DEVICE_REGEX);
    const devMatch = (path || '').match(DEVICE_PATH_REGEX);

    const organizationId = orgMatch ? orgMatch[1] : extractOrganizationId(path, meta);
    const deviceUuid = orgMatch ? orgMatch[2] : (devMatch ? devMatch[1] : null);
    const subtopic = orgMatch ? orgMatch[3] : (devMatch ? devMatch[2] : null);

    const normalized = {
      protocol: meta.protocol || 'coap',
      path,
      subtopic,
      deviceUuid,
      organizationId,
      payload: body,
      raw,
      rsinfo: meta.rsinfo,
      method: meta.method,
      receivedAt: new Date().toISOString()
    };

    logger.debug(`CoAP message normalized: ${path}`);
    return normalized;
  } catch (err) {
    logger.error(`Error normalizing CoAP message: ${err.message}`);
    throw err;
  }
}

function validateMessage(msg) {
  if (!msg) return false;
  // payload must exist (allow string or object)
  if (msg.payload === null || msg.payload === undefined) return false;
  // deviceUuid preferred, but allow messages that will be routed by path
  // return !!msg.deviceUuid;
  return true;
}

function extractDeviceUuid(path, meta = {}) {
  if (!path) {
    if (meta && meta.query) {
      try {
        const params = new URLSearchParams(meta.query);
        return params.get('device') || params.get('deviceUuid') || null;
      } catch (e) {}
    }
    return null;
  }
  const orgMatch = path.match(ORG_DEVICE_REGEX);
  if (orgMatch) return orgMatch[2];
  const devMatch = path.match(DEVICE_PATH_REGEX);
  if (devMatch) return devMatch[1];

  if (meta && meta.query) {
    try {
      const params = new URLSearchParams(meta.query);
      return params.get('device') || params.get('deviceUuid') || null;
    } catch (e) {}
  }

  return null;
}

function extractOrganizationId(path, meta = {}) {
  if (!path) {
    if (meta && meta.query) {
      try {
        const params = new URLSearchParams(meta.query);
        return params.get('org') || params.get('organizationId') || null;
      } catch (e) {}
    }
    return null;
  }
  const orgMatch = path.match(ORG_DEVICE_REGEX);
  if (orgMatch) return orgMatch[1];

  // path like /orgs/{org}/...
  const parts = path.split('/').filter(Boolean);
  const idx = parts.indexOf('orgs');
  if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1];

  if (meta && meta.query) {
    try {
      const params = new URLSearchParams(meta.query);
      return params.get('org') || params.get('organizationId') || null;
    } catch (e) {}
  }

  return null;
}

module.exports = {
  normalizeMessage,
  validateMessage,
  extractDeviceUuid,
  extractOrganizationId
};
