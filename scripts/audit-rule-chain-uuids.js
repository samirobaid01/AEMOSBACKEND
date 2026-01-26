const { RuleChainNode } = require('../src/models/initModels');
const { validateRuleChainConfig } = require('../src/utils/uuidValidator');
const sequelize = require('../src/config/database');

const auditRuleChainConfigs = async () => {
  console.log('Auditing rule chain node configurations for invalid UUIDs...\n');
  
  try {
    const nodes = await RuleChainNode.findAll({
      attributes: ['id', 'ruleChainId', 'type', 'name', 'config'],
      order: [['ruleChainId', 'ASC'], ['id', 'ASC']]
    });
    
    console.log(`Found ${nodes.length} rule chain nodes to audit\n`);
    
    const invalidNodes = [];
    let processedCount = 0;
    
    for (const node of nodes) {
      processedCount++;
      
      if (!node.config) {
        continue;
      }
      
      let config;
      try {
        config = typeof node.config === 'string' ? JSON.parse(node.config) : node.config;
      } catch (err) {
        invalidNodes.push({
          nodeId: node.id,
          ruleChainId: node.ruleChainId,
          name: node.name,
          type: node.type,
          errors: [{
            path: 'config',
            value: node.config,
            error: `Invalid JSON: ${err.message}`
          }]
        });
        continue;
      }
      
      const validation = validateRuleChainConfig(config, node.type);
      if (!validation.valid) {
        invalidNodes.push({
          nodeId: node.id,
          ruleChainId: node.ruleChainId,
          name: node.name,
          type: node.type,
          errors: validation.errors
        });
      }
      
      if (processedCount % 100 === 0) {
        console.log(`Processed ${processedCount}/${nodes.length} nodes...`);
      }
    }
    
    console.log(`\n✅ Audit complete! Processed ${processedCount} nodes\n`);
    
    if (invalidNodes.length === 0) {
      console.log('✅ All rule chain nodes have valid UUIDs!');
      process.exit(0);
    } else {
      console.log(`❌ Found ${invalidNodes.length} nodes with invalid UUIDs:\n`);
      
      invalidNodes.forEach((node, idx) => {
        console.log(`${idx + 1}. Node ID ${node.nodeId} (Rule Chain: ${node.ruleChainId}, Name: "${node.name}", Type: ${node.type})`);
        node.errors.forEach(err => {
          console.log(`   - ${err.path}: ${err.error}`);
          console.log(`     Current value: "${err.value}"`);
        });
        console.log('');
      });
      
      console.log(`\nTotal: ${invalidNodes.length} node(s) with invalid UUIDs`);
      console.log('\nRecommendation: Fix these UUIDs before deploying UUID validation.');
      
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during audit:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

if (require.main === module) {
  auditRuleChainConfigs().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { auditRuleChainConfigs };
