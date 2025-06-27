/**
 * Example: How to Use the ScheduleManager
 * This file demonstrates practical usage of the scheduling system
 */

const { ruleEngine } = require('./src/ruleEngine');

async function exampleUsage() {
  try {
    console.log('🚀 Initializing Rule Engine with ScheduleManager...');
    
    // Initialize the rule engine (this includes ScheduleManager)
    await ruleEngine.initialize();
    
    console.log('✅ Rule Engine initialized successfully!');
    console.log('📅 ScheduleManager is ready for use\n');

    // ========== 1. CREATE SCHEDULES ==========
    console.log('📝 Creating schedules...\n');

    // Example 1: Daily health check at 9 AM
    const dailyHealthCheck = ruleEngine.addSchedule({
      name: 'Daily System Health Check',
      cronExpression: '*/10 * * * * *', // Every day at 9 AM
      organizationId: 1,
      enabled: true,
      metadata: {
        type: 'health_check',
        description: 'Daily system health monitoring'
      }
    });
    console.log('✅ Created daily health check:', dailyHealthCheck.name);
    console.log('   ID:', dailyHealthCheck.id);

    // Example 2: Hourly sensor validation
    const sensorValidation = ruleEngine.addSchedule({
      name: 'Hourly Sensor Validation',
      cronExpression: '0 * * * *', // Every hour
      organizationId: 1,
      ruleChainIds: [78, 79], // Specific rule chains for sensor validation
      enabled: true,
      metadata: {
        type: 'validation',
        description: 'Validate sensor data integrity'
      }
    });
    console.log('✅ Created sensor validation:', sensorValidation.name);
    console.log('   ID:', sensorValidation.id);

    // Example 3: Custom ID example
    const customSchedule = ruleEngine.addSchedule({
      id: 'my-custom-schedule-id', // Custom ID provided
      name: 'Custom ID Schedule',
      cronExpression: '*/5 * * * *', // Every 5 minutes
      organizationId: 1,
      enabled: false, // Start disabled
      metadata: {
        type: 'testing',
        description: 'Example with custom ID'
      }
    });
    console.log('✅ Created custom schedule:', customSchedule.name);
    console.log('   ID:', customSchedule.id);

    // ========== 2. LIST SCHEDULES ==========
    console.log('\n📋 Current schedules for organization 1:');
    const schedules = ruleEngine.getSchedulesByOrganization(1);
    schedules.forEach(schedule => {
      console.log(`  • ${schedule.name} (${schedule.cronExpression}) - ${schedule.enabled ? 'ENABLED' : 'DISABLED'}`);
    });

    // ========== 3. MANUAL TRIGGER (TESTING) ==========
    console.log('\n🧪 Testing manual trigger...');
    await ruleEngine.manuallyTriggerSchedule(dailyHealthCheck.id);
    console.log('✅ Manually triggered daily health check');

    // ========== 4. STATISTICS ==========
    console.log('\n📊 Schedule Statistics:');
    const stats = ruleEngine.getScheduleStats();
    console.log(`  • Total schedules: ${stats.totalSchedules}`);
    console.log(`  • Active schedules: ${stats.activeSchedules}`);
    console.log(`  • Executed schedules: ${stats.executedSchedules}`);

    console.log('\n🎉 ScheduleManager demonstration completed!');

  } catch (error) {
    console.error('❌ Error in example usage:', error);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await ruleEngine.shutdown();
    console.log('✅ Rule Engine shut down');
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleUsage();
}

module.exports = { exampleUsage }; 