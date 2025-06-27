/**
 * Test script for the new Rule Engine implementation
 * Run this to verify the event-driven rule engine is working
 */

const sequelize = require('./src/config/database');
const { initModels } = require('./src/models/initModels');
const { ruleEngine } = require('./src/ruleEngine');
const logger = require('./src/utils/logger');

async function testRuleEngineInitialization() {
  console.log('🧪 Starting Rule Engine Initialization Test...');
  
  try {
    // Test database connection first
    console.log('🔗 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Initialize models
    console.log('📊 Initializing models...');
    await initModels();
    console.log('✅ Models initialized successfully');
    
    // Test rule engine initialization with timeout
    console.log('🚀 Testing rule engine initialization...');
    const initPromise = ruleEngine.initialize();
    
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Rule engine initialization timed out after 15 seconds'));
      }, 15000);
    });
    
    const result = await Promise.race([initPromise, timeoutPromise]);
    
    console.log('✅ Rule engine initialized successfully!', result);
    
    // Test health status
    const health = ruleEngine.getHealthStatus();
    console.log('🩺 Rule engine health:', health);
    
    // Test a simple event emission
    console.log('📡 Testing event emission...');
    ruleEngine.emitTelemetryEvent({
      sensorUuid: 'test-sensor-uuid',
      telemetryDataId: 1,
      variableName: 'test',
      value: 'test-value',
      datatype: 'string',
      timestamp: new Date(),
      organizationId: 1,
      metadata: {
        source: 'test',
        priority: 'normal'
      }
    });
    console.log('✅ Event emission test completed');
    
    // Clean shutdown
    await ruleEngine.shutdown();
    console.log('✅ Rule engine shutdown successfully');
    
    // Close database
    await sequelize.close();
    console.log('✅ Database connection closed');
    
    console.log('🎉 All tests passed! Rule engine is ready for integration.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    try {
      await ruleEngine.shutdown();
      await sequelize.close();
    } catch (shutdownError) {
      console.error('Error during cleanup:', shutdownError);
    }
    
    process.exit(1);
  }
}

// Handle timeout for the entire test
setTimeout(() => {
  console.error('❌ Entire test timed out after 30 seconds');
  process.exit(1);
}, 30000);

testRuleEngineInitialization();

module.exports = { testRuleEngineInitialization }; 