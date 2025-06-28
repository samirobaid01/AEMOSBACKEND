/**
 * Quick Schedule Test - Shows immediate results
 */

const { ruleEngine } = require('./src/ruleEngine');

async function quickTest() {
  try {
    console.log('🚀 Quick Schedule Test Starting...\n');
    
    // Initialize rule engine
    await ruleEngine.initialize();
    console.log('✅ Rule Engine initialized\n');
    
    // Create a 5-second schedule for quick testing
    const schedule = ruleEngine.addSchedule({
      name: 'Quick Test Schedule',
      cronExpression: '*/5 * * * * *', // Every 5 seconds
      organizationId: 1,
      enabled: true,
      metadata: { type: 'quick_test' }
    });
    
    console.log('📅 Schedule Created:');
    console.log(`   • ID: ${schedule.id}`);
    console.log(`   • Name: ${schedule.name}`);
    console.log(`   • Cron: ${schedule.cronExpression}`);
    console.log(`   • Enabled: ${schedule.enabled}\n`);
    
    // Show stats
    const stats = ruleEngine.getScheduleStats();
    console.log('📊 Schedule Stats:');
    console.log(`   • Total Schedules: ${stats.totalSchedules}`);
    console.log(`   • Active Schedules: ${stats.activeSchedules}\n`);
    
    // Listen for one execution
    console.log('⏰ Waiting for first execution (max 10 seconds)...\n');
    
    let executed = false;
    ruleEngine.eventBus.on('schedule.triggered', (eventData) => {
      if (!executed) {
        executed = true;
        console.log('🔥 SCHEDULE EXECUTED!');
        console.log('   • Schedule Name:', eventData.scheduleName);
        console.log('   • Schedule ID:', eventData.scheduleId);
        console.log('   • Organization:', eventData.organizationId);
        console.log('   • Timestamp:', eventData.timestamp);
        console.log('   • Metadata:', eventData.metadata);
        
        // Clean up and exit
        console.log('\n✅ Schedule-based Rule Engine is WORKING!');
        cleanup();
      }
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!executed) {
        console.log('❌ No execution detected in 10 seconds');
        cleanup();
      }
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function cleanup() {
  try {
    await ruleEngine.shutdown();
    console.log('🧹 Cleaned up successfully');
    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
}

quickTest(); 