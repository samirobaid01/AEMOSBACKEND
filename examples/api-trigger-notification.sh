#!/bin/bash

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
DEVICE_UUID="${DEVICE_UUID:-550e8400-e29b-41d4-a716-446655440000}"
JWT_TOKEN="${JWT_TOKEN:-}"

echo "🚀 AEMOS API - Trigger Device State Change"
echo "==========================================="
echo ""

if [ -z "$JWT_TOKEN" ]; then
  echo "⚠️  JWT_TOKEN not set. Login first:"
  echo ""
  echo "   LOGIN_RESPONSE=\$(curl -s -X POST $API_BASE_URL/auth/login \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"email\":\"admin@example.com\",\"password\":\"password123\"}')"
  echo ""
  echo "   export JWT_TOKEN=\$(echo \$LOGIN_RESPONSE | jq -r '.token')"
  echo ""
  exit 1
fi

echo "📡 API Base URL: $API_BASE_URL"
echo "🔑 Device UUID: $DEVICE_UUID"
echo "🎫 Token: ${JWT_TOKEN:0:20}..."
echo ""

TEMP_VALUE=$((15 + RANDOM % 20))

PAYLOAD=$(cat <<EOF
{
  "deviceUuid": "$DEVICE_UUID",
  "stateName": "temperature",
  "value": "$TEMP_VALUE",
  "initiatedBy": "user"
}
EOF
)

echo "📤 Sending state change request..."
echo "   State: temperature"
echo "   Value: $TEMP_VALUE°C"
echo ""

RESPONSE=$(curl -s -X POST "$API_BASE_URL/device-state-instances" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "$PAYLOAD")

echo "📨 Response:"
echo "$RESPONSE" | jq '.'
echo ""

if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "❌ Request failed"
  exit 1
else
  echo "✅ State change triggered successfully!"
  echo ""
  echo "🔔 Notifications should be sent via:"
  echo "   • Socket.IO (WebSocket)"
  echo "   • MQTT (topic: device/$DEVICE_UUID/state)"
  echo "   • CoAP (observers for /device/$DEVICE_UUID/observe)"
  echo ""
  echo "💡 Tip: Run the example clients to see these notifications:"
  echo "   node examples/mqtt-client-example.js"
  echo "   node examples/coap-client-example.js"
fi
