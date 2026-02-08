# P2: Reuse Redis Connections - Implementation Plan

## 📋 Overview

**Priority**: 🟡 P2  
**Effort**: 1 day  
**Impact**: Reduce Redis connection overhead by 33% (3 → 2 connections per process)  
**Status**: ✅ Expert-reviewed and improved

## 🎯 Critical Improvements (Expert Feedback)

This plan incorporates critical expert feedback to ensure production-safe implementation:

1. **🔴 Connection State Safety**: Only call `.connect()` when `status === 'end'` to prevent race conditions
2. **🟠 Dual-Role Prevention**: Explicit guard prevents publisher/subscriber misuse
3. **🟡 Ownership Documentation**: Clear documentation of shared connection lifecycle
4. **🟢 Configuration Confirmed**: `enableOfflineQueue: false` is correct (no change needed)
5. **🧪 Critical Test**: Redis reconnect during publish test validates recovery behavior

## 🎯 Problem Statement

Currently, the application creates **3 Redis connections per process**:
1. **Main connection** (`src/config/redis.js`) - Used by BullMQ, RuleChainIndex, health routes
2. **Notification Bridge Publisher** - Creates its own connection unnecessarily
3. **Notification Bridge Subscriber** - Creates its own connection (required for pub/sub)

**Current Impact:**
- With 20 worker processes: 20 × 3 = 60 connections
- With 5 main servers: 5 × 3 = 15 connections
- **Total**: 75 connections (wasteful, but acceptable)

**After Fix:**
- With 20 worker processes: 20 × 2 = 40 connections
- With 5 main servers: 5 × 2 = 10 connections
- **Total**: 50 connections (33% reduction)

## ✅ Solution

Reuse the shared `redisConnection` for the Notification Bridge publisher, while keeping the subscriber separate (pub/sub requires dedicated connection).

### Architecture Change

**Before:**
```
Main Process:
  ├── redisConnection (BullMQ, Index, Health)
  ├── notificationBridge.publisher (NEW connection)
  └── notificationBridge.subscriber (NEW connection)

Worker Process:
  ├── redisConnection (BullMQ)
  ├── notificationBridge.publisher (NEW connection)
  └── notificationBridge.subscriber (not used)
```

**After:**
```
Main Process:
  ├── redisConnection (BullMQ, Index, Health, Publisher) ← REUSED
  └── notificationBridge.subscriber (dedicated for pub/sub)

Worker Process:
  ├── redisConnection (BullMQ, Publisher) ← REUSED
  └── notificationBridge.subscriber (not used)
```

## 🔧 Technical Approach

### 1. Modify `notificationBridgeService.js`

**Changes:**
- Import shared `redisConnection` from `src/config/redis.js`
- Reuse `redisConnection` for publisher instead of creating new connection
- Keep subscriber connection separate (required for Redis pub/sub)
- Update shutdown logic to not disconnect shared connection

**Key Considerations:**
- Shared connection has `lazyConnect: true` - only call `.connect()` when `status === 'end'` to avoid race conditions
- Shared connection has `enableOfflineQueue: false` - ✅ **CORRECT** for publisher (prevents memory blowups, matches ThingsBoard behavior)
- Publisher only needs `publish()` method - shared connection supports this
- Must not disconnect shared connection on bridge shutdown (owned by application lifecycle)
- Connection state management: Only connect when status is 'end', leave other states alone

### 2. Connection Compatibility Check

**Shared Connection Config:**
```javascript
{
  maxRetriesPerRequest: null,  // ✅ Compatible with pub/sub
  enableReadyCheck: true,      // ✅ Good for health checks
  lazyConnect: true,            // ⚠️ Need to ensure connection before use
  enableOfflineQueue: false,     // ✅ Fine for publisher
  retryStrategy: (times) => ... // ✅ Standard retry
}
```

**Publisher Requirements:**
- `publish(channel, message)` - ✅ Supported by ioredis
- Error handling - ✅ Already configured on shared connection
- Authentication - ✅ Uses same env vars

### 3. Implementation Details

**File: `src/services/notificationBridgeService.js`**

```javascript
const redisConnection = require('../config/redis'); // Add this import

class NotificationBridgeService {
  initializePublisher() {
    if (this.publisher) {
      logger.warn('Notification publisher already initialized');
      return;
    }

    // Prevent dual-role misuse: cannot initialize publisher if subscriber is active
    if (this.isSubscriber) {
      throw new Error('Cannot initialize publisher on subscriber instance');
    }

    // Reuse shared connection instead of creating new one
    this.publisher = redisConnection;
    
    // CRITICAL: Only call connect() when status === 'end' to avoid race conditions
    // Other states (connecting, ready, reconnecting) should be left alone
    // Calling connect() during these states can cause:
    // - Thrown errors
    // - Unnecessary reconnect logic
    // - Race conditions with BullMQ, Indexing, Health checks
    if (redisConnection.status === 'end') {
      redisConnection.connect().catch(err => {
        logger.error('Failed to connect shared Redis for publisher:', err);
      });
    }

    this.isPublisher = true;
    logger.info('Notification publisher initialized (reusing shared Redis connection)');
  }

  shutdown() {
    // NOTE: redisConnection lifecycle is managed globally by the application.
    // NotificationBridge must never disconnect it, as it's shared with:
    // - BullMQ (RuleEngineQueue, RuleEngineWorker)
    // - RuleChainIndex (caching)
    // - Health routes (readiness checks)
    if (this.publisher && this.publisher !== redisConnection) {
      this.publisher.disconnect();
    }
    this.publisher = null;
    this.isPublisher = false;

    if (this.subscriber) {
      this.subscriber.disconnect();
      this.subscriber = null;
      this.isSubscriber = false;
    }

    logger.info('Notification bridge shut down');
  }
}
```

**Key Implementation Notes:**

1. **Connection State Safety**: Only call `.connect()` when `status === 'end'` (disconnected state). This prevents:
   - Race conditions with other services (BullMQ, Indexing, Health)
   - Unnecessary reconnect attempts
   - Errors from calling connect() during active connection states

2. **Dual-Role Prevention**: Explicit guard prevents initializing publisher when subscriber is active, making intent clear and preventing misuse.

3. **Connection Ownership**: Shared connection is owned by application lifecycle, not NotificationBridge. This is documented in code comments and must be respected in shutdown logic.

## 📝 Acceptance Criteria

- [ ] Publisher reuses shared `redisConnection` instead of creating new connection
- [ ] Subscriber remains as separate connection (required for pub/sub)
- [ ] All existing functionality works (publish, subscribe, error handling)
- [ ] Connection count reduced from 3 to 2 per process
- [ ] No breaking changes to existing code
- [ ] Proper error handling for connection state
- [ ] Shutdown logic doesn't disconnect shared connection

## 🧪 Testing Strategy

### Unit Tests
- [ ] Test publisher initialization reuses shared connection
- [ ] Test subscriber still creates separate connection
- [ ] Test shutdown doesn't disconnect shared connection
- [ ] Test error handling when shared connection is not ready
- [ ] Test connection state handling (only connect when status === 'end')
- [ ] Test dual-role prevention (cannot initialize publisher when subscriber active)
- [ ] Test idempotent initialization (multiple calls are safe)

### Integration Tests
- [ ] Test notification publishing works with shared connection
- [ ] Test notification subscription works with separate connection
- [ ] Test multiple processes can use shared connection safely
- [ ] Test connection recovery after disconnection
- [ ] **🔥 CRITICAL: Test Redis reconnect during publish**
  - Kill Redis connection
  - Attempt publish (should fail fast, log error)
  - Restart Redis
  - Verify publishing resumes without application restart
  - Validates shared connection recovery and no stuck state

### Manual Verification
- [ ] Monitor Redis `CLIENT LIST` to verify connection count
- [ ] Test notification flow end-to-end
- [ ] Verify no connection leaks on shutdown

## 📊 Success Metrics

- **Connection Reduction**: 3 → 2 connections per process (33% reduction)
- **Total Connections**: 75 → 50 connections (33% reduction)
- **No Performance Regression**: All operations maintain same latency
- **No Functionality Loss**: All features work as before

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared connection conflicts | High | ioredis supports concurrent operations safely |
| Connection state race conditions | **Critical** | Only call `.connect()` when `status === 'end'` (expert recommendation) |
| Shutdown disconnects shared connection | High | Explicit check: `if (this.publisher !== redisConnection)` before disconnect |
| Pub/sub compatibility | Low | Subscriber remains separate, publisher only uses `publish()` |
| Dual-role misuse | Medium | Guard: throw error if initializing publisher when subscriber active |
| Connection recovery | Medium | Test Redis reconnect during publish to validate recovery |

## 📁 Files to Modify

1. **`src/services/notificationBridgeService.js`**
   - Import `redisConnection`
   - Modify `initializePublisher()` to reuse shared connection
   - Update `shutdown()` to not disconnect shared connection

## 🔄 Migration Path

1. **Phase 1**: Implement connection reuse
   - Modify `notificationBridgeService.js`
   - Add connection state checks
   - Update shutdown logic

2. **Phase 2**: Testing
   - Run unit tests
   - Run integration tests
   - Manual verification

3. **Phase 3**: Deployment
   - Deploy to staging
   - Monitor connection count
   - Verify functionality
   - Deploy to production

## 📚 References

- [ioredis Connection Reuse](https://github.com/redis/ioredis#connection-pooling)
- [Redis Pub/Sub Requirements](https://redis.io/docs/manual/pubsub/)
- Architecture Evaluation: Section 6.3 (lines 388-422)

## 🔍 Expert Review & Critical Improvements

### ✅ Expert Feedback Incorporated

1. **🔴 Connection State Safety (CRITICAL)**
   - **Issue**: Calling `.connect()` when status is 'connecting' or 'ready' causes race conditions
   - **Fix**: Only call `.connect()` when `status === 'end'` (disconnected state)
   - **Impact**: Prevents errors, unnecessary reconnects, and race conditions with BullMQ/Indexing/Health

2. **🟠 Dual-Role Prevention**
   - **Issue**: Need explicit guard against publisher/subscriber dual-role misuse
   - **Fix**: Throw error if initializing publisher when subscriber is active
   - **Impact**: Makes intent clear, prevents future bugs, helps contributors

3. **🟡 Connection Ownership Documentation**
   - **Issue**: Need explicit documentation of shared connection ownership
   - **Fix**: Added code comments explaining connection lifecycle management
   - **Impact**: Prevents future refactor bugs, clarifies responsibilities

4. **🟢 enableOfflineQueue = false Confirmed Correct**
   - **Status**: ✅ No change needed
   - **Rationale**: Dropping messages during Redis downtime is acceptable for publisher, queueing is dangerous

5. **🧪 Critical Test Case Added**
   - **Test**: Redis reconnect during publish
   - **Purpose**: Validates shared connection recovery and no stuck states
   - **Impact**: Ensures robustness under failure scenarios

### Architecture Sanity Check

| Concern | Status | Notes |
|---------|--------|-------|
| BullMQ compatibility | ✅ Safe | Shared connection supports concurrent operations |
| Pub/sub rules | ✅ Subscriber separate | Required for Redis pub/sub |
| Shared connection concurrency | ✅ ioredis supports | Thread-safe operations |
| Worker safety | ✅ Workers only publish | No subscriber in workers |
| Shutdown safety | ✅ Fixed | Explicit check prevents disconnecting shared connection |
| Connection state handling | ✅ Fixed | Only connect when status === 'end' |
| Observability | ✅ Covered | Existing metrics and logging |
| Over-engineering | ✅ None | Minimal, focused changes |

## ✅ Ready to Proceed?

- [x] Problem statement clear
- [x] Solution approach defined
- [x] Technical approach validated with expert feedback
- [x] Connection state safety implemented (status === 'end' check)
- [x] Dual-role prevention added
- [x] Connection ownership documented
- [x] Acceptance criteria defined
- [x] Testing strategy outlined (including reconnect test)
- [x] Risks identified and mitigated
- [x] Files to modify identified
- [x] Expert feedback incorporated

**Status**: ✅ Ready for implementation (Expert-reviewed and improved)
