const logger = require('../../utils/logger');
const RuleChainNode = require('../../models/RuleChainNode');
const RuleChainIndex = require('./RuleChainIndex');

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

  await Promise.all(Array.from(sensorUUIDs).map((uuid) => RuleChainIndex.buildIndexForSensor(uuid)));
  logger.debug(`Rebuilt rule chain index for ruleChainId ${ruleChainId}`);
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

  await Promise.all(Array.from(sensorUUIDs).map((uuid) => RuleChainIndex.buildIndexForSensor(uuid)));
  logger.info(`Rebuilt rule chain indexes for ${sensorUUIDs.size} sensors`);
};

module.exports = {
  rebuildIndexForRuleChain,
  rebuildAllIndexes
};
