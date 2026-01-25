const logger = require('../../utils/logger');
const redisConnection = require('../../config/redis');
const RuleChainNode = require('../../models/RuleChainNode');

const KEY_PREFIX = 'rulechain:sensor:';
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

const normalizeConfig = (configValue) => {
  if (!configValue) return null;
  if (typeof configValue === 'object') return configValue;
  try {
    return JSON.parse(configValue);
  } catch (error) {
    return null;
  }
};

const extractSensorUuidsFromConfig = (configValue) => {
  const config = normalizeConfig(configValue);
  if (!config) return [];

  const uuidCandidates = [];
  if (config.UUID) uuidCandidates.push(config.UUID);
  if (config.uuid) uuidCandidates.push(config.uuid);
  if (config.sensorUUID) uuidCandidates.push(config.sensorUUID);

  return uuidCandidates.filter(Boolean);
};

const buildIndexForSensor = async (sensorUUID) => {
  if (!sensorUUID) return [];

  const nodes = await RuleChainNode.findAll({
    where: { type: 'filter' },
    attributes: ['ruleChainId', 'config']
  });

  const ruleChainIds = new Set();
  nodes.forEach((node) => {
    const uuids = extractSensorUuidsFromConfig(node.config);
    if (uuids.includes(sensorUUID)) {
      ruleChainIds.add(node.ruleChainId);
    }
  });

  const ids = Array.from(ruleChainIds);
  const key = `${KEY_PREFIX}${sensorUUID}`;
  await redisConnection.set(key, JSON.stringify(ids), 'EX', DEFAULT_TTL_SECONDS);

  return ids;
};

const getRuleChainsForSensor = async (sensorUUID) => {
  if (!sensorUUID) return [];
  const key = `${KEY_PREFIX}${sensorUUID}`;

  try {
    const cached = await redisConnection.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn(`Failed to read rule chain index cache for ${sensorUUID}: ${error.message}`);
  }

  return buildIndexForSensor(sensorUUID);
};

const invalidateSensor = async (sensorUUID) => {
  if (!sensorUUID) return;
  const key = `${KEY_PREFIX}${sensorUUID}`;
  await redisConnection.del(key);
};

module.exports = {
  getRuleChainsForSensor,
  buildIndexForSensor,
  invalidateSensor,
  extractSensorUuidsFromConfig
};
