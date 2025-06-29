# Schedule Execution Debug Guide

This guide helps you debug schedule execution from database loading to rule chain execution. Use this when you have a rule in the database but can't see its effect.

## 🚀 Quick Start

1. **Check if your rule is scheduled:**
   ```bash
   node debug-schedule-flow.js
   ```

2. **Debug a specific rule chain:**
   ```bash
   node debug-schedule-flow.js <your-rule-chain-id>
   ```

3. **Watch real-time logs:**
   ```bash
   # In another terminal window
   tail -f your-log-file.log | grep "DEBUG"
   ```

## 🔍 Debugging Flow

### Step 1: Verify Schedule Manager Status

Check if the Schedule Manager is working:
```bash
curl http://localhost:3000/api/v1/rule-chains/debug/schedule-manager/stats
```

**What to look for:**
- `totalSchedules > 0` - Schedules are loaded
- `activeSchedules > 0` - Cron jobs are running
- `autoSyncConfig.enabled = true` - Auto-sync is working
- `lastDatabaseSyncAt` - Recent sync time

### Step 2: Check Your Specific Rule Chain

Check a specific rule chain schedule:
```bash
curl http://localhost:3000/api/v1/rule-chains/debug/{ruleChainId}/schedule-info
```

**Troubleshooting checklist:**
- ✅ `isScheduleInDatabase: true` - Rule exists in DB
- ✅ `isScheduleEnabled: true` - Schedule is enabled
- ✅ `isScheduleInLocalCache: true` - Schedule is loaded in memory
- ✅ `hasRuleEngine: true` - Rule engine is available
- ✅ `cronExpression` is valid

### Step 3: Sync Schedule from Database

If schedule is not in local cache, sync it:
```bash
curl -X POST http://localhost:3000/api/v1/rule-chains/debug/{ruleChainId}/sync-from-db
```

### Step 4: Manual Trigger Test

Test the schedule manually to see debug output:
```bash
curl -X POST http://localhost:3000/api/v1/rule-chains/debug/{ruleChainId}/trigger-schedule
```

**Watch your logs for these debug messages:**
1. 🔥 `CRON JOB TRIGGERED!` - Cron job fired
2. 🚀 `_executeSchedule() - Starting schedule execution` - Schedule processing started
3. 📡 `Emitting SCHEDULE_TRIGGERED event` - Event emitted to rule engine
4. 📅 `processScheduledEvent() - Received scheduled event` - Rule engine received event
5. 🚀 `_executeRuleChains() - Starting rule chains execution` - Rule execution started

## 🛠️ Debug Endpoints Reference

### Schedule Manager Stats
```bash
GET /api/v1/rule-chains/debug/schedule-manager/stats
```
Shows overall schedule manager status and all schedules.

### Specific Schedule Info
```bash
GET /api/v1/rule-chains/debug/{id}/schedule-info
```
Detailed info about a specific rule chain's schedule.

### Manual Schedule Trigger
```bash
POST /api/v1/rule-chains/debug/{id}/trigger-schedule
```
Manually trigger a schedule for testing (bypasses cron timing).

### Sync Schedule from Database
```bash
POST /api/v1/rule-chains/debug/{id}/sync-from-db
```
Force sync a specific schedule from database to local cache.

### Refresh All Schedules
```bash
POST /api/v1/rule-chains/debug/refresh-all-schedules
```
Reload all schedules from database (nuclear option).

### Trigger Auto-Sync
```bash
POST /api/v1/rule-chains/debug/trigger-auto-sync
```
Manually trigger the auto-sync process.

## 🔧 Common Issues & Solutions

### Issue: Schedule not found in local cache
**Symptoms:** `isScheduleInLocalCache: false`
**Solution:** 
```bash
curl -X POST http://localhost:3000/api/v1/rule-chains/debug/{id}/sync-from-db
```

### Issue: Schedule not executing
**Check:**
1. Cron expression is valid
2. Schedule is enabled in database
3. Schedule Manager is running
4. Check execution type (should be 'schedule-only' or 'hybrid')

### Issue: Events not reaching rule engine
**Check server logs for:**
- `EventBus is not available!`
- Missing rule engine components
- Event emission failures

### Issue: Rule chains not executing
**Check:**
- Rule chain has execution type 'schedule-only' or 'hybrid'
- Rule chain nodes are properly configured
- Required sensor/device data is available

## 📊 Debug Log Pattern

When a schedule executes successfully, you should see this pattern in logs:

```
🔍 DEBUG: _loadSchedulesFromDatabase() - Starting to load schedules from database
✅ DEBUG: _createCronJob() - Cron job created and started successfully
🔥 DEBUG: CRON JOB TRIGGERED! (when cron fires)
🚀 DEBUG: _executeSchedule() - Starting schedule execution
📡 DEBUG: _executeSchedule() - Emitting SCHEDULE_TRIGGERED event
📅 DEBUG: processScheduledEvent() - Received scheduled event
🔍 DEBUG: processScheduledEvent() - Processing scheduled event
🚀 DEBUG: _executeRuleChains() - Starting rule chains execution
🔍 DEBUG: _executeRuleChains() - Calling ruleChainService.execute()
✅ DEBUG: _executeRuleChains() - Rule chain execution completed
```

## 🚨 Troubleshooting Specific Problems

### Problem: "No rule chains found"
```bash
# Check if rule chains exist in database
curl http://localhost:3000/api/v1/rule-chains/scheduled

# Check specific rule chain
curl http://localhost:3000/api/v1/rule-chains/{id}
```

### Problem: "Schedule not eligible for execution"
Check the `executionType` field in your rule chain:
```sql
SELECT id, name, scheduleEnabled, executionType FROM RuleChain WHERE id = YOUR_ID;
```

Should be 'schedule-only' or 'hybrid', not 'event-triggered'.

### Problem: "Cron expression invalid"
Test your cron expression:
```javascript
const cron = require('node-cron');
console.log(cron.validate('0 */5 * * * *')); // Should return true
```

### Problem: Auto-sync not working
```bash
# Check auto-sync status
curl http://localhost:3000/api/v1/rule-chains/debug/schedule-manager/stats

# Manually trigger auto-sync
curl -X POST http://localhost:3000/api/v1/rule-chains/debug/trigger-auto-sync
```

## 📝 Environment Setup

Make sure your `.env` file has:
```env
BASE_URL=http://localhost:3000
LOG_LEVEL=debug
```

## 🔄 Testing Schedule Execution

1. **Set up a test schedule:**
   ```bash
   # Enable schedule for rule chain (every minute for testing)
   curl -X PUT http://localhost:3000/api/v1/rule-chains/{id}/schedule/enable \
     -H "Content-Type: application/json" \
     -d '{"cronExpression": "0 * * * * *", "timezone": "UTC"}'
   ```

2. **Watch for execution:**
   ```bash
   # Monitor logs
   tail -f logs/app.log | grep -E "(DEBUG|🔥|🚀|📅|✅)"
   
   # Or use the debug script
   node debug-schedule-flow.js {ruleChainId}
   ```

3. **Manual trigger test:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/rule-chains/debug/{id}/trigger-schedule
   ```

## 📞 Support

If you're still having issues:

1. **Enable maximum debugging:**
   - Set `LOG_LEVEL=debug` in `.env`
   - Restart your server
   - Run the debug script

2. **Collect debug info:**
   ```bash
   node debug-schedule-flow.js > debug-output.txt 2>&1
   ```

3. **Check database state:**
   ```sql
   SELECT id, name, scheduleEnabled, cronExpression, executionType, 
          lastExecutedAt, executionCount, failureCount 
   FROM RuleChain 
   WHERE scheduleEnabled = 1;
   ```

The comprehensive debug logging and tools should help you pinpoint exactly where the issue is occurring in the schedule execution flow. 