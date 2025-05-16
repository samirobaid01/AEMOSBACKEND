# Device Token Authentication

This document describes the lightweight authentication system specifically designed for IoT devices to interact with the AEMOS Backend.

## Overview

The device token authentication system provides a more efficient way for IoT devices to authenticate with the API compared to the regular user authentication. It's optimized for:

- High-frequency requests
- Low latency
- Reduced database load
- Simple implementation on IoT devices

## Token Management

### Creating a Token

Administrators can create tokens for specific sensors through the management API:

```
POST /api/v1/device-tokens

{
  "sensorId": 123,
  "expiresAt": "2023-12-31T23:59:59Z" // Optional
}
```

This will generate a secure random token associated with the specified sensor. The token can be used for authentication in subsequent API calls from the IoT device.

### Viewing Tokens

Administrators can view all tokens for a specific sensor:

```
GET /api/v1/device-tokens?sensorId=123
```

### Revoking Tokens

Tokens can be revoked if they're compromised or no longer needed:

```
DELETE /api/v1/device-tokens/456
```

## Using Tokens for Authentication

IoT devices should include the token in the Authorization header of their requests:

```
Authorization: Bearer <token>
```

## Endpoints Supporting Token Authentication

The following endpoints can be accessed using device token authentication:

### Data Stream Submission

```
POST /api/v1/data-streams/token

{
  "value": "23.5",
  "telemetryDataId": 789
}
```

This endpoint allows IoT devices to submit data using token authentication. The system automatically associates the data with the correct sensor based on the token.

## Implementation Details

### Token Validation

Token validation is optimized with:
1. In-memory caching to reduce database lookups
2. Timeout protection to prevent blocking on database operations
3. Background updates for usage statistics

### Security Considerations

- Tokens should be treated as secrets and transmitted securely
- Tokens have optional expiration dates
- Tokens can be revoked at any time
- Each token is associated with a specific sensor and can only access resources related to that sensor

## Performance Benefits

The device token authentication system provides several performance advantages:

1. **Reduced Database Queries**: In-memory caching reduces the number of database queries for token validation
2. **Lightweight Validation**: The validation process is much simpler than full user authentication
3. **Parallel Processing**: The authentication middleware is optimized for concurrent requests
4. **Timeout Protection**: All database operations have timeouts to prevent hanging requests

## Troubleshooting

### Common Error Codes

- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Token doesn't have permission for the requested action
- **404 Not Found**: Resource not found or not associated with the sensor
- **503 Service Unavailable**: Authentication service timeout 