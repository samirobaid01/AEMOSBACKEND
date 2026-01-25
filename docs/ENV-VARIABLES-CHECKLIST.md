
# Environment Variables Checklist

## 📋 Current Implementation - Required Variables

Based on the P0 implementations, here's what you need in your `.env`:

---

## ✅ **Variables Added by P0 Implementation**

### 1. **Backpressure Management** (NEW)
```bash
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=10000
QUEUE_CRITICAL_THRESHOLD=50000
QUEUE_RECOVERY_THRESHOLD=5000
DEFAULT_EVENT_PRIORITY=5
RULE_ENGINE_WORKER_CONCURRENCY=20
```

### 2. **Redis Security** (NOW REQUIRED IN PRODUCTION)
```bash
REDIS_PASSWORD=your-secure-password    # MANDATORY in production
REDIS_USERNAME=default                 # Optional (Redis 6+)
```

---

## 🔴 **Critical - Production Requirements**

These **MUST** be set when `NODE_ENV=production`:

```bash
NODE_ENV=production

# Will cause startup failure if missing:
REDIS_PASSWORD=your-secure-redis-password
JWT_SECRET=your-secure-jwt-secret
```

**What happens if missing:**
```
❌ PRODUCTION CONFIGURATION ERRORS:

   - REDIS_PASSWORD is required in production
   - JWT_SECRET must be set to a secure value in production

Error: Missing required production configuration
```

---

## 📝 **Complete .env File Template**

### For Development
```bash
# === APPLICATION ===
NODE_ENV=development
PORT=3000

# === DATABASE ===
DB_HOST=localhost
DB_PORT=3306
DB_NAME=aemos_core
DB_USER=root
DB_PASSWORD=

# === REDIS ===
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
# REDIS_PASSWORD=    # Optional in development

# === SECURITY ===
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# === BACKPRESSURE (NEW - P0) ===
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=10000
QUEUE_CRITICAL_THRESHOLD=50000
QUEUE_RECOVERY_THRESHOLD=5000
DEFAULT_EVENT_PRIORITY=5
RULE_ENGINE_WORKER_CONCURRENCY=20

# === LOGGING ===
LOG_LEVEL=info
```

### For Production
```bash
# === APPLICATION ===
NODE_ENV=production
PORT=3000

# === DATABASE ===
DB_HOST=your-mysql-host.com
DB_PORT=3306
DB_NAME=aemos_production
DB_USER=aemos_user
DB_PASSWORD=your-secure-db-password

# === REDIS (REQUIRED!) ===
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=Kj9$mP2#xL5!qW8@nR4%tY7^zB3&hF6*  # REQUIRED!
REDIS_USERNAME=aemos-backend  # Optional for Redis 6+

# === SECURITY (REQUIRED!) ===
JWT_SECRET=your-very-secure-jwt-secret-minimum-32-chars  # REQUIRED!
JWT_EXPIRES_IN=24h

# === BACKPRESSURE (NEW - P0) ===
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=10000
QUEUE_CRITICAL_THRESHOLD=50000
QUEUE_RECOVERY_THRESHOLD=5000
DEFAULT_EVENT_PRIORITY=5
RULE_ENGINE_WORKER_CONCURRENCY=20

# === LOGGING ===
LOG_LEVEL=info

# === MQTT (Optional) ===
# MQTT_PORT=1883
# MQTT_HOST=0.0.0.0

# === COAP (Optional) ===
# COAP_PORT=5683
# COAP_HOST=0.0.0.0
```

---

## 🔍 **Check Your Current .env**

Run this to see what you have vs what you need:

```bash
# Check if new backpressure variables exist
grep -E "ENABLE_BACKPRESSURE|QUEUE_.*_THRESHOLD|RULE_ENGINE_WORKER" .env

# Check if Redis password is set
grep "REDIS_PASSWORD" .env

# Check all environment variables
cat .env
```

---

## ⚡ **Quick Setup Commands**

### Add Missing Backpressure Variables
```bash
cat >> .env << 'EOF'

# === BACKPRESSURE MANAGEMENT (P0 Implementation) ===
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=10000
QUEUE_CRITICAL_THRESHOLD=50000
QUEUE_RECOVERY_THRESHOLD=5000
DEFAULT_EVENT_PRIORITY=5
RULE_ENGINE_WORKER_CONCURRENCY=20
EOF
```

### Add Redis Password (Development)
```bash
echo "REDIS_PASSWORD=dev-password-123" >> .env
```

### Generate Secure Passwords (Production)
```bash
# Generate Redis password
echo "REDIS_PASSWORD=$(openssl rand -base64 32)" >> .env.production

# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production
```

---

## ✅ **Verification**

### Test Your Configuration
```bash
# Set environment
source .env  # or: export $(cat .env | xargs)

# Verify it loads
node -e "require('./src/config/index')" && echo "✅ Config valid"
```

### Check Queue Metrics Work
```bash
# Start server
npm start

# In another terminal
curl http://localhost:3000/api/v1/metrics/queue/summary
```

**Expected response:**
```json
{
  "health": "healthy",
  "queueDepth": 0,
  "workers": 1,
  "circuitState": "CLOSED",
  "rejectedCount": 0
}
```

---

## 🎯 **Migration Checklist**

If you're upgrading from before P0 implementation:

- [ ] Add `ENABLE_BACKPRESSURE=true`
- [ ] Add `QUEUE_WARNING_THRESHOLD=10000`
- [ ] Add `QUEUE_CRITICAL_THRESHOLD=50000`
- [ ] Add `QUEUE_RECOVERY_THRESHOLD=5000`
- [ ] Add `DEFAULT_EVENT_PRIORITY=5`
- [ ] Add `RULE_ENGINE_WORKER_CONCURRENCY=20`
- [ ] Set `REDIS_PASSWORD` (if production/staging)
- [ ] Verify `JWT_SECRET` is secure (if production)
- [ ] Test with: `npm test tests/unit/redisConfig.test.js`
- [ ] Verify endpoints: `curl /api/v1/metrics/queue/summary`

---

## 📊 **What Each Variable Does**

### Backpressure Variables (NEW)

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENABLE_BACKPRESSURE` | `true` | Enable/disable backpressure system |
| `QUEUE_WARNING_THRESHOLD` | `10000` | Warning level for queue depth |
| `QUEUE_CRITICAL_THRESHOLD` | `50000` | Opens circuit breaker |
| `QUEUE_RECOVERY_THRESHOLD` | `5000` | Closes circuit breaker |
| `DEFAULT_EVENT_PRIORITY` | `5` | Default priority for events (1-10) |
| `RULE_ENGINE_WORKER_CONCURRENCY` | `20` | Max concurrent jobs per worker |

### Security Variables (ENHANCED)

| Variable | Required | Purpose |
|----------|----------|---------|
| `REDIS_PASSWORD` | **Production** | Redis authentication |
| `REDIS_USERNAME` | Optional | Redis 6+ ACL username |
| `JWT_SECRET` | **Production** | JWT token signing key |

---

## 🔗 **Related Documentation**

- **Backpressure Config**: `docs/BACKPRESSURE-CONFIG.md`
- **Production Deployment**: `docs/PRODUCTION-DEPLOYMENT.md`
- **Redis Security**: `docs/REDIS-PASSWORD-ENFORCEMENT.md`
- **Complete Summary**: `docs/P0-ISSUES-COMPLETE.md`

---

## 💡 **Do You Have These Variables?**

**To check your current `.env`:**

1. Open your `.env` file
2. Look for the 6 new backpressure variables
3. Verify `REDIS_PASSWORD` is set (if production)
4. Verify `JWT_SECRET` is not default value

**If any are missing:**
- Copy from the template above
- Or run the "Quick Setup Commands"
- Then restart your server

---

**Last Updated**: January 22, 2026  
**Status**: Required for P0 Implementation  
**Priority**: 🔴 Critical for Production
