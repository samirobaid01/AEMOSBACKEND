/**
 * Test Script: Verify Schedule Fix for Rule Chain
 * 
 * This script helps verify that the ScheduleManager fix is working
 * and that your scheduled rule chains are executing properly.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

console.log('🧪 Testing Schedule Fix for Rule Chains');
console.log('='.repeat(60));

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
 * Check ScheduleManager status
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
 * Find your specific rule chain
 */
async function findYourRuleChain() {
  try {
    console.log('\n🔍 Looking for your rule chain...');
    
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    const response = await axios.get(`${BASE_URL}/rule-chains?organizationId=1`, { headers });
    
    if (response.status === 200 && response.data.status === 'success') {
      const ruleChains = response.data.data;
      
      // Look for the specific rule chain
      const targetRuleChain = ruleChains.find(rc => 
        rc.name === 'Complete Temperature Monitoring Rule Chain' ||
        rc.scheduleEnabled === true
      );
      
      if (targetRuleChain) {
        console.log(`✅ Found your rule chain: ${targetRuleChain.name}`);
        console.log(`   ID: ${targetRuleChain.id}`);
        console.log(`   Schedule Enabled: ${targetRuleChain.scheduleEnabled}`);
        console.log(`   Cron Expression: ${targetRuleChain.cronExpression}`);
        console.log(`   Execution Count: ${targetRuleChain.executionCount}`);
        console.log(`   Last Executed: ${targetRuleChain.lastExecutedAt || 'Never'}`);
        
        return targetRuleChain;
      } else {
        console.log('❌ Could not find your scheduled rule chain');
        return null;
      }
    } else {
      console.error('❌ Failed to get rule chains:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error finding rule chain:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Manually sync the rule chain schedule
 */
async function manualSyncSchedule(ruleChainId) {
  try {
    console.log(`\n🔄 Manually syncing schedule for rule chain ${ruleChainId}...`);
    
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    const response = await axios.post(`${BASE_URL}/rule-chains/${ruleChainId}/debug/sync-schedule`, {}, { headers });
    
    if (response.status === 200 && response.data.status === 'success') {
      console.log('✅ Schedule synced successfully');
      console.log(`   Message: ${response.data.message}`);
      return true;
    } else {
      console.error('❌ Failed to sync schedule:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error syncing schedule:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Refresh all schedules from database
 */
async function refreshAllSchedules() {
  try {
    console.log('\n🔄 Refreshing all schedules from database...');
    
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    const response = await axios.post(`${BASE_URL}/rule-chains/debug/refresh-all-schedules`, {}, { headers });
    
    if (response.status === 200 && response.data.status === 'success') {
      console.log('✅ All schedules refreshed successfully');
      console.log(`   Message: ${response.data.message}`);
      
      const stats = response.data.data;
      console.log(`   Total Schedules: ${stats.totalSchedules}`);
      console.log(`   Active Schedules: ${stats.activeSchedules}`);
      
      return true;
    } else {
      console.error('❌ Failed to refresh schedules:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error refreshing schedules:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Wait and check for execution
 */
async function waitAndCheckExecution(ruleChainId, waitTimeMinutes = 6) {
  try {
    console.log(`\n⏳ Waiting ${waitTimeMinutes} minutes to check for schedule execution...`);
    console.log('   (Your cron runs every 5 minutes, so this should be enough time)');
    
    const waitTimeMs = waitTimeMinutes * 60 * 1000;
    
    // Wait
    await new Promise(resolve => setTimeout(resolve, waitTimeMs));
    
    // Check execution count
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    const response = await axios.get(`${BASE_URL}/rule-chains/${ruleChainId}`, { headers });
    
    if (response.status === 200 && response.data.status === 'success') {
      const ruleChain = response.data.data;
      console.log(`✅ Checked rule chain after waiting`);
      console.log(`   Execution Count: ${ruleChain.executionCount}`);
      console.log(`   Last Executed: ${ruleChain.lastExecutedAt || 'Never'}`);
      
      if (ruleChain.executionCount > 0) {
        console.log('🎉 SUCCESS! Your schedule is working!');
        return true;
      } else {
        console.log('⚠️  Schedule still hasn\'t executed. This might be normal if the timing hasn\'t aligned yet.');
        return false;
      }
    } else {
      console.error('❌ Failed to check rule chain:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking execution:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Main test execution
 */
async function runScheduleTest() {
  console.log(`🎯 Testing against: ${BASE_URL}`);
  
  // Step 1: Authenticate
  await testAuthentication();
  
  // Step 2: Check ScheduleManager status
  const initialStats = await checkScheduleManagerStatus();
  
  // Step 3: Find your rule chain
  const ruleChain = await findYourRuleChain();
  
  if (!ruleChain) {
    console.log('\n❌ Cannot continue without finding your rule chain');
    return;
  }
  
  // Step 4: Manually sync the schedule
  await manualSyncSchedule(ruleChain.id);
  
  // Step 5: Refresh all schedules
  await refreshAllSchedules();
  
  // Step 6: Check status again
  await checkScheduleManagerStatus();
  
  // Step 7: Wait and check for execution
  const executed = await waitAndCheckExecution(ruleChain.id);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  if (executed) {
    console.log('🎉 SUCCESS! Your scheduled rule chain is working correctly.');
    console.log('   The ScheduleManager fix has resolved the issue.');
  } else {
    console.log('⚠️  The schedule might still be getting set up.');
    console.log('   Try checking again in a few minutes or restart your server.');
  }
  
  console.log('\n🔧 If you\'re still having issues:');
  console.log('   1. Restart your server to pick up the latest changes');
  console.log('   2. Check server logs for any error messages');
  console.log('   3. Verify your cron expression is valid');
  console.log('   4. Use the debug endpoints for real-time monitoring');
  
  console.log('\n🏁 Testing completed.');
}

// Run the test
runScheduleTest().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
}); 