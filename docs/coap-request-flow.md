# CoAP Request Execution Flow

This document describes the complete execution path when a CoAP client sends a POST request to `/datastreams` with telemetry data.

## Request Payload Structure

```javascript
{
  dataStreams: [
    { telemetryDataId: 1, value: "8", recievedAt: "2025-11-30T14:43:02.504Z" },
    { telemetryDataId: 29, value: "6", recievedAt: "2025-11-30T14:43:02.504Z" },
    // ... more items
  ],
  token: "63f8ab57ddb6cbc947933c851a808fcdfdbbe7498994b278d1109dccc8a57110",
  deviceUuid: "5374f780-32fa-11f0-ad04-70f787be2478",
  timestamp: "2025-11-30T14:43:02.504Z"
}
```

## Complete Execution Flow

### 1. **CoAP Server Receives Request**
   - **File**: `src/services/coapService.js`
   - **Method**: `_handleRequest(req, res)`
   - **Location**: Line 54-141
   - **Actions**:
     - Parses URL to extract `pathname` (`/datastreams`)
     - Extracts HTTP method (`POST`)
     - Extracts request info (`rsinfo`: address, port)
     - Reads raw payload buffer

### 2. **Message Normalization**
   - **File**: `src/adapters/coapAdapter.js`
   - **Method**: `normalizeMessage(path, payloadBuffer, meta)`
   - **Location**: Line 18-51
   - **Actions**:
     - Converts payload buffer to string
     - Parses JSON payload
     - Extracts `deviceUuid` and `organizationId` from path (if present)
     - Creates normalized message object:
       ```javascript
       {
         protocol: 'coap',
         path: '/datastreams',
         subtopic: null,
         deviceUuid: null,  // Will be extracted from payload later
         organizationId: null,
         payload: { /* parsed JSON */ },
         raw: '/* original string */',
         rsinfo: { address, port },
         method: 'POST',
         receivedAt: '2025-11-30T14:43:02.506Z'
       }
       ```

### 3. **Message Validation (CoAP Adapter)**
   - **File**: `src/adapters/coapAdapter.js`
   - **Method**: `validateMessage(normalized)`
   - **Location**: Line 53-60
   - **Actions**:
     - Checks if message exists
     - Validates payload exists (can be string or object)
     - Returns `true` if valid

### 4. **Route to Message Router**
   - **File**: `src/services/coapService.js`
   - **Method**: `messageRouter.route(normalized)`
   - **Location**: Line 116
   - **Actions**:
     - Passes normalized message to message router for processing

### 5. **Common Adapter Validation**
   - **File**: `src/adapters/commonAdapter.js`
   - **Method**: `validateMessage(message)`
   - **Location**: Line 12-37
   - **Actions**:
     - Validates `protocol` exists
     - Validates `payload` exists
     - **Note**: `timestamp` is optional (can be derived later)

### 6. **Message Transformation**
   - **File**: `src/adapters/commonAdapter.js`
   - **Method**: `transformMessage(message)`
   - **Location**: Line 44-64
   - **Actions**:
     - Extracts timestamp from multiple sources:
       1. `message.timestamp` (top level)
       2. `message.receivedAt` (CoAP sets this)
       3. `message.payload.timestamp` (from client)
       4. Defaults to `new Date()` if none found
     - Adds `processedAt` timestamp
     - Adds metadata object

### 7. **Determine Message Type**
   - **File**: `src/services/messageRouter.js`
   - **Method**: `getMessageType(message)`
   - **Location**: Line 88-119
   - **Actions**:
     - Checks protocol is `coap`
     - Examines path (`/datastreams`)
     - Returns `'dataStream'` (since path includes `/datastream`)

### 8. **Route to Handler**
   - **File**: `src/services/messageRouter.js`
   - **Method**: `route(message)`
   - **Location**: Line 63-70
   - **Actions**:
     - Looks up handler from routes map: `this.routes.get('dataStream')`
     - Calls `handleDataStream(transformedMessage)`

### 9. **Extract Device UUID**
   - **File**: `src/services/messageRouter.js`
   - **Method**: `extractDeviceUuid(message)`
   - **Location**: Line 457-470
   - **Actions**:
     - Checks `message.deviceUuid` (top level) - **null**
     - Checks `message.payload.deviceUuid` - **Found!** `"5374f780-32fa-11f0-ad04-70f787be2478"`
     - Returns device UUID from payload

### 10. **Device Authentication**
   - **File**: `src/services/messageRouter.js`
   - **Method**: `authenticateDevice(deviceUuid, message)`
   - **Location**: Line 388-450
   - **Actions**:
     - Extracts token from `message.payload.token`
     - Queries `DeviceToken` table with token
     - Includes `Sensor` relationship
     - Validates:
       - Token exists and is active
       - Sensor UUID matches provided `deviceUuid`
       - Token is not expired
     - Returns device object:
       ```javascript
       {
         sensorId: 123,
         uuid: "5374f780-32fa-11f0-ad04-70f787be2478",
         name: "Sensor Name"
       }
       ```

### 11. **Parse Data Streams**
   - **File**: `src/services/messageRouter.js`
   - **Method**: `handleDataStream(message)`
   - **Location**: Line 159-177
   - **Actions**:
     - Checks if `message.payload.dataStreams` is array (batch format)
     - Validates each data stream has `value` and `telemetryDataId`
     - Creates array of data streams to process

### 12. **Process Each Data Stream**
   - **File**: `src/services/messageRouter.js`
   - **Method**: `handleDataStream(message)` - Loop
   - **Location**: Line 190-210
   - **Actions**:
     - For each data stream in batch:
       - Creates mock request object:
         ```javascript
         {
           body: { telemetryDataId: 1, value: "8", ... },
           sensorId: 123,
           device: { sensorId, uuid, name },
           deviceUuid: "5374f780-32fa-11f0-ad04-70f787be2478"
         }
         ```
       - Creates mock response object
       - Calls `dataStreamController.createDataStreamWithToken(mockReq, mockRes)`

### 13. **Controller Processing**
   - **File**: `src/controllers/dataStreamController.js`
   - **Method**: `createDataStreamWithToken(req, res)`
   - **Location**: Line 231-342
   - **Actions**:
     - Validates `value` and `telemetryDataId` in request body
     - Verifies `sensorId` exists (from authenticated device)
     - Queries `TelemetryData` to verify it belongs to sensor
     - Creates `DataStream` record in database:
       ```javascript
       DataStream.create({
         value: "8",
         telemetryDataId: 1,
         recievedAt: new Date()
       })
       ```
     - Returns 201 response with created data stream

### 14. **Post-Processing (Asynchronous)**
   - **File**: `src/controllers/dataStreamController.js`
   - **Method**: `createDataStreamWithToken(req, res)` - `process.nextTick`
   - **Location**: Line 287-327
   - **Actions** (after response sent):
     - **Socket.IO Notification**:
       - Queues notification via `notificationManager.queueDataStreamNotification()`
       - Determines priority (high/normal)
       - Broadcasts to Socket.IO clients
     - **MQTT Publishing**:
       - Publishes to MQTT via `mqttPublisher.publishDataStream()`
       - Topic: `devices/{deviceUuid}/datastream`
     - **CoAP Observer Notification**:
       - Notifies CoAP observers via `coapPublisher.notifyObservers()`
       - Sends state change event to subscribed clients
     - **Rule Chain Trigger**:
       - Triggers rule engine via `ruleChainService.trigger()`
       - Evaluates rules and executes actions

### 15. **Response to CoAP Client**
   - **File**: `src/services/coapService.js`
   - **Method**: `_handleRequest(req, res)`
   - **Location**: Line 119-120
   - **Actions**:
     - Sets CoAP response code: `2.04` (Changed)
     - Sends JSON response:
       ```json
       {
         "ok": true,
         "result": {
           "status": "success",
           "data": {
             "message": "Processed 5 data stream(s)",
             "results": [/* array of created data streams */]
           }
         }
       }
       ```

## Error Handling

If any step fails:
1. Error is caught and logged
2. Error response is created via `CommonAdapter.createErrorResponse()`
3. CoAP response code set to:
   - `4.00` (Bad Request) - Invalid payload
   - `5.00` (Internal Server Error) - Server error
4. Error message sent to client

## Key Files Reference

| Component | File | Key Methods |
|-----------|------|-------------|
| **CoAP Server** | `src/services/coapService.js` | `initialize()`, `_handleRequest()` |
| **CoAP Adapter** | `src/adapters/coapAdapter.js` | `normalizeMessage()`, `validateMessage()`, `extractDeviceUuid()` |
| **Common Adapter** | `src/adapters/commonAdapter.js` | `validateMessage()`, `transformMessage()` |
| **Message Router** | `src/services/messageRouter.js` | `route()`, `getMessageType()`, `handleDataStream()`, `authenticateDevice()` |
| **Data Stream Controller** | `src/controllers/dataStreamController.js` | `createDataStreamWithToken()` |
| **Data Stream Service** | `src/services/dataStreamService.js` | `createDataStream()` |
| **Notification Manager** | `src/utils/notificationManager.js` | `queueDataStreamNotification()` |
| **MQTT Publisher** | `src/services/mqttPublisherService.js` | `publishDataStream()` |
| **CoAP Publisher** | `src/services/coapPublisherService.js` | `notifyObservers()` |
| **Rule Chain Service** | `src/services/ruleChainService.js` | `trigger()` |

## Flow Diagram Summary

```
CoAP Client
    ↓ POST /datastreams
CoAP Server (coapService.js)
    ↓ normalizeMessage()
CoAP Adapter (coapAdapter.js)
    ↓ route()
Message Router (messageRouter.js)
    ↓ validateMessage()
Common Adapter (commonAdapter.js)
    ↓ transformMessage()
Common Adapter (commonAdapter.js)
    ↓ getMessageType() → 'dataStream'
Message Router (messageRouter.js)
    ↓ handleDataStream()
Message Router (messageRouter.js)
    ↓ extractDeviceUuid() → from payload
Message Router (messageRouter.js)
    ↓ authenticateDevice()
Message Router (messageRouter.js)
    ↓ createDataStreamWithToken()
Data Stream Controller (dataStreamController.js)
    ↓ DataStream.create()
Database (Sequelize)
    ↓ Response (201 Created)
Data Stream Controller (dataStreamController.js)
    ↓ process.nextTick() [Async]
    ├─→ Socket.IO Notification
    ├─→ MQTT Publish
    ├─→ CoAP Observer Notify
    └─→ Rule Chain Trigger
    ↓ Response (2.04 Changed)
CoAP Client
```

## Notes

1. **Protocol Agnostic**: The message router handles MQTT, HTTP, and CoAP uniformly after normalization
2. **Batch Processing**: Multiple data streams in one request are processed sequentially
3. **Asynchronous Notifications**: Socket.IO, MQTT, and CoAP notifications happen after response is sent
4. **Token Authentication**: Device authentication happens via token in payload, not HTTP headers
5. **Device UUID Extraction**: For CoAP, device UUID is extracted from payload, not path (unlike MQTT which uses topic)

