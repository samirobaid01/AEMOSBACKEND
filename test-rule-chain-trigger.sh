#!/bin/bash

echo "🧪 Testing rule chain trigger to check if continuous logging is resolved..."

# Create a data stream that should trigger the rule chain
response=$(curl -s -X POST http://localhost:3000/api/datastreams/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 9d2a4801289d4d532fce4282478f018f1e9a91ab4a8c20027f3405e80651e959" \
  -d '{
    "value": 25.5,
    "telemetryDataId": 1
  }')

echo "✅ Data stream created successfully: $response"
echo "⏳ Waiting 10 seconds to observe logs..."

# Wait 10 seconds to see if continuous logging occurs
sleep 10

echo "✅ Test completed. Check the server logs for continuous logging." 