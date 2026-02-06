const logger = require('../../utils/logger');
const RuleChainNode = require('../../models/RuleChainNode');
const RuleChainIndex = require('./RuleChainIndex');

const BATCH_SIZE = 10;
const DEBOUNCE_MS = 500;
const pendingRebuilds = new Map();
const isDev = () => process.env.NODE_ENV === 'development';

const buildIndexForSensorsBatched = async (sensorUUIDs) => {
  const uuids = Array.from(sensorUUIDs);
  for (let i = 0; i < uuids.length; i += BATCH_SIZE) {
    const chunk = uuids.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map((uuid) => RuleChainIndex.buildIndexForSensor(uuid)));
  }
};

const rebuildIndexForRuleChain = async (ruleChainId) => {
  if (!ruleChainId) return;

  const nodes = await RuleChainNode.findAll({
    where: { ruleChainId, type: 'filter' },
    attributes: ['config']
  });

  const sensorUUIDs = new Set();
  nodes.forEach((node) => {
    const uuids = RuleChainIndex.extractSensorUuidsFromConfig(node.config);
    uuids.forEach((uuid) => sensorUUIDs.add(uuid));
  });

  if (isDev()) {
    logger.info('[IndexManager] Rebuilding index', {
      ruleChainId,
      sensorCount: sensorUUIDs.size,
      batchSize: BATCH_SIZE,
      batchCount: Math.ceil(sensorUUIDs.size / BATCH_SIZE) || 0
    });
  }

  await buildIndexForSensorsBatched(sensorUUIDs);
  logger.debug(`Rebuilt rule chain index for ruleChainId ${ruleChainId}`);
};

const scheduleRebuildForRuleChain = (ruleChainId) => {
  if (!ruleChainId) return;

  const existing = pendingRebuilds.get(ruleChainId);
  if (existing) {
    clearTimeout(existing.timeoutId);
  }

  if (isDev()) {
    logger.info('[IndexManager] Scheduled rebuild (debounced)', {
      ruleChainId,
      debounceMs: DEBOUNCE_MS,
      pendingRuleChains: pendingRebuilds.size
    });
  }

  const timeoutId = setTimeout(() => {
    pendingRebuilds.delete(ruleChainId);
    if (isDev()) {
      logger.info('[IndexManager] Running debounced rebuild', { ruleChainId });
    }
    rebuildIndexForRuleChain(ruleChainId).catch((err) => {
      logger.error(`Rebuild index failed for ruleChainId ${ruleChainId}`, {
        error: err.message,
        stack: err.stack
      });
    });
  }, DEBOUNCE_MS);

  pendingRebuilds.set(ruleChainId, { timeoutId });
};

const rebuildAllIndexes = async () => {
  const nodes = await RuleChainNode.findAll({
    where: { type: 'filter' },
    attributes: ['config']
  });

  const sensorUUIDs = new Set();
  nodes.forEach((node) => {
    const uuids = RuleChainIndex.extractSensorUuidsFromConfig(node.config);
    uuids.forEach((uuid) => sensorUUIDs.add(uuid));
  });

  if (isDev()) {
    logger.info('[IndexManager] Rebuilding all indexes', {
      sensorCount: sensorUUIDs.size,
      batchSize: BATCH_SIZE,
      batchCount: Math.ceil(sensorUUIDs.size / BATCH_SIZE) || 0
    });
  }

  await buildIndexForSensorsBatched(sensorUUIDs);
  logger.info(`Rebuilt rule chain indexes for ${sensorUUIDs.size} sensors`);
};

module.exports = {
  rebuildIndexForRuleChain,
  scheduleRebuildForRuleChain,
  rebuildAllIndexes
};
