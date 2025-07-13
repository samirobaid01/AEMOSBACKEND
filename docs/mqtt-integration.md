# MQTT Integration Documentation

## Overview

The AEMOS Backend now supports MQTT (Message Queuing Telemetry Transport) protocol alongside the existing HTTP and Socket.io protocols. This enables IoT devices to communicate with the backend using a lightweight, efficient messaging protocol.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP Clients  │    │  MQTT Clients   │    │ Socket.io Clients│
│   (Web/Mobile)  │    │   (IoT Devices) │    │   (Real-time)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │    AEMOS Backend API      │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │   Protocol Layer    │  │
                    │  │                     │  │
                    │  │ ┌─────────┐ ┌──────┐│  │
                    │  │ │ HTTP    │ │ MQTT ││  │
                    │  │ │ Server  │ │Server││  │
                    │  │ └─────────┘ └──────┘│  │
                    │  └─────────────────────┘  │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │   Adapter Layer     │  │
                    │  │                     │  │
                    │  │ ┌─────────┐ ┌──────┐│  │
                    │  │ │ HTTP    │ │ MQTT ││  │
                    │  │ │ Adapter │ │Adapter││  │
                    │  │ └─────────┘ └──────┘│  │
                    │  └─────────────────────┘  │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │   Business Logic    │  │
                    │  │   (Controllers)     │  │
                    │  └─────────────────────┘  │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │   Data Layer        │  │
                    │  │   (Services/Models) │  │
                    │  └─────────────────────┘  │
                    └───────────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Database             │
                    │   (MySQL + Sequelize)     │
                    └───────────────────────────┘
```

## Features

- **Multi-Protocol Support**: HTTP, MQTT, and Socket.io protocols
- **Device Authentication**: Token-based authentication for IoT devices
- **Topic-Based Routing**: Automatic message routing based on MQTT topics
- **QoS Support**: Quality of Service levels (0, 1, 2)
- **Real-time Updates**: Socket.io integration for real-time notifications
- **Message Validation**: Comprehensive message validation and sanitization
- **Error Handling**: Robust error handling and logging

## Configuration

### Environment Variables

Add the following environment variables to enable MQTT:

```bash
# MQTT Configuration
ENABLE_MQTT=true
MQTT_PORT=1883
MQTT_HOST=0.0.0.0
MQTT_AUTH_ENABLED=true
MQTT_TOKEN_AUTH=true
MQTT_DEFAULT_QOS=1
MQTT_DATASTREAM_QOS=1
```

### Configuration File

The MQTT configuration is defined in `src/config/features.js`:

```javascript
mqtt: {
  enabled: process.env.ENABLE_MQTT === 'true',
  port: parseInt(process.env.MQTT_PORT || 1883, 10),
  host: process.env.MQTT_HOST || '0.0.0.0',
  authentication: {
    enabled: process.env.MQTT_AUTH_ENABLED !== 'false',
    tokenBased: process.env.MQTT_TOKEN_AUTH === 'true'
  },
  topics: {
    dataStream: 'devices/+/datastream',
    deviceStatus: 'devices/+/status',
    commands: 'devices/+/commands'
  },
  qos: {
    default: parseInt(process.env.MQTT_DEFAULT_QOS || 1, 10),
    dataStream: parseInt(process.env.MQTT_DATASTREAM_QOS || 1, 10)
  }
}
```

## Topic Structure

MQTT topics follow a hierarchical structure:

```
devices/{deviceUuid}/datastream     # Data stream publishing
devices/{deviceUuid}/status         # Device status updates
devices/{deviceUuid}/commands       # Commands to devices
organizations/{orgId}/broadcast     # Organization-wide messages
```

### Topic Examples

- `devices/sensor-001/datastream` - Data stream from sensor-001
- `devices/thermostat-002/status` - Status update from thermostat-002
- `devices/light-003/commands` - Commands for light-003
- `organizations/org-123/broadcast` - Broadcast message for organization 123

## Authentication

### Device Token Authentication

MQTT clients authenticate using device tokens:

1. **Username**: Device UUID
2. **Password**: Device token

Example connection:
```javascript
const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'device-uuid-123',
  password: 'device-token-456',
  clientId: 'my-device-client'
});
```

### Token Management

Device tokens are managed through the existing device token system:

- Tokens are created via HTTP API
- Tokens have expiration dates
- Tokens are validated on each MQTT connection
- Expired tokens are automatically rejected

## Message Format

### Data Stream Messages

```json
{
  "value": "25.6",
  "telemetryDataId": 1,
  "token": "device-token-123",
  "urgent": false,
  "thresholds": {
    "min": 20,
    "max": 30
  }
}
```

### Device Status Messages

```json
{
  "status": "online",
  "timestamp": "2023-12-01T10:30:00Z",
  "token": "device-token-123",
  "metadata": {
    "battery": 85,
    "signal": -45
  }
}
```

### Command Messages

```json
{
  "command": "restart",
  "parameters": {
    "delay": 5,
    "reason": "maintenance"
  },
  "token": "device-token-123"
}
```

## API Integration

### Message Flow

1. **MQTT Client** publishes message to topic
2. **MQTT Server** receives and authenticates message
3. **MQTT Adapter** normalizes message format
4. **Message Router** routes to appropriate handler
5. **Business Logic** processes message (same as HTTP)
6. **Database** stores data
7. **Socket.io** broadcasts real-time updates

### Business Logic Reuse

The same business logic handles both HTTP and MQTT requests:

- Data stream creation
- Device status updates
- Command processing
- Authentication and authorization
- Data validation
- Real-time notifications

## Testing

### Unit Tests

Run MQTT unit tests:

```bash
npm run test:unit
```

Test files:
- `tests/unit/mqttAdapter.test.js`
- `tests/unit/commonAdapter.test.js`
- `tests/unit/messageRouter.test.js`
- `tests/unit/mqttService.test.js`

### Integration Tests

Run MQTT integration tests:

```bash
npm run test:integration
```

Test file: `tests/integration/mqtt.test.js`

### Manual Testing

Use the MQTT client test page: `public/mqttClient.html`

1. Start the server with MQTT enabled
2. Open `http://localhost:3000/mqttClient.html`
3. Configure connection settings
4. Test publishing and subscribing to topics

## Usage Examples

### Node.js MQTT Client

```javascript
const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'device-uuid-123',
  password: 'device-token-456',
  clientId: 'my-device'
});

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Publish data stream
  const dataStream = {
    value: '25.6',
    telemetryDataId: 1,
    token: 'device-token-456'
  };
  
  client.publish('devices/device-uuid-123/datastream', JSON.stringify(dataStream));
});

client.on('message', (topic, message) => {
  console.log(`Received message on ${topic}:`, message.toString());
});
```

### Python MQTT Client

```python
import paho.mqtt.client as mqtt
import json

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    
    # Publish data stream
    data_stream = {
        "value": "25.6",
        "telemetryDataId": 1,
        "token": "device-token-456"
    }
    
    client.publish('devices/device-uuid-123/datastream', json.dumps(data_stream))

def on_message(client, userdata, msg):
    print(f"Received message on {msg.topic}: {msg.payload.decode()}")

client = mqtt.Client()
client.username_pw_set('device-uuid-123', 'device-token-456')
client.on_connect = on_connect
client.on_message = on_message

client.connect('localhost', 1883, 60)
client.loop_forever()
```

### JavaScript MQTT Client (Browser)

```javascript
// Using MQTT.js in browser
const client = mqtt.connect('ws://localhost:9001', {
  username: 'device-uuid-123',
  password: 'device-token-456',
  clientId: 'browser-client'
});

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  const dataStream = {
    value: '25.6',
    telemetryDataId: 1,
    token: 'device-token-456'
  };
  
  client.publish('devices/device-uuid-123/datastream', JSON.stringify(dataStream));
});

client.on('message', (topic, message) => {
  console.log(`Received message on ${topic}:`, message.toString());
});
```

## Error Handling

### Common Errors

1. **Authentication Failed**
   - Invalid device UUID or token
   - Expired token
   - Missing credentials

2. **Invalid Topic Format**
   - Malformed topic structure
   - Unauthorized topic access

3. **Message Validation Failed**
   - Invalid JSON payload
   - Missing required fields
   - Invalid data types

4. **Connection Errors**
   - Network issues
   - Server unavailable
   - Port conflicts

### Error Responses

MQTT errors are logged and handled gracefully:

```javascript
// Error logging
logger.error(`MQTT authentication failed for client: ${clientId}`);
logger.warn(`Invalid MQTT message from ${clientId}: ${topic}`);
logger.error(`MQTT server error: ${error.message}`);
```

## Performance Considerations

### Scalability

- MQTT server handles multiple concurrent connections
- Message processing is asynchronous
- Database operations are optimized
- Real-time updates use efficient Socket.io broadcasting

### Monitoring

Monitor MQTT performance using server statistics:

```javascript
const stats = mqttService.getStats();
console.log(stats);
// Output:
// {
//   isInitialized: true,
//   connectedClients: 5,
//   authenticatedClients: 4,
//   port: 1883,
//   host: '0.0.0.0'
// }
```

## Security

### Authentication

- Token-based authentication
- Token expiration
- Device-specific tokens
- Organization-based access control

### Message Validation

- Topic format validation
- Payload sanitization
- JSON schema validation
- SQL injection prevention

### Network Security

- TLS/SSL support (configure in production)
- Firewall rules
- Rate limiting
- Connection monitoring

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if MQTT server is running
   - Verify port configuration
   - Check firewall settings

2. **Authentication Failed**
   - Verify device UUID and token
   - Check token expiration
   - Ensure device is active

3. **Messages Not Processed**
   - Check topic format
   - Verify message payload
   - Check server logs

4. **Performance Issues**
   - Monitor connection count
   - Check database performance
   - Review message processing logs

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
```

### Health Check

Check MQTT server health:

```bash
curl http://localhost:3000/api/v1/health
```

## Future Enhancements

### Planned Features

1. **TLS/SSL Support**
   - Encrypted MQTT connections
   - Certificate-based authentication

2. **Message Persistence**
   - Offline message buffering
   - Message replay capabilities

3. **Advanced Routing**
   - Custom topic patterns
   - Message filtering
   - Load balancing

4. **Monitoring Dashboard**
   - Real-time connection monitoring
   - Message statistics
   - Performance metrics

### Protocol Extensions

- CoAP support
- WebSocket fallback
- HTTP/2 integration
- gRPC support

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review server logs
3. Run integration tests
4. Create an issue in the repository

## Contributing

To contribute to MQTT functionality:

1. Follow the existing code style
2. Add unit tests for new features
3. Update documentation
4. Test with multiple MQTT clients
5. Submit a pull request 