# AEMOS Multi-Protocol Notification Examples

This directory contains example scripts for testing the multi-protocol notification system (Socket.IO, MQTT, CoAP).

## 📋 Prerequisites

1. **Install Dependencies**
   ```bash
   npm install mqtt coap
   ```

2. **Start AEMOS Backend**
   ```bash
   # In the root directory
   npm start
   ```

3. **Ensure Features are Enabled** in `src/config/features.js`:
   ```javascript
   mqtt: { enabled: true, port: 1883 }
   coap: { enabled: true, port: 5683 }
   socketio: { enabled: true }
   ```

---

## 🔌 Socket.IO Examples

Socket.IO notifications are handled by the existing web clients. Use the browser console or the test HTML files:

```bash
open public/deviceSocketClient.html
```

---

## 📡 MQTT Examples

### 1. MQTT Subscriber (Listen for Notifications)

```bash
node examples/mqtt-client-example.js
```

**Environment Variables:**
```bash
MQTT_HOST=localhost \
MQTT_PORT=1883 \
DEVICE_UUID=550e8400-e29b-41d4-a716-446655440000 \
node examples/mqtt-client-example.js
```

**What it does:**
- Connects to MQTT broker
- Subscribes to device-specific topics
- Displays incoming notifications in real-time

**Topics subscribed:**
- `device/{deviceUuid}/state` - Device state changes
- `device/{deviceUuid}/notifications` - General notifications
- `device/{deviceUuid}/commands` - Command notifications
- `devices/all/notifications` - Broadcast notifications

---

### 2. MQTT Publisher (Send Test Message)

```bash
node examples/mqtt-publisher-example.js
```

**What it does:**
- Connects to MQTT broker
- Publishes a test telemetry message
- Disconnects after publishing

---

## 🛰️ CoAP Examples

### 1. CoAP Observer (Listen for Notifications)

```bash
node examples/coap-client-example.js
```

**Environment Variables:**
```bash
COAP_HOST=localhost \
COAP_PORT=5683 \
DEVICE_UUID=550e8400-e29b-41d4-a716-446655440000 \
node examples/coap-client-example.js
```

**What it does:**
- Sends CoAP OBSERVE request
- Listens for state change notifications
- Displays notifications as they arrive

**Observe path:**
- `/device/{deviceUuid}/observe`

---

### 2. CoAP Simple Request

```bash
node examples/coap-request-example.js
```

**What it does:**
- Sends a one-time GET request
- Retrieves current device state
- Exits after receiving response

---

## 🔔 Trigger Notifications via API

Use the provided script to trigger a device state change that will generate notifications across all protocols:

```bash
# First, login and export JWT token
export JWT_TOKEN="your-jwt-token-here"

# Or use the helper script
chmod +x examples/api-trigger-notification.sh
./examples/api-trigger-notification.sh
```

**Manual API Call:**
```bash
curl -X POST http://localhost:3000/api/v1/device-state-instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "deviceUuid": "550e8400-e29b-41d4-a716-446655440000",
    "stateName": "temperature",
    "value": "25",
    "initiatedBy": "user"
  }'
```

---

## 🧪 Complete Testing Workflow

### 1. Start Listeners (in separate terminals)

**Terminal 1 - MQTT Subscriber:**
```bash
node examples/mqtt-client-example.js
```

**Terminal 2 - CoAP Observer:**
```bash
node examples/coap-client-example.js
```

**Terminal 3 - WebSocket (Browser):**
```bash
open public/deviceSocketClient.html
```

### 2. Trigger a State Change

**Terminal 4 - API Call:**
```bash
export JWT_TOKEN="your-token"
./examples/api-trigger-notification.sh
```

### 3. Observe Notifications

You should see notifications appear in ALL three terminals:
- ✅ **MQTT**: Message on `device/{uuid}/state`
- ✅ **CoAP**: Observe notification with state change
- ✅ **Socket.IO**: WebSocket event `device-state-change`

---

## 🔧 Troubleshooting

### No MQTT Notifications Received

1. **Check MQTT broker is running:**
   ```bash
   npm test -- tests/integration/mqtt.test.js
   ```

2. **Check features config:**
   ```javascript
   // src/config/features.js
   mqtt: { enabled: true }
   ```

3. **Check logs:**
   ```bash
   tail -f logs/application-*.log | grep MQTT
   ```

### No CoAP Notifications Received

1. **Check CoAP server is running:**
   ```bash
   curl http://localhost:3000/api/v1/health | jq '.services'
   ```

2. **Check port availability:**
   ```bash
   lsof -i :5683
   ```

3. **Verify device exists:**
   ```bash
   curl http://localhost:3000/api/v1/devices \
     -H "Authorization: Bearer $JWT_TOKEN"
   ```

### No Socket.IO Notifications

1. **Check Socket.IO is enabled:**
   ```javascript
   // src/config/features.js
   socketio: { enabled: true }
   ```

2. **Open browser console** in the HTML client
3. **Check for connection errors**

---

## 📊 Architecture

### Main Server Flow
```
HTTP API Request (Create Device State)
  ↓
dataStreamController
  ↓
notificationManager.queueStateChangeNotification()
  ↓
├─→ Socket.IO (if main server)
│   └─→ Emit directly
│
├─→ MQTT Publisher
│   └─→ Publish to topic
│
└─→ CoAP Publisher
    └─→ Notify observers
```

### Worker Process Flow
```
Rule Engine Event (Triggered by Worker)
  ↓
notificationManager.queueStateChangeNotification()
  ↓
notificationBridge.publish() [Redis Pub/Sub]
  ↓
Main Server Subscriber
  ↓
├─→ Socket.IO
├─→ MQTT Publisher
└─→ CoAP Publisher
```

---

## 🎯 Use Cases

### Use Case 1: Real-Time Dashboard
- **Frontend**: Socket.IO for instant WebSocket updates
- **Mobile App**: MQTT for battery-efficient notifications
- **IoT Devices**: CoAP for lightweight M2M communication

### Use Case 2: Alert System
- **Critical Alerts**: All protocols for redundancy
- **Normal Updates**: Socket.IO only for web users
- **Device Commands**: CoAP for direct device control

### Use Case 3: Data Collection
- **Sensor Data**: MQTT for reliable telemetry
- **Aggregation**: Socket.IO for monitoring dashboard
- **Device Status**: CoAP observe for periodic updates

---

## 📚 Additional Resources

- **Socket.IO Docs**: https://socket.io/docs/
- **MQTT.js Docs**: https://github.com/mqttjs/MQTT.js
- **node-coap Docs**: https://github.com/mcollina/node-coap
- **AEMOS Architecture**: `docs/ARCHITECTURE-EVALUATION.md`
- **Protocol Docs**: `docs/mqtt-integration.md`, `docs/coap-request-flow.md`

---

## 🐛 Reporting Issues

If notifications aren't working:

1. **Check all services are running**
2. **Verify feature flags are enabled**
3. **Check logs for errors**
4. **Run integration tests**
5. **Create an issue with:**
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant log snippets
   - Environment details

---

**Last Updated**: January 21, 2026  
**Tested With**: AEMOS Backend v1.0.0
