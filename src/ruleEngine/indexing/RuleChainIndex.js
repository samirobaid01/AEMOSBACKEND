const logger = require('../../utils/logger');
const redisConnection = require('../../config/redis');
const { QueryTypes } = require('sequelize');
const sequelize = require('../../config/database');

const KEY_PREFIX_SENSOR = 'rulechain:var:sensor:';
const KEY_PREFIX_DEVICE = 'rulechain:var:device:';
const DEFAULT_TTL_SECONDS = 3600;

const buildIndexForOriginator = async (originatorType, originatorId) => {
  if (!originatorId || !originatorType) {
    logger.warn('buildIndexForOriginator called with invalid parameters', {
      originatorType,
      originatorId
    });
    return new Map();
  }

  const validTypes = ['sensor', 'device'];
  if (!validTypes.includes(originatorType)) {
    logger.error('Invalid originator type', { originatorType, validTypes });
    return new Map();
  }

  const startTime = Date.now();
  
  const typeFieldPath = originatorType === 'sensor' ? '$.sensorUUID' : '$.deviceUUID';

  const query = `
    SELECT DISTINCT 
      ruleChainId,
      JSON_EXTRACT(config, '$.key') as variableName,
      JSON_EXTRACT(config, '$.sourceType') as sourceType
    FROM RuleChainNode
    WHERE type = 'filter'
      AND JSON_EXTRACT(config, '$.sourceType') = :originatorType
      AND (
        JSON_EXTRACT(config, '$.UUID') = :uuid OR
        JSON_EXTRACT(config, '$.uuid') = :uuid OR
        JSON_EXTRACT(config, '${typeFieldPath}') = :uuid
      )
  `;

  try {
    const nodes = await sequelize.query(query, {
      replacements: {
        uuid: originatorId,
        originatorType
      },
      type: QueryTypes.SELECT
    });

    const variableIndex = new Map();
    nodes.forEach(node => {
      const varName = node.variableName?.replace(/"/g, '');
      if (varName) {
        if (!variableIndex.has(varName)) {
          variableIndex.set(varName, new Set());
        }
        variableIndex.get(varName).add(node.ruleChainId);
      }
    });

    const keyPrefix = originatorType === 'sensor'
      ? KEY_PREFIX_SENSOR
      : KEY_PREFIX_DEVICE;

    const pipeline = redisConnection.pipeline();
    for (const [varName, ruleChainIds] of variableIndex) {
      const key = `${keyPrefix}${originatorId}:${varName}`;
      pipeline.set(
        key,
        JSON.stringify(Array.from(ruleChainIds)),
        'EX',
        DEFAULT_TTL_SECONDS
      );
    }
    await pipeline.exec();

    const duration = Date.now() - startTime;
    const totalRuleChains = new Set([...variableIndex.values()].flatMap(s => [...s])).size;

    logger.debug(`Built ${originatorType} variable-level index`, {
      originatorId,
      variables: Array.from(variableIndex.keys()),
      totalRuleChains,
      duration: `${duration}ms`
    });

    return variableIndex;
  } catch (error) {
    logger.error(`Failed to build index for ${originatorType}:${originatorId}`, {
      error: error.message,
      stack: error.stack
    });
    return new Map();
  }
};

const getRuleChainsForOriginator = async (originatorType, originatorId, variableNames = []) => {
  if (!originatorId || !originatorType) {
    logger.warn('getRuleChainsForOriginator called with invalid parameters', {
      originatorType,
      originatorId
    });
    return [];
  }

  if (variableNames.length === 0) {
    logger.warn('getRuleChainsForOriginator called without variables', {
      originatorType,
      originatorId
    });
    return [];
  }

  const validTypes = ['sensor', 'device'];
  if (!validTypes.includes(originatorType)) {
    logger.error('Invalid originator type', { originatorType, validTypes });
    return [];
  }

  const startTime = Date.now();
  const keyPrefix = originatorType === 'sensor'
    ? KEY_PREFIX_SENSOR
    : KEY_PREFIX_DEVICE;

  const ruleChainIds = new Set();
  let needsRebuild = false;
  let cacheHits = 0;
  let cacheMisses = 0;

  for (const varName of variableNames) {
    const key = `${keyPrefix}${originatorId}:${varName}`;

    try {
      const cached = await redisConnection.get(key);
      if (cached) {
        const ids = JSON.parse(cached);
        ids.forEach(id => ruleChainIds.add(id));
        cacheHits++;
      } else {
        needsRebuild = true;
        cacheMisses++;
      }
    } catch (error) {
      logger.warn(`Failed to read index for ${originatorType}:${originatorId}:${varName}`, {
        error: error.message
      });
      needsRebuild = true;
      cacheMisses++;
    }
  }

  if (needsRebuild) {
    logger.info(`Cache miss for ${originatorType}:${originatorId}, rebuilding index`, {
      requestedVariables: variableNames,
      cacheHits,
      cacheMisses
    });

    const variableIndex = await buildIndexForOriginator(originatorType, originatorId);

    for (const varName of variableNames) {
      if (variableIndex.has(varName)) {
        variableIndex.get(varName).forEach(id => ruleChainIds.add(id));
      }
    }
  }

  const duration = Date.now() - startTime;
  const result = Array.from(ruleChainIds);

  logger.debug(`Retrieved rule chains for ${originatorType}:${originatorId}`, {
    variables: variableNames,
    ruleChainCount: result.length,
    cacheHits,
    cacheMisses,
    duration: `${duration}ms`
  });

  return result;
};

const invalidateOriginator = async (originatorType, originatorId) => {
  if (!originatorId || !originatorType) {
    logger.warn('invalidateOriginator called with invalid parameters', {
      originatorType,
      originatorId
    });
    return;
  }

  const validTypes = ['sensor', 'device'];
  if (!validTypes.includes(originatorType)) {
    logger.error('Invalid originator type', { originatorType, validTypes });
    return;
  }

  const keyPrefix = originatorType === 'sensor'
    ? KEY_PREFIX_SENSOR
    : KEY_PREFIX_DEVICE;

  try {
    const pattern = `${keyPrefix}${originatorId}:*`;
    const keys = await redisConnection.keys(pattern);

    if (keys.length > 0) {
      await redisConnection.del(...keys);
      logger.debug(`Invalidated ${keys.length} variable indexes`, {
        originatorType,
        originatorId,
        keys
      });
    } else {
      logger.debug(`No indexes to invalidate for ${originatorType}:${originatorId}`);
    }
  } catch (error) {
    logger.error(`Failed to invalidate ${originatorType}:${originatorId}`, {
      error: error.message
    });
  }
};

const getRuleChainsForSensor = async (sensorId, variableNames = []) => {
  return getRuleChainsForOriginator('sensor', sensorId, variableNames);
};

const getRuleChainsForDevice = async (deviceId, variableNames = []) => {
  return getRuleChainsForOriginator('device', deviceId, variableNames);
};

const buildIndexForSensor = async (sensorId) => {
  return buildIndexForOriginator('sensor', sensorId);
};

const buildIndexForDevice = async (deviceId) => {
  return buildIndexForOriginator('device', deviceId);
};

const invalidateSensor = async (sensorId) => {
  return invalidateOriginator('sensor', sensorId);
};

const invalidateDevice = async (deviceId) => {
  return invalidateOriginator('device', deviceId);
};

module.exports = {
  getRuleChainsForOriginator,
  buildIndexForOriginator,
  invalidateOriginator,
  getRuleChainsForSensor,
  getRuleChainsForDevice,
  buildIndexForSensor,
  buildIndexForDevice,
  invalidateSensor,
  invalidateDevice
};
