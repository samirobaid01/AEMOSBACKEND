#!/usr/bin/env node

/**
 * Debug Script: Schedule Flow Troubleshooting
 * 
 * This script helps debug the complete flow from ScheduleManager database loading 
 * to rule chain execution. It provides step-by-step diagnostics and can manually 
 * trigger schedules to test the flow.
 * 
 * Usage:
 *   node debug-schedule-flow.js [ruleChainId]
 * 
 * If ruleChainId is provided, it will focus on that specific rule chain.
 * If not provided, it will show all scheduled rule chains.
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1`;

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${message}`, colors.cyan + colors.bright);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, colors.yellow + colors.bright);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function checkScheduleManagerStatus() {
  logStep(1, "Checking Schedule Manager Status");
  
  const result = await makeRequest('GET', '/rule-chains/debug/schedule-manager/stats');
  
  if (!result.success) {
    logError(`Failed to get Schedule Manager stats: ${result.error}`);
    return false;
  }
  
  const stats = result.data.data.stats;
  
  logSuccess(`Schedule Manager is operational`);
  logInfo(`Total Schedules: ${stats.totalSchedules}`);
  logInfo(`Active Schedules: ${stats.activeSchedules}`);
  logInfo(`Executed Schedules: ${stats.executedSchedules}`);
  logInfo(`Failed Schedules: ${stats.failedSchedules}`);
  logInfo(`Last Database Sync: ${stats.lastDatabaseSyncAt || 'Never'}`);
  logInfo(`Auto-sync Enabled: ${stats.autoSyncConfig.enabled}`);
  logInfo(`Auto-sync Interval: ${stats.autoSyncConfig.intervalMinutes} minutes`);
  
  if (stats.scheduleDetails && stats.scheduleDetails.length > 0) {
    log(`\nSchedule Details:`, colors.cyan);
    stats.scheduleDetails.forEach(schedule => {
      log(`  - Rule Chain ${schedule.ruleChainId}: ${schedule.name}`, colors.white);
      log(`    Enabled: ${schedule.enabled}, Active: ${schedule.isActive}`, colors.white);
      log(`    Executions: ${schedule.executionCount}, Failures: ${schedule.failureCount}`, colors.white);
      log(`    Last Executed: ${schedule.lastExecutedAt || 'Never'}`, colors.white);
      log(`    Database-backed: ${schedule.isDatabaseBacked}`, colors.white);
    });
  }
  
  return true;
}

async function checkSpecificSchedule(ruleChainId) {
  logStep(2, `Checking Specific Schedule (Rule Chain ${ruleChainId})`);
  
  const result = await makeRequest('GET', `/rule-chains/debug/${ruleChainId}/schedule-info`);
  
  if (!result.success) {
    logError(`Failed to get schedule info for rule chain ${ruleChainId}: ${result.error}`);
    return false;
  }
  
  const data = result.data.data;
  
  // Database schedule check
  if (data.troubleshooting.isScheduleInDatabase) {
    logSuccess(`Schedule found in database`);
    logInfo(`Enabled: ${data.troubleshooting.isScheduleEnabled}`);
    logInfo(`Cron Expression: ${data.troubleshooting.cronExpression}`);
    logInfo(`Last Executed: ${data.troubleshooting.lastExecutedAt || 'Never'}`);
    logInfo(`Execution Count: ${data.troubleshooting.executionCount}`);
    logInfo(`Failure Count: ${data.troubleshooting.failureCount}`);
  } else {
    logError(`Schedule NOT found in database`);
    return false;
  }
  
  // Local cache check
  if (data.troubleshooting.isScheduleInLocalCache) {
    logSuccess(`Schedule found in local cache`);
    logInfo(`Local Enabled: ${data.localSchedule.enabled}`);
    logInfo(`Local Active: ${data.localSchedule.isActive}`);
    logInfo(`Local Cron: ${data.localSchedule.cronExpression}`);
  } else {
    logWarning(`Schedule NOT found in local cache - needs sync`);
  }
  
  // Rule engine components check
  logInfo(`Rule Engine Available: ${data.ruleEngineInfo.hasRuleEngine}`);
  logInfo(`Schedule Manager Available: ${data.ruleEngineInfo.hasScheduleManager}`);
  logInfo(`Rule Chain Index Available: ${data.ruleEngineInfo.hasRuleChainIndex}`);
  logInfo(`Rule Chain Service Available: ${data.ruleEngineInfo.hasRuleChainService}`);
  
  return data;
}

async function syncScheduleFromDatabase(ruleChainId) {
  logStep(3, `Syncing Schedule from Database`);
  
  const result = await makeRequest('POST', `/rule-chains/debug/${ruleChainId}/sync-from-db`);
  
  if (!result.success) {
    logError(`Failed to sync schedule from database: ${result.error}`);
    return false;
  }
  
  logSuccess(`Schedule synced from database`);
  
  if (result.data.data.syncedSchedule) {
    const schedule = result.data.data.syncedSchedule;
    logInfo(`Synced Schedule - Enabled: ${schedule.enabled}, Active: ${schedule.isActive}`);
    logInfo(`Cron Expression: ${schedule.cronExpression}`);
  }
  
  return true;
}

async function manuallyTriggerSchedule(ruleChainId) {
  logStep(4, `Manually Triggering Schedule`);
  
  const result = await makeRequest('POST', `/rule-chains/debug/${ruleChainId}/trigger-schedule`);
  
  if (!result.success) {
    logError(`Failed to manually trigger schedule: ${result.error}`);
    return false;
  }
  
  logSuccess(`Schedule triggered manually`);
  logInfo(`Triggered at: ${result.data.data.timestamp}`);
  
  return true;
}

async function refreshAllSchedules() {
  logStep(5, `Refreshing All Schedules`);
  
  const result = await makeRequest('POST', '/rule-chains/debug/refresh-all-schedules');
  
  if (!result.success) {
    logError(`Failed to refresh all schedules: ${result.error}`);
    return false;
  }
  
  logSuccess(`All schedules refreshed from database`);
  
  const stats = result.data.data.stats;
  logInfo(`Total Schedules after refresh: ${stats.totalSchedules}`);
  logInfo(`Active Schedules after refresh: ${stats.activeSchedules}`);
  
  return true;
}

async function showScheduledRuleChains() {
  logStep('INFO', `Getting All Scheduled Rule Chains from Database`);
  
  const result = await makeRequest('GET', '/rule-chains/scheduled');
  
  if (!result.success) {
    logError(`Failed to get scheduled rule chains: ${result.error}`);
    return false;
  }
  
  const ruleChains = result.data.data;
  
  if (ruleChains.length === 0) {
    logWarning(`No scheduled rule chains found in database`);
    return false;
  }
  
  logSuccess(`Found ${ruleChains.length} scheduled rule chains in database:`);
  
  ruleChains.forEach(rc => {
    log(`\n  Rule Chain ${rc.id}: ${rc.name}`, colors.cyan);
    log(`    Schedule Enabled: ${rc.scheduleEnabled}`, colors.white);
    log(`    Cron Expression: ${rc.cronExpression || 'None'}`, colors.white);
    log(`    Execution Type: ${rc.executionType || 'Not set'}`, colors.white);
    log(`    Organization ID: ${rc.organizationId}`, colors.white);
    log(`    Last Executed: ${rc.lastExecutedAt || 'Never'}`, colors.white);
    log(`    Execution Count: ${rc.executionCount || 0}`, colors.white);
  });
  
  return ruleChains;
}

async function main() {
  const args = process.argv.slice(2);
  const ruleChainId = args[0] ? parseInt(args[0]) : null;
  
  logHeader('Schedule Flow Debug Tool');
  
  if (ruleChainId) {
    log(`Debugging specific rule chain: ${ruleChainId}`, colors.magenta);
  } else {
    log(`Debugging all schedules`, colors.magenta);
  }
  
  try {
    // Step 1: Check Schedule Manager status
    const managerOk = await checkScheduleManagerStatus();
    if (!managerOk) {
      logError('Schedule Manager is not working properly. Exiting.');
      process.exit(1);
    }
    
    // Show all scheduled rule chains
    const scheduledRuleChains = await showScheduledRuleChains();
    
    if (ruleChainId) {
      // Specific rule chain debugging
      const scheduleData = await checkSpecificSchedule(ruleChainId);
      if (!scheduleData) {
        logError(`Rule chain ${ruleChainId} schedule debugging failed. Exiting.`);
        process.exit(1);
      }
      
      // If schedule not in local cache, sync it
      if (!scheduleData.troubleshooting.isScheduleInLocalCache) {
        await syncScheduleFromDatabase(ruleChainId);
      }
      
      // Ask user if they want to manually trigger
      logStep('OPTION', 'Manual Trigger Available');
      logInfo('You can manually trigger this schedule to test the flow.');
      logInfo('Check your server logs for the debug output while triggering.');
      
      // Manual trigger (uncomment to auto-trigger)
      // await manuallyTriggerSchedule(ruleChainId);
      
    } else {
      // General debugging
      if (scheduledRuleChains && scheduledRuleChains.length > 0) {
        logStep('OPTION', 'Available Actions');
        logInfo('1. Run with specific rule chain ID: node debug-schedule-flow.js <ruleChainId>');
        logInfo('2. Refresh all schedules from database');
        
        // Uncomment to auto-refresh
        // await refreshAllSchedules();
      }
    }
    
    logHeader('Debug Complete');
    logSuccess('Check your server logs for detailed debug output during schedule execution.');
    logInfo('To see real-time debug logs, run: tail -f your-log-file.log | grep DEBUG');
    
    if (ruleChainId) {
      logInfo(`\nTo manually trigger rule chain ${ruleChainId}, run:`);
      logInfo(`curl -X POST ${API_BASE}/rule-chains/debug/${ruleChainId}/trigger-schedule`);
    }
    
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkScheduleManagerStatus,
  checkSpecificSchedule,
  syncScheduleFromDatabase,
  manuallyTriggerSchedule,
  refreshAllSchedules,
  showScheduledRuleChains
}; 