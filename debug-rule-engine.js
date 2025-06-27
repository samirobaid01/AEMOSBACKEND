const { ruleEngine, EventTypes, EventSources } = require('./src/ruleEngine');
const logger = require('./src/utils/logger');

async function debugRuleEngine() {
  try {
    console.log('🔍 DEBUG: Starting Rule Engine Debug...');
    
    // 1. Test initialization
    console.log('\n📋 Step 1: Testing Rule Engine Initialization...');
    await ruleEngine.initialize();
    console.log('✅ Rule engine initialized');
    
    // 2. Check components
    console.log('\n📋 Step 2: Checking Rule Engine Components...');
    const health = await ruleEngine.getHealth();
    console.log('Health status:', JSON.stringify(health, null, 2));
    
    // 3. Test event emission
    console.log('\n📋 Step 3: Testing Event Emission...');
    
    const testEvent = {
      sensorUuid: 'test-sensor-123',
      telemetryDataId: 1,
      variableName: 'temperature',
      value: 25.5,
      datatype: 'number',
      timestamp: new Date(),
      organizationId: 1,
      metadata: {
        source: EventSources.HTTP_API,
        priority: 'normal',
        urgent: false
      }
    };
    
    console.log('Emitting test telemetry event:', testEvent);
    
    await ruleEngine.emitTelemetryEvent(testEvent);
    
    console.log('✅ Event emitted successfully');
    
    // 4. Wait a bit for processing
    console.log('\n📋 Step 4: Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Check metrics
    console.log('\n📋 Step 5: Checking Metrics...');
    const metrics = await ruleEngine.getMetrics();
    console.log('Metrics:', JSON.stringify(metrics, null, 2));
    
    // 6. Test index status
    console.log('\n📋 Step 6: Checking Index Status...');
    // This will trigger index building if not already done
    const indexStats = await ruleEngine.getIndexStats(1);
    console.log('Index stats for org 1:', JSON.stringify(indexStats, null, 2));
    
    console.log('\n🎉 DEBUG: Rule Engine Debug Completed!');
    
  } catch (error) {
    console.error('❌ DEBUG: Error during testing:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the debug
debugRuleEngine(); 