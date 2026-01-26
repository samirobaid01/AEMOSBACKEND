# 🎫 P1 ISSUE #2: Add Rule Execution Timeouts with Structured Error Codes

**Status**: ⏳ Ready for Review & Approval  
**Effort**: 1.25 days  
**Priority**: 🟠 P1  
**Dependencies**: Issue #1 Complete ✅

---

## 📋 **EXECUTIVE SUMMARY**

### **Problem**
Rule chains can hang indefinitely if database queries, sensor/device data collection, or external API calls never return, causing:
- Worker processes becoming unresponsive
- Queue jobs piling up
- Other rule chains unable to execute
- Manual intervention required to kill workers

### **Solution**
Implement multi-level timeout strategy with structured error codes for precise monitoring and alerting.

### **Impact**
- ✅ Prevents hanging jobs
- ✅ Improves system reliability
- ✅ Enables precise timeout monitoring
- ✅ Better incident debugging
- ✅ SLA reporting by error type

---

## ✅ **ACCEPTANCE CRITERIA**

| # | Criteria | Priority | Complexity |
|---|----------|----------|------------|
| **AC1** | Rule execution times out after configurable duration (default 30s) | Must Have | Medium |
| **AC2** | Sensor/device data collection has individual timeouts (default 5s each) | Must Have | Medium |
| **AC3** | Timeout errors logged with full context (ruleChainId, sensorUUID, duration) | Must Have | Low |
| **AC4** | Timed-out jobs marked as "failed" with clear reason | Must Have | Low |
| **AC5** | Structured error codes for timeout classification | Must Have | Medium |
| **AC6** | Metrics tracked for timeout frequency by error code | Must Have | Medium |
| **AC7** | Configurable via environment variables | Must Have | Low |
| **AC8** | Unit tests cover all timeout scenarios | Must Have | Medium |

**Total**: 8 Acceptance Criteria

---

## 🏗️ **ARCHITECTURE**

### **Multi-Level Timeout Strategy**

```
┌─────────────────────────────────────────────────────────────┐
│                    BullMQ Worker Timeout                    │
│                    (Level 3: 60s max)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          Rule Chain Execution Timeout                 │  │
│  │              (Level 2: 30s default)                   │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │     Data Collection Timeouts                    │  │  │
│  │  │        (Level 1: 5s each)                       │  │  │
│  │  │  ┌──────────────┐    ┌─────────────────────┐   │  │  │
│  │  │  │Sensor Queries│    │ Device Queries      │   │  │  │
│  │  │  │   (5s max)   │    │     (5s max)        │   │  │  │
│  │  │  └──────────────┘    └─────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **Component Diagram**

```
┌────────────────────────────────────────────────────────────────┐
│                   Rule Chain Execution Flow                    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ RuleEngineEventBus    │
                  │   emit('telemetry')   │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │   BullMQ Queue        │
                  │   Job Created         │
                  └───────────┬───────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │         RuleEngineWorker.processEvent       │
        │         (BullMQ Worker - Level 3)           │
        │         Timeout: 60s (lockDuration)         │
        └─────────────────┬───────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────────┐
        │      ruleChainService.trigger()             │
        │         (Level 2 Timeout: 30s)              │
        └─────────────────┬───────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────────┐
        │  Promise.race([                             │
        │    _collectSensorDataWithTimeout(5s),       │ ← Level 1
        │    _collectDeviceDataWithTimeout(5s)        │ ← Level 1
        │  ])                                          │
        └─────────────────┬───────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────────┐
        │      executeWithTimeout(remaining time)     │
        │      (Level 2: 30s - elapsed)               │
        └─────────────────┬───────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────────┐
        │ Error Handling + Structured Error Codes     │
        │ - Log with context                          │
        │ - Increment Prometheus metrics              │
        │ - Mark job as failed                        │
        └─────────────────────────────────────────────┘
```

### **Data Flow**

```
Request
   │
   ├─→ EventBus queues job
   │
   ├─→ Worker picks up job (60s max lock)
   │     │
   │     ├─→ trigger() starts (30s timeout)
   │     │     │
   │     │     ├─→ collectSensorData (5s timeout) ─→ Success/Timeout
   │     │     │                                        │
   │     │     ├─→ collectDeviceData (5s timeout) ─→ Success/Timeout
   │     │     │                                        │
   │     │     └─→ execute rule chain (remaining time)
   │     │           │
   │     │           └─→ Success/Timeout
   │     │
   │     └─→ Error Handler
   │           │
   │           ├─→ Log with error code
   │           ├─→ Increment metrics
   │           └─→ Mark job failed
   │
   └─→ Return result or error
```

---

## 🎯 **STRUCTURED ERROR CODES**

### **Error Code Classification**

```javascript
const ERROR_CODES = {
  DATA_COLLECTION_TIMEOUT: 'DATA_COLLECTION_TIMEOUT',      // Sensor/device queries
  RULE_EXECUTION_TIMEOUT: 'RULE_EXECUTION_TIMEOUT',        // Rule chain execution
  WORKER_TIMEOUT: 'WORKER_TIMEOUT',                        // BullMQ job timeout
  EXTERNAL_ACTION_TIMEOUT: 'EXTERNAL_ACTION_TIMEOUT'       // Custom action APIs (future)
};
```

### **Error Code Mapping**

| Error Code | Triggered When | Default Timeout | Recovery Action |
|------------|----------------|-----------------|-----------------|
| `DATA_COLLECTION_TIMEOUT` | Sensor/device queries hang | 5s | Continue with empty data |
| `RULE_EXECUTION_TIMEOUT` | Rule chain execution hangs | 30s | Fail job, log error |
| `WORKER_TIMEOUT` | BullMQ job exceeds lock | 60s | Job auto-retried |
| `EXTERNAL_ACTION_TIMEOUT` | External API calls hang | 10s (future) | Skip action, log warning |

### **TimeoutError Class**

```javascript
class TimeoutError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'TimeoutError';
    this.code = code;                    // Error code for classification
    this.context = context;               // Additional context (ids, durations)
    this.timestamp = new Date().toISOString();
    this.isTimeout = true;                // Flag for easy identification
  }
}
```

### **Benefits of Structured Error Codes**

✅ **Precise Alerting**
```yaml
# Prometheus Alert Rules
- alert: HighDataCollectionTimeouts
  expr: rate(rule_timeout_total{error_code="DATA_COLLECTION_TIMEOUT"}[5m]) > 0.1
  
- alert: RuleExecutionTimeouts
  expr: rate(rule_timeout_total{error_code="RULE_EXECUTION_TIMEOUT"}[5m]) > 0.05
```

✅ **SLA Reporting**
```sql
-- Report timeout rates by type
SELECT 
  error_code,
  COUNT(*) as occurrences,
  AVG(duration) as avg_duration
FROM timeout_logs
WHERE timestamp > NOW() - INTERVAL 24 HOUR
GROUP BY error_code;
```

✅ **Faster Debugging**
```
Error: DATA_COLLECTION_TIMEOUT
Context: { sensorCount: 15, timeout: 5000, ruleChainId: 78 }
→ Immediately know it's a database query issue, not rule logic
```

---

## 📦 **ENVIRONMENT VARIABLES**

### **New Configuration** (✅ Adjusted for Clarity)

| Variable | Default | Description | Range |
|----------|---------|-------------|-------|
| `DATA_COLLECTION_TIMEOUT` | 5000 | Sensor/device query timeout (ms) | 1000-30000 |
| `RULE_CHAIN_TIMEOUT` | 30000 | **Overall rule chain execution budget (ms)** | 10000-120000 |
| `WORKER_LOCK_DURATION` | 60000 | BullMQ worker lock duration (ms) | 30000-300000 |
| `WORKER_MAX_STALLED_COUNT` | 2 | Max stalled attempts before fail | 1-5 |

**Removed** (per review):
- ~~`RULE_TRIGGER_TIMEOUT`~~ → Renamed to `RULE_CHAIN_TIMEOUT`
- ~~`RULE_EXECUTION_TIMEOUT`~~ → Removed (per-node timeouts unnecessary for v1)

### **Configuration Validation**

```javascript
const validateTimeoutConfig = () => {
  const dataTimeout = parseInt(process.env.DATA_COLLECTION_TIMEOUT || '5000', 10);
  const ruleChainTimeout = parseInt(process.env.RULE_CHAIN_TIMEOUT || '30000', 10);
  const workerLock = parseInt(process.env.WORKER_LOCK_DURATION || '60000', 10);
  
  if (dataTimeout >= ruleChainTimeout) {
    throw new Error('DATA_COLLECTION_TIMEOUT must be less than RULE_CHAIN_TIMEOUT');
  }
  
  if (ruleChainTimeout >= workerLock) {
    throw new Error('RULE_CHAIN_TIMEOUT must be less than WORKER_LOCK_DURATION');
  }
  
  return { dataTimeout, ruleChainTimeout, workerLock };
};
```

---

## 🔧 **IMPLEMENTATION PLAN**

### **Phase 1: Core Timeout Infrastructure** (4 hours)

**1.1 Create TimeoutError Class** (30 min)
- ✅ File: `src/utils/TimeoutError.js`
- ✅ Implement TimeoutError class
- ✅ Export ERROR_CODES constant
- ✅ Add JSDoc documentation

**1.2 Add Timeout Utilities** (30 min)
- ✅ File: `src/utils/timeoutUtils.js`
- ✅ Create `withTimeout(promise, timeout, errorCode, context)` helper
- ✅ Create `validateTimeoutConfig()` function
- ✅ Add unit tests

**1.3 Update Configuration** (30 min)
- ✅ File: `src/config/index.js`
- ✅ Add timeout environment variables
- ✅ Add validation on startup
- ✅ Document in `.env.example`

**1.4 Update Metrics Client** (30 min)
- ✅ File: `src/utils/metricsClient.js` (if exists) or create
- ✅ Add `rule_timeout_total` counter
- ✅ Add `rule_timeout_duration_seconds` histogram
- ✅ Label by error_code

---

### **Phase 2: RuleChainService Integration** (3 hours)

**2.1 Add Data Collection Timeouts** (1 hour)
- ✅ File: `src/services/ruleChainService.js`
- ✅ Wrap `_collectSensorData` with timeout
- ✅ Wrap `_collectDeviceData` with timeout
- ✅ Handle timeouts gracefully (continue with empty data)
- ✅ Log warnings with error codes

**2.2 Add Rule Execution Timeout** (1 hour)
- ✅ Wrap `execute()` call with timeout
- ✅ Calculate remaining time dynamically
- ✅ Throw TimeoutError if exceeded
- ✅ Log error with full context

**2.3 Enhanced Error Handling** (1 hour)
- ✅ Update `trigger()` method with try/catch
- ✅ Check for TimeoutError.code
- ✅ Increment Prometheus metrics
- ✅ Log structured error messages

---

### **Phase 3: Worker Integration** (2 hours)

**3.1 Update BullMQ Worker Config** (1 hour)
- ✅ File: `src/ruleEngine/core/RuleEngineWorker.js`
- ✅ Add `lockDuration` config
- ✅ Add `maxStalledCount` config
- ✅ Add timeout logging in job processor

**3.2 Job-Level Timeout** (1 hour)
- ✅ Wrap `processEvent()` with Promise.race
- ✅ Add timeout tracking
- ✅ Log timeout details
- ✅ Mark job as failed with reason

---

### **Phase 4: Testing** (2 hours)

**4.1 Unit Tests** (1 hour)
- ✅ File: `tests/unit/ruleExecutionTimeout.test.js`
- ✅ Test TimeoutError class
- ✅ Test timeout utilities
- ✅ Test data collection timeout scenarios
- ✅ Test rule execution timeout scenarios
- ✅ Test error code classification

**4.2 Integration Tests** (1 hour)
- ✅ File: `tests/integration/slowQueryTimeout.test.js`
- ✅ Test end-to-end timeout flow
- ✅ Test graceful degradation
- ✅ Test metrics incrementation
- ✅ Test job failure marking

---

## 📁 **FILES TO CREATE/MODIFY**

### **New Files (4)**
1. ✅ `src/utils/TimeoutError.js` - TimeoutError class + ERROR_CODES
2. ✅ `src/utils/timeoutUtils.js` - Timeout helper functions
3. ✅ `tests/unit/ruleExecutionTimeout.test.js` - Unit tests
4. ✅ `tests/integration/slowQueryTimeout.test.js` - Integration tests

### **Modified Files (4)**
5. ✅ `src/services/ruleChainService.js` - Add timeout wrappers
6. ✅ `src/ruleEngine/core/RuleEngineWorker.js` - Worker timeouts
7. ✅ `src/config/index.js` - Timeout configuration
8. ✅ `.env.example` - Document new env vars

**Optional** (if not already implemented):
9. `src/utils/metricsClient.js` - Prometheus metrics

**Total**: 8-9 files

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests (15+ tests)**

**TimeoutError Tests** (3 tests)
- ✅ Constructor with all parameters
- ✅ Error code assignment
- ✅ Context preservation

**Timeout Utilities Tests** (4 tests)
- ✅ `withTimeout` - success case
- ✅ `withTimeout` - timeout case
- ✅ `withTimeout` - error propagation
- ✅ `validateTimeoutConfig` - validation errors

**RuleChainService Tests** (8 tests)
- ✅ Data collection timeout - sensor timeout
- ✅ Data collection timeout - device timeout
- ✅ Data collection timeout - both timeout
- ✅ Data collection timeout - graceful degradation
- ✅ Rule execution timeout
- ✅ Error code classification
- ✅ Metrics incrementation
- ✅ Context logging

### **Integration Tests (5+ tests)**

**End-to-End Timeout Tests**
- ✅ Slow sensor query triggers timeout
- ✅ Slow rule execution triggers timeout
- ✅ Worker job timeout
- ✅ Metrics recorded correctly
- ✅ Job marked as failed with reason

### **Manual Testing Scenarios**

1. **Slow Database Query**
   - Add `sleep(10)` to sensor query
   - Verify `DATA_COLLECTION_TIMEOUT` error
   - Verify execution continues with empty data

2. **Infinite Loop in Rule**
   - Create rule with `while(true) {}`
   - Verify `RULE_EXECUTION_TIMEOUT` error
   - Verify worker doesn't hang

3. **Metrics Verification**
   - Trigger multiple timeouts
   - Check `/metrics` endpoint
   - Verify counters increment by error code

---

## 📊 **SUCCESS METRICS**

### **Immediate (Post-Implementation)**
- ✅ All tests passing (20+ tests)
- ✅ No linter errors
- ✅ Configuration validation working
- ✅ Metrics exposed on `/metrics` endpoint

### **Short-Term (1 week)**
- ✅ Zero hanging jobs reported
- ✅ Timeout rate < 1% of total jobs
- ✅ Worker processes stable
- ✅ Clear timeout alerts in monitoring

### **Long-Term (1 month)**
- ✅ 99.9% job completion rate
- ✅ Average timeout rate < 0.1%
- ✅ SLA reports by error code
- ✅ Proactive timeout alerts working

---

## ⚠️ **RISKS & MITIGATION**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Timeout too aggressive | Medium | High | Make configurable, start with conservative defaults |
| Legitimate slow queries | Low | Medium | Monitor metrics, adjust timeouts per environment |
| Breaking existing flows | Low | High | Graceful degradation, extensive testing |
| Performance overhead | Low | Low | Promise.race has minimal overhead |

---

## 🚀 **DEPLOYMENT PLAN**

### **Pre-Deployment**
1. ✅ All tests passing
2. ✅ Configuration documented
3. ✅ Metrics validated
4. ✅ Rollback plan ready

### **Deployment Steps**
1. Update environment variables
2. Restart API server
3. Restart worker
4. Monitor metrics for 1 hour
5. Verify no hanging jobs

### **Rollback Plan**
If issues occur:
1. Remove timeout wrappers (comment out)
2. Restart services
3. Investigate root cause
4. Fix and redeploy

---

## 📝 **DOCUMENTATION DELIVERABLES**

1. ✅ `docs/RULE-EXECUTION-TIMEOUTS.md` - Implementation guide
2. ✅ Updated `.env.example` - Configuration reference
3. ✅ Updated `docs/MONITORING.md` - Metrics & alerts (if exists)
4. ✅ Code comments - JSDoc for all functions

---

## ✅ **FINAL CHECKLIST**

**Before Implementation:**
- [ ] Review and approve this plan
- [ ] Confirm timeout values (5s data, 30s execution, 60s worker)
- [ ] Confirm error code strategy
- [ ] Confirm graceful degradation approach

**During Implementation:**
- [ ] Create TimeoutError class
- [ ] Add timeout utilities
- [ ] Update ruleChainService
- [ ] Update worker
- [ ] Add configuration
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

**After Implementation:**
- [ ] All tests passing
- [ ] No linter errors
- [ ] Manual testing complete
- [ ] Metrics verified
- [ ] Documentation updated
- [ ] Deployment plan confirmed

---

## ✅ **DECISION POINTS - RESOLVED**

### **1. Timeout Values** ✅ APPROVED
**Decision:**
- Data collection: 5 seconds ✅
- Rule chain: 30 seconds ✅ (renamed from RULE_TRIGGER_TIMEOUT)
- Worker lock: 60 seconds ✅

**Status**: Production-safe defaults, configurable per environment

### **2. Graceful Degradation** ✅ APPROVED with ADJUSTMENT
**Decision**: Continue with partial data + inject metadata

**Implementation**:
```javascript
meta: {
  partialData: true,
  missingSources: ['sensor:abc123'],
  timeoutDetails: { sensor: { timedOut: true, duration: 5001 } }
}
```

**Rationale**: Prevents cascading failures, enables explicit handling in filters

### **3. Error Codes** ✅ APPROVED
**Decision**: 4 error codes sufficient
- `DATA_COLLECTION_TIMEOUT`
- `RULE_EXECUTION_TIMEOUT` (will be `RULE_CHAIN_TIMEOUT` in code)
- `WORKER_TIMEOUT`
- `EXTERNAL_ACTION_TIMEOUT` (future)

**Status**: Clean separation, extensible without breaking changes

### **4. Metrics** ✅ APPROVED
**Decision**: Counter + Histogram labeled by error_code
```javascript
rule_timeout_total{error_code}
rule_timeout_duration_seconds{error_code}
```

**Additional**: Consider per-rule-chain metrics in future iterations

---

## 🏁 **APPROVED & READY FOR IMPLEMENTATION**

**Estimated Effort**: 1.25 days (10 hours)
- Phase 1: 4 hours (Core infrastructure)
- Phase 2: 3 hours (RuleChainService integration)
- Phase 3: 2 hours (Worker integration)
- Phase 4: 2 hours (Testing)

**Risks**: Low (with extensive testing + expert review adjustments)

**Impact**: High (prevents production outages)

---

## ✅ **APPROVED DECISIONS**

1. ✅ **Architecture approach** - Multi-level timeout strategy
2. ✅ **Timeout values** - 5s / 30s / 60s (production-safe)
3. ✅ **Error code strategy** - 4 codes, clean separation
4. ✅ **Graceful degradation** - Continue with partial data + metadata injection
5. ✅ **Testing strategy** - 20+ tests (unit + integration)

---

## 🔧 **CRITICAL ADJUSTMENTS INCORPORATED**

### **Adjustment #1: Renamed Timeout Variable** ✅
- ❌ `RULE_TRIGGER_TIMEOUT` (confusing)
- ✅ `RULE_CHAIN_TIMEOUT` (clear)
- Removed per-node timeouts (unnecessary for v1)

### **Adjustment #2: Explicit Partial Data Metadata** ✅
```javascript
meta: {
  partialData: true,
  missingSources: ['sensor:abc123', 'device:xyz'],
  timeoutDetails: { sensor: { timedOut: true, duration: 5001 } }
}
```

**Benefits**:
- Filters can explicitly check for missing data
- Actions can skip if data incomplete
- Debugging becomes trivial
- Prevents "why didn't my rule fire?" tickets

---

## 🚀 **PROCEEDING WITH IMPLEMENTATION**

All architectural decisions finalized. Starting implementation now!
