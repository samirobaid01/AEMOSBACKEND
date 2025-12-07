# Protocol-Aware Publishing Implementation

## Overview

This document describes the protocol-aware publishing system that conditionally publishes rule chain results and data streams based on the origin protocol of the request.

## Problem Statement

Previously, all rule chain execution results were always published to MQTT, regardless of whether the original request came from CoAP, MQTT, or HTTP. This caused:
- Unnecessary MQTT traffic for CoAP-originated requests
- Missing CoAP notifications for CoAP clients
- Confusion in logs (CoAP requests showing MQTT logs)

## Solution

The system now tracks the origin protocol throughout the request flow and conditionally publishes based on:
- **MQTT requests** → Publish to MQTT only
- **CoAP requests** → Notify CoAP observers only
- **HTTP requests** → Publish to both MQTT and CoAP (allows HTTP-triggered events to notify all subscribers)

## Implementation Details

### 1. Message Router (`src/services/messageRouter.js`)

**Changes:**
- Extracts `organizationId` from message context
- Passes `originProtocol` and `organizationId` to controller via mock request object

```javascript
const mockReq = {
  body: dataStream,
  sensorId: device.sensorId,
  device: device,
  deviceUuid: device.uuid,
  originProtocol: message.protocol || 'http', // Protocol context
  organizationId: organizationId
};
```

### 2. Data Stream Controller (`src/controllers/dataStreamController.js`)

**Changes:**
- Extracts `originProtocol` and `organizationId` from request
- Conditionally publishes data streams based on origin protocol
- Passes protocol context to `ruleChainService.trigger()`

**Publishing Logic:**
- **MQTT origin**: Publish to MQTT only
- **CoAP origin**: Notify CoAP observers only
- **HTTP/Unknown**: Publish to both MQTT and CoAP

### 3. Rule Chain Service (`src/services/ruleChainService.js`)

**Changes:**
- Updated `trigger()` method signature to accept `options` parameter:
  ```javascript
  async trigger(organizationId=1, options = {})
  ```
- `options.originProtocol`: Protocol that triggered the rule chain (mqtt, coap, http)
- `options.deviceUuid`: Device UUID for CoAP observer notifications

**Publishing Logic:**
- **MQTT origin**: Publish rule chain results to MQTT only
- **CoAP origin**: Notify CoAP observers with rule chain results
- **HTTP origin**: Publish to both MQTT and CoAP (if deviceUuid available)

## Flow Diagram

```
CoAP Request
    ↓
CoAP Service → Message Router
    ↓
Extract: originProtocol='coap', organizationId, deviceUuid
    ↓
Data Stream Controller
    ↓
Create Data Stream
    ↓
Publish: CoAP observers only ✅
    ↓
Trigger Rule Chain (with originProtocol='coap')
    ↓
Rule Chain Execution
    ↓
Publish Results: CoAP observers only ✅

---

MQTT Request
    ↓
MQTT Service → Message Router
    ↓
Extract: originProtocol='mqtt', organizationId, deviceUuid
    ↓
Data Stream Controller
    ↓
Create Data Stream
    ↓
Publish: MQTT only ✅
    ↓
Trigger Rule Chain (with originProtocol='mqtt')
    ↓
Rule Chain Execution
    ↓
Publish Results: MQTT only ✅

---

HTTP Request
    ↓
Express Routes → Controller
    ↓
Extract: originProtocol='http' (default), organizationId
    ↓
Data Stream Controller
    ↓
Create Data Stream
    ↓
Publish: Both MQTT and CoAP ✅
    ↓
Trigger Rule Chain (with originProtocol='http')
    ↓
Rule Chain Execution
    ↓
Publish Results: Both MQTT and CoAP ✅
```

## Benefits

1. **Reduced Network Traffic**
   - CoAP requests no longer generate unnecessary MQTT messages
   - MQTT requests no longer trigger CoAP notifications

2. **Protocol-Appropriate Notifications**
   - CoAP clients receive notifications via CoAP Observe
   - MQTT clients receive notifications via MQTT topics
   - HTTP requests notify all subscribers (flexible)

3. **Clearer Logging**
   - Logs clearly indicate which protocol triggered the action
   - No more confusion about CoAP requests showing MQTT logs

4. **Backward Compatibility**
   - HTTP routes still work (default to http protocol)
   - Manual rule chain triggers still work (default behavior)
   - Existing code continues to function

## Code Examples

### Triggering Rule Chain from Controller

```javascript
// From dataStreamController.js
const originProtocol = req.originProtocol || 'http';
const organizationId = req.organizationId || 1;

ruleChainService.trigger(organizationId, {
  originProtocol,
  deviceUuid: req.device?.uuid || req.deviceUuid
});
```

### Manual Rule Chain Trigger (HTTP Route)

```javascript
// From ruleChainRoutes.js
// No options provided - defaults to HTTP behavior (publishes to both)
const result = await ruleChainService.trigger(organizationId);
```

### Protocol-Specific Publishing

```javascript
// In ruleChainService.js
if (originProtocol === 'mqtt') {
  await mqttPublisher.publishRuleChainResult(...);
} else if (originProtocol === 'coap' && deviceUuid) {
  await coapPublisher.notifyObservers(deviceUuid, {...});
} else if (originProtocol === 'http') {
  // Publish to both
  await mqttPublisher.publishRuleChainResult(...);
  if (deviceUuid) {
    await coapPublisher.notifyObservers(deviceUuid, {...});
  }
}
```

## Testing

To test the implementation:

1. **CoAP Request:**
   ```bash
   # Send CoAP request
   # Verify: Only CoAP observers receive notifications
   # Verify: No MQTT messages published
   ```

2. **MQTT Request:**
   ```bash
   # Publish MQTT message
   # Verify: Only MQTT subscribers receive messages
   # Verify: No CoAP notifications sent
   ```

3. **HTTP Request:**
   ```bash
   # POST to /api/v1/data-streams/token
   # Verify: Both MQTT and CoAP subscribers receive notifications
   ```

## Future Enhancements

1. **Configuration-Based Publishing**
   - Allow configuration to override default behavior
   - Support for "always publish to all protocols" mode

2. **Protocol-Specific Rule Chain Actions**
   - Allow rule chains to specify which protocols to publish to
   - Support for protocol-specific action nodes

3. **Metrics and Monitoring**
   - Track protocol-specific publishing statistics
   - Monitor protocol-specific notification success rates

## Files Modified

1. `src/services/messageRouter.js` - Pass protocol context
2. `src/controllers/dataStreamController.js` - Conditional publishing
3. `src/services/ruleChainService.js` - Protocol-aware rule chain publishing

## Notes

- Default protocol is `'http'` for backward compatibility
- Default `organizationId` is `1` if not provided
- CoAP notifications require `deviceUuid` to be available
- HTTP requests publish to both protocols to ensure all subscribers are notified


