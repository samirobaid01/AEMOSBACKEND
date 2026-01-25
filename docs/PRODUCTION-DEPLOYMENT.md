# AEMOS Backend - Production Deployment Guide

## 🚀 Production Deployment Checklist

This guide covers secure deployment of AEMOS Backend to production environments.

---

## 📋 Pre-Deployment Requirements

### 1. Environment Variables (REQUIRED)

Create a `.env.production` file with the following **required** variables:

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

# === REDIS (REQUIRED IN PRODUCTION) ===
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password  # MANDATORY
REDIS_USERNAME=default  # Optional, for Redis 6+

# === SECURITY (REQUIRED) ===
JWT_SECRET=your-very-secure-jwt-secret-minimum-32-chars
JWT_EXPIRES_IN=24h

# === BACKPRESSURE & QUEUE ===
ENABLE_BACKPRESSURE=true
QUEUE_WARNING_THRESHOLD=10000
QUEUE_CRITICAL_THRESHOLD=50000
QUEUE_RECOVERY_THRESHOLD=5000
DEFAULT_EVENT_PRIORITY=5
RULE_ENGINE_WORKER_CONCURRENCY=20

# === LOGGING ===
LOG_LEVEL=info

# === PROTOCOLS ===
MQTT_PORT=1883
COAP_PORT=5683
```

### 2. Security Requirements

#### Redis Password
- **Minimum length**: 32 characters
- **Complexity**: Mix of uppercase, lowercase, numbers, symbols
- **Example**: `Kj9$mP2#xL5!qW8@nR4%tY7^zB3&hF6*`

#### JWT Secret
- **Minimum length**: 32 characters
- **Never use**: default value (`your-secret-key`)
- **Generate**: `openssl rand -base64 32`

### 3. Infrastructure Setup

- [ ] MySQL 8.0+ database provisioned
- [ ] Redis 5.0+ server with authentication enabled
- [ ] Load balancer configured (if applicable)
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Backup systems in place

---

## ⚙️ Configuration Validation

### Automatic Validation

The application will **automatically fail to start** if:
- `NODE_ENV=production` and `REDIS_PASSWORD` is not set
- `NODE_ENV=production` and `JWT_SECRET` is default value

### Manual Validation

Test your configuration before deployment:

```bash
# Set environment variables
export NODE_ENV=production
export REDIS_PASSWORD='your-password'
export JWT_SECRET='your-secret'

# Test configuration loading
node -e "require('./src/config/index')" && echo "✅ Configuration valid"
```

**Expected output**:
```
✅ Configuration valid
```

**If validation fails**:
```
❌ PRODUCTION CONFIGURATION ERRORS:

   - REDIS_PASSWORD is required in production
   - JWT_SECRET must be set to a secure value in production

Please set the required environment variables before starting in production.
```

---

## 🔧 Redis Server Configuration

### Redis 5.x Configuration

Edit `redis.conf`:
```conf
# Require password for all operations
requirepass your-secure-redis-password

# Bind to specific interface (not 0.0.0.0 in production)
bind 127.0.0.1

# Enable persistence
save 900 1
save 300 10
save 60 10000

# Set max memory and eviction policy
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### Redis 6+ Configuration with ACL

```bash
# Create dedicated user for AEMOS
redis-cli
> ACL SETUSER aemos-backend on >your-secure-password ~* +@all
> ACL SAVE
```

Set in environment:
```bash
REDIS_USERNAME=aemos-backend
REDIS_PASSWORD=your-secure-password
```

---

## 📦 Deployment Steps

### Option 1: Direct Deployment

```bash
# 1. Clone repository
git clone https://github.com/your-org/aemos-backend.git
cd aemos-backend

# 2. Install dependencies
npm ci --production

# 3. Set environment variables
cp .env.production .env

# 4. Run database migrations (if applicable)
# npm run migrate

# 5. Start application
npm start
```

### Option 2: PM2 Deployment

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start main server
pm2 start src/server.js --name aemos-backend --env production

# 3. Start worker processes
pm2 start src/workers/startRuleEngineWorker.js \
    --name aemos-worker \
    --instances 3 \
    --env production

# 4. Save PM2 configuration
pm2 save

# 5. Setup PM2 startup script
pm2 startup
```

### Option 3: Docker Deployment

```bash
# Build image
docker build -t aemos-backend:latest .

# Run main server
docker run -d \
  --name aemos-backend \
  --env-file .env.production \
  -p 3000:3000 \
  aemos-backend:latest

# Run workers
docker run -d \
  --name aemos-worker-1 \
  --env-file .env.production \
  aemos-backend:latest \
  node src/workers/startRuleEngineWorker.js
```

---

## ✅ Post-Deployment Verification

### 1. Health Checks

```bash
# Basic health
curl https://your-domain.com/api/v1/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "ruleEngineQueue": { "status": "healthy" }
  }
}
```

### 2. Queue Metrics

```bash
curl https://your-domain.com/api/v1/metrics/queue/summary

# Expected response:
{
  "health": "healthy",
  "queueDepth": 0,
  "workers": 3,
  "circuitState": "CLOSED",
  "rejectedCount": 0
}
```

### 3. Redis Connection

```bash
# Check logs for Redis connection
tail -f logs/application-*.log | grep -i redis

# Expected:
# Redis authentication enabled
# Redis connection established
# Redis connection ready
```

### 4. Authentication Test

```bash
# Login test
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Should return JWT token
```

---

## 📊 Monitoring Setup

### Prometheus Integration

Add to `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'aemos-backend'
    static_configs:
      - targets: ['your-domain.com:3000']
    metrics_path: '/api/v1/metrics/prometheus'
    scrape_interval: 15s
```

### Key Metrics to Monitor

1. **Queue Depth**: `rule_engine_queue_total_pending`
2. **Circuit State**: `rule_engine_backpressure_circuit_state`
3. **Rejected Events**: `rule_engine_backpressure_rejected_total`
4. **Worker Count**: `rule_engine_workers`
5. **Failed Jobs**: `rule_engine_queue_failed`

### Alerts Configuration

```yaml
groups:
- name: aemos
  rules:
  - alert: RedisAuthenticationFailed
    expr: redis_connection_errors{type="authentication"} > 0
    for: 1m
    severity: critical
    
  - alert: QueueOverloaded
    expr: rule_engine_queue_total_pending > 50000
    for: 5m
    severity: critical
    
  - alert: CircuitBreakerOpen
    expr: rule_engine_backpressure_circuit_state == 2
    for: 5m
    severity: warning
```

---

## 🔒 Security Hardening

### 1. Network Security

```bash
# Firewall rules (example using ufw)
ufw allow 3000/tcp  # API
ufw allow 1883/tcp  # MQTT
ufw allow 5683/udp  # CoAP
ufw enable
```

### 2. SSL/TLS Configuration

Use reverse proxy (Nginx/Apache) for SSL termination:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Environment Variables Security

**Never**:
- Commit `.env` files to Git
- Log sensitive values
- Share secrets via email/Slack
- Use same passwords across environments

**Always**:
- Use secret management (Vault, AWS Secrets Manager)
- Rotate passwords regularly (90 days)
- Restrict access to production secrets
- Audit secret access

---

## 🔄 Updates & Maintenance

### Rolling Updates

```bash
# PM2 zero-downtime reload
pm2 reload aemos-backend

# Docker rolling update
docker-compose up -d --no-deps --build aemos-backend
```

### Database Migrations

```bash
# Run migrations before updating code
npm run migrate

# Rollback if needed
npm run migrate:rollback
```

### Password Rotation

```bash
# 1. Update Redis password
redis-cli CONFIG SET requirepass new-password

# 2. Update environment variable
export REDIS_PASSWORD='new-password'

# 3. Restart application
pm2 restart aemos-backend aemos-worker
```

---

## 🐛 Troubleshooting

### Application Won't Start

**Error**: `REDIS_PASSWORD must be set when NODE_ENV=production`

**Solution**:
```bash
export REDIS_PASSWORD='your-password'
```

### Redis Authentication Failed

**Error**: `Redis authentication failed`

**Check**:
1. Password matches Redis server
2. Redis server has `requirepass` set
3. Test manually: `redis-cli -a your-password ping`

### Queue Not Processing

**Check**:
1. Worker processes running: `pm2 list`
2. Queue metrics: `curl /api/v1/metrics/queue/summary`
3. Worker logs: `pm2 logs aemos-worker`

---

## 📞 Support

For deployment issues:
- **Documentation**: `docs/` folder
- **Logs**: `logs/application-*.log`
- **Health**: `/api/v1/health`
- **Metrics**: `/api/v1/metrics/queue`

---

## ✅ Deployment Checklist Summary

- [ ] Environment variables set (REDIS_PASSWORD, JWT_SECRET)
- [ ] Redis server configured with password
- [ ] Database migrations run
- [ ] Application starts without errors
- [ ] Health endpoint returns "healthy"
- [ ] Redis authentication enabled (check logs)
- [ ] Queue metrics accessible
- [ ] Worker processes running
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] SSL/TLS configured
- [ ] Firewall rules applied
- [ ] Backup systems verified

---

**Last Updated**: January 22, 2026  
**Version**: 1.0.0  
**Status**: Production Ready
