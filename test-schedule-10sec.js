/**
 * Test Script: 10-Second Schedule Demo
 * This demonstrates how the schedule-based rule engine works
 */

const { ruleEngine } = require('./src/ruleEngine');
const logger = require('./src/utils/logger');

async function testScheduleEngine() {
  try {
    console.log('🚀 Initializing Rule Engine for Schedule Test...');
    
    // Initialize the rule engine
    await ruleEngine.initialize();
    console.log('✅ Rule Engine initialized successfully!');
    
    // Create a 10-second test schedule
    console.log('\n📅 Creating 10-second test schedule...');
    const testSchedule = ruleEngine.addSchedule({
      name: 'Test 10-Second Schedule',
      cronExpression: '*/10 * * * * *', // Every 10 seconds
      organizationId: 1,
      enabled: true,
      metadata: {
        type: 'test_schedule',
        description: 'Testing 10-second schedule execution'
      }
    });
    
    console.log('✅ Schedule created:', {
      id: testSchedule.id,
      name: testSchedule.name,
      cronExpression: testSchedule.cronExpression,
      enabled: testSchedule.enabled
    });
    
    // Get initial stats
    console.log('\n📊 Initial Schedule Stats:');
    const initialStats = ruleEngine.getScheduleStats();
    console.log(JSON.stringify(initialStats, null, 2));
    
    // Monitor for 45 seconds to see multiple executions
    console.log('\n⏰ Monitoring schedule execution for 45 seconds...');
    console.log('Expected: Schedule should fire every 10 seconds');
    
    let executionCount = 0;
    const startTime = Date.now();
    
    // Listen for schedule events
    ruleEngine.eventBus.on('SCHEDULE_TRIGGERED', (eventData) => {
      executionCount++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log(`🔥 [${elapsed}s] Schedule Execution #${executionCount}:`, {
        scheduleName: eventData.scheduleName,
        scheduleId: eventData.scheduleId,
        organizationId: eventData.organizationId,
        timestamp: eventData.timestamp
      });
    });
    
    // Wait and then show final stats
    setTimeout(async () => {
      console.log('\n📊 Final Schedule Stats:');
      const finalStats = ruleEngine.getScheduleStats();
      console.log(JSON.stringify(finalStats, null, 2));
      
      console.log(`\n🎯 Test Summary:`);
      console.log(`   • Expected executions: ~4-5 (in 45 seconds)`);
      console.log(`   • Actual executions: ${executionCount}`);
      console.log(`   • Schedule working: ${executionCount >= 4 ? '✅ YES' : '❌ NO'}`);
      
      // Clean up
      console.log('\n🧹 Cleaning up...');
      ruleEngine.removeSchedule(testSchedule.id);
      await ruleEngine.shutdown();
      
      console.log('✅ Test completed successfully!');
      process.exit(0);
    }, 45000);
    
  } catch (error) {
    console.error('❌ Error in schedule test:', error);
    process.exit(1);
  }
}

// Handle cleanup on interruption
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Test interrupted by user');
  try {
    await ruleEngine.shutdown();
  } catch (e) {
    // Ignore cleanup errors
  }
  process.exit(0);
});

// Run the test
testScheduleEngine(); 