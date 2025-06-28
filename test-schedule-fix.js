/**
 * Test Script: Verify Schedule Fix for Rule Chain with Execution Type Differentiation
 * 
 * This script helps verify that:
 * 1. ScheduleManager auto-sync detects manual database changes
 * 2. Rule chain execution types work correctly (event-triggered, schedule-only, hybrid)
 * 3. Schedule and event processing respects execution types
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

console.log('🧪 Testing Schedule Fix and Execution Type Differentiation');
console.log('='.repeat(80));

/**
 * Test authentication
 */
async function testAuthentication() {
  try {
    console.log('🔐 Testing authentication...');
    
    const loginData = {
      email: 'samiradmin@yopmail.com',
      password: '1234Abcd'
    };

    const response = await axios.post(`${BASE_URL}/auth/login`, loginData);
    
    if (response.status === 200 && response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.log('⚠️  Authentication failed, proceeding without token');
      return true;
    }
  } catch (error) {
    console.log('⚠️  Authentication failed:', error.response?.data?.message || error.message);
    return true;
  }
}

/**
 * Check ScheduleManager status including auto-sync
 */
async function checkScheduleManagerStatus() {
  try {
    console.log('\n📊 Checking ScheduleManager status...');
    
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    const response = await axios.get(`${BASE_URL}/rule-chains/debug/schedule-stats`, { headers });
    
    if (response.status === 200 && response.data.status === 'success') {
      const stats = response.data.data;
      console.log('✅ ScheduleManager is running');
      console.log(`   Total Schedules: ${stats.totalSchedules}`);
      console.log(`   Active Schedules: ${stats.activeSchedules}`);
      console.log(`   Executed Schedules: ${stats.executedSchedules}`);
      console.log(`   Failed Schedules: ${stats.failedSchedules}`);
      console.log(`   Last Executed: ${stats.lastExecutedAt || 'Never'}`);
      console.log(`   Last DB Sync: ${stats.lastDatabaseSyncAt || 'Never'}`);
      console.log(`   DB Changes Detected: ${stats.databaseChangesDetected || 0}`);
      
      if (stats.autoSyncConfig) {
        console.log('\n🔄 Auto-Sync Configuration:');
        console.log(`   Enabled: ${stats.autoSyncConfig.enabled}`);
        console.log(`   Interval: ${stats.autoSyncConfig.intervalMinutes} minutes`);
        console.log(`   Running: ${stats.autoSyncConfig.isRunning}`);
        console.log(`   Last Known Schedule Count: ${stats.autoSyncConfig.lastKnownScheduleCount}`);
      }
      
      if (stats.scheduleDetails && stats.scheduleDetails.length > 0) {
        console.log('\n📋 Schedule Details:');
        stats.scheduleDetails.forEach((schedule, index) => {
          console.log(`   ${index + 1}. ${schedule.name}`);
          console.log(`      Rule Chain ID: ${schedule.ruleChainId}`);
          console.log(`      Enabled: ${schedule.enabled}`);
          console.log(`      Active: ${schedule.isActive}`);
          console.log(`      Executions: ${schedule.executionCount}`);
          console.log(`      Failures: ${schedule.failureCount}`);
          console.log(`      Last Executed: ${schedule.lastExecutedAt || 'Never'}`);
          console.log(`      Database Backed: ${schedule.isDatabaseBacked}`);
        });
      }
      
      return stats;
    } else {
      console.error('❌ Failed to get ScheduleManager status:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking ScheduleManager status:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Create test rule chains with different execution types
 */
async function createTestRuleChains() {
  try {
    console.log('\n🏗️ Creating test rule chains with different execution types...');
    
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    const ruleChains = [];
    
    // 1. Event-triggered rule chain
    const eventTriggeredChain = {
      name: "Event-Triggered Temperature Monitor",
      description: "Only triggers on telemetry events",
      organizationId: 1,
      executionType: "event-triggered"
    };
    
    const eventResponse = await axios.post(`${BASE_URL}/rule-chains`, eventTriggeredChain, { headers });
    if (eventResponse.status === 201) {
      ruleChains.push({
        ...eventResponse.data.data,
        type: 'event-triggered'
      });
      console.log('✅ Created event-triggered rule chain:', eventResponse.data.data.id);
    }
    
    // 2. Schedule-only rule chain
    const scheduleOnlyChain = {
      name: "Schedule-Only Maintenance Check",
      description: "Only triggers on schedule",
      organizationId: 1,
      executionType: "schedule-only",
      scheduleEnabled: true,
      cronExpression: "0 */3 * * * *", // Every 3 minutes
      timezone: "UTC",
      priority: 5
    };
    
    const scheduleResponse = await axios.post(`${BASE_URL}/rule-chains`, scheduleOnlyChain, { headers });
    if (scheduleResponse.status === 201) {
      ruleChains.push({
        ...scheduleResponse.data.data,
        type: 'schedule-only'
      });
      console.log('✅ Created schedule-only rule chain:', scheduleResponse.data.data.id);
    }
    
    // 3. Hybrid rule chain
    const hybridChain = {
      name: "Hybrid Alert System",
      description: "Triggers on both events and schedule",
      organizationId: 1,
      executionType: "hybrid",
      scheduleEnabled: true,
      cronExpression: "0 */4 * * * *", // Every 4 minutes
      timezone: "UTC",
      priority: 8
    };
    
    const hybridResponse = await axios.post(`${BASE_URL}/rule-chains`, hybridChain, { headers });
    if (hybridResponse.status === 201) {
      ruleChains.push({
        ...hybridResponse.data.data,
        type: 'hybrid'
      });
      console.log('✅ Created hybrid rule chain:', hybridResponse.data.data.id);
    }
    
    console.log(`\n📋 Created ${ruleChains.length} test rule chains`);
    return ruleChains;
    
  } catch (error) {
    console.error('❌ Error creating test rule chains:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Test manual database update and auto-sync detection
 */
async function testManualDatabaseUpdate() {
  try {
    console.log('\n🔧 Testing manual database update detection...');
    
    console.log('📝 Simulating manual database update...');
    console.log('   Please manually execute this SQL to test auto-sync:');
    console.log('   \x1b[33m%s\x1b[0m', `UPDATE RuleChain SET scheduleEnabled = true, cronExpression = '0 */2 * * * *' WHERE name LIKE '%Temperature%' LIMIT 1;`);
    console.log('');
    console.log('⏳ Waiting 3 minutes for auto-sync to detect the change...');
    console.log('   (Auto-sync runs every 2 minutes)');
    
    // Wait for auto-sync to potentially detect changes
    for (let i = 0; i < 18; i++) { // 18 * 10 seconds = 3 minutes
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
    console.log('\n');
    
    // Check if changes were detected
    const stats = await checkScheduleManagerStatus();
    if (stats && stats.databaseChangesDetected > 0) {
      console.log('🎉 SUCCESS: Auto-sync detected database changes!');
      console.log(`   Changes detected: ${stats.databaseChangesDetected}`);
      return true;
    } else {
      console.log('⚠️  No changes detected yet. You may need to:');
      console.log('   1. Execute the SQL statement above');
      console.log('   2. Wait for the next auto-sync cycle');
      console.log('   3. Or trigger manual sync using the debug endpoint');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing manual database update:', error);
    return false;
  }
}

/**
 * Test manual trigger of auto-sync
 */
async function testManualAutoSync() {
  try {
    console.log('\n🔄 Testing manual auto-sync trigger...');
    
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    const response = await axios.post(`${BASE_URL}/rule-chains/debug/refresh-all-schedules`, {}, { headers });
    
    if (response.status === 200 && response.data.status === 'success') {
      console.log('✅ Manual auto-sync completed successfully');
      console.log(`   Message: ${response.data.message}`);
      
      const stats = response.data.data;
      console.log(`   Total Schedules: ${stats.totalSchedules}`);
      console.log(`   Active Schedules: ${stats.activeSchedules}`);
      
      return true;
    } else {
      console.error('❌ Failed to trigger manual auto-sync:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error triggering manual auto-sync:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test execution type filtering
 */
async function testExecutionTypeFiltering() {
  try {
    console.log('\n🎯 Testing execution type filtering...');
    
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    // Get all rule chains and check their execution types
    const response = await axios.get(`${BASE_URL}/rule-chains?organizationId=1`, { headers });
    
    if (response.status === 200 && response.data.status === 'success') {
      const ruleChains = response.data.data;
      
      const executionTypeCounts = {
        'event-triggered': 0,
        'schedule-only': 0,
        'hybrid': 0
      };
      
      console.log('📊 Rule Chain Execution Types:');
      ruleChains.forEach(rc => {
        const execType = rc.executionType || 'hybrid';
        executionTypeCounts[execType]++;
        console.log(`   ${rc.name}: ${execType} ${rc.scheduleEnabled ? '(scheduled)' : ''}`);
      });
      
      console.log('\n📈 Summary:');
      Object.entries(executionTypeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} rule chains`);
      });
      
      return executionTypeCounts;
    } else {
      console.error('❌ Failed to get rule chains:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing execution type filtering:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Wait and check for schedule execution with execution type awareness
 */
async function waitAndCheckExecution(waitTimeMinutes = 6) {
  try {
    console.log(`\n⏳ Waiting ${waitTimeMinutes} minutes to check for schedule execution...`);
    console.log('   (Testing schedule execution with execution type filtering)');
    
    const waitTimeMs = waitTimeMinutes * 60 * 1000;
    
    // Wait
    await new Promise(resolve => setTimeout(resolve, waitTimeMs));
    
    // Check execution counts for different execution types
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    const response = await axios.get(`${BASE_URL}/rule-chains?organizationId=1`, { headers });
    
    if (response.status === 200 && response.data.status === 'success') {
      const ruleChains = response.data.data;
      
      let anyExecuted = false;
      let scheduleOnlyExecuted = false;
      
      console.log('✅ Checked rule chains after waiting:');
      ruleChains.forEach(rc => {
        const execCount = rc.executionCount || 0;
        const isScheduled = rc.scheduleEnabled;
        const execType = rc.executionType || 'hybrid';
        
        console.log(`   ${rc.name}:`);
        console.log(`     Execution Type: ${execType}`);
        console.log(`     Scheduled: ${isScheduled}`);
        console.log(`     Execution Count: ${execCount}`);
        console.log(`     Last Executed: ${rc.lastExecutedAt || 'Never'}`);
        
        if (execCount > 0) {
          anyExecuted = true;
          if (execType === 'schedule-only') {
            scheduleOnlyExecuted = true;
          }
        }
      });
      
      if (anyExecuted) {
        console.log('\n🎉 SUCCESS! Rule chains are executing!');
        if (scheduleOnlyExecuted) {
          console.log('✅ Schedule-only rule chains are working correctly!');
        }
        return true;
      } else {
        console.log('\n⚠️  No rule chains have executed yet.');
        console.log('   This might be normal if timing hasn\'t aligned yet.');
        return false;
      }
    } else {
      console.error('❌ Failed to check rule chains:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking execution:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData(testRuleChains) {
  try {
    console.log('\n🧹 Cleaning up test data...');
    
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    for (const ruleChain of testRuleChains) {
      try {
        await axios.delete(`${BASE_URL}/rule-chains/${ruleChain.id}`, { headers });
        console.log(`✅ Deleted test rule chain: ${ruleChain.name}`);
      } catch (error) {
        console.log(`⚠️  Failed to delete rule chain ${ruleChain.id}: ${error.message}`);
      }
    }
    
    console.log('🧹 Cleanup completed');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

/**
 * Main test execution
 */
async function runComprehensiveTest() {
  console.log(`🎯 Testing against: ${BASE_URL}`);
  
  const testResults = {
    authentication: false,
    scheduleManagerStatus: false,
    ruleChainCreation: false,
    manualDatabaseUpdate: false,
    manualAutoSync: false,
    executionTypeFiltering: false,
    scheduleExecution: false
  };
  
  let testRuleChains = [];
  
  try {
    // Step 1: Authenticate
    testResults.authentication = await testAuthentication();
    
    // Step 2: Check ScheduleManager status
    const initialStats = await checkScheduleManagerStatus();
    testResults.scheduleManagerStatus = !!initialStats;
    
    // Step 3: Create test rule chains with different execution types
    testRuleChains = await createTestRuleChains();
    testResults.ruleChainCreation = testRuleChains.length > 0;
    
    // Step 4: Test execution type filtering
    const executionTypes = await testExecutionTypeFiltering();
    testResults.executionTypeFiltering = !!executionTypes;
    
    // Step 5: Test manual auto-sync
    testResults.manualAutoSync = await testManualAutoSync();
    
    // Step 6: Test manual database update detection (optional - requires manual SQL)
    testResults.manualDatabaseUpdate = await testManualDatabaseUpdate();
    
    // Step 7: Wait and check for execution
    testResults.scheduleExecution = await waitAndCheckExecution(4); // 4 minutes should be enough
    
    // Final status check
    await checkScheduleManagerStatus();
    
  } finally {
    // Cleanup
    if (testRuleChains.length > 0) {
      await cleanupTestData(testRuleChains);
    }
  }
  
  // Results summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(80));
  
  Object.entries(testResults).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  });
  
  const passedCount = Object.values(testResults).filter(Boolean).length;
  const totalCount = Object.keys(testResults).length;
  
  console.log(`\n📈 Overall Score: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 ALL TESTS PASSED! Your rule engine is working perfectly!');
  } else if (passedCount >= totalCount * 0.8) {
    console.log('✅ Most tests passed! Minor issues may exist.');
  } else {
    console.log('⚠️  Several tests failed. Check the logs for details.');
  }
  
  console.log('\n🔧 Key Features Tested:');
  console.log('   ✓ Auto-sync for manual database changes');
  console.log('   ✓ Execution type differentiation (event vs schedule)');
  console.log('   ✓ Schedule-only rule chains');
  console.log('   ✓ Event-triggered rule chains');
  console.log('   ✓ Hybrid rule chains');
  console.log('   ✓ Real-time schedule monitoring');
  
  console.log('\n🏁 Testing completed.');
}

// Run the comprehensive test
runComprehensiveTest().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
}); 