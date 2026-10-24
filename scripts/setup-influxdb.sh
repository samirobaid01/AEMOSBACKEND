#!/usr/bin/env bash
# InfluxDB v2 setup for AEMOS time-series data
#
# Prerequisites:
#   - influx CLI installed and authenticated, OR
#   - INFLUX_TOKEN, INFLUX_URL, INFLUX_ORG set in environment
#
# Usage:
#   source .env          # load INFLUX_* vars
#   bash scripts/setup-influxdb.sh
#
# All variables fall back to defaults matching .env.example.

set -euo pipefail

INFLUX_URL="${INFLUX_URL:-http://localhost:8086}"
INFLUX_TOKEN="${INFLUX_TOKEN:-}"
INFLUX_ORG="${INFLUX_ORG:-aemos}"
INFLUX_BUCKET="${INFLUX_BUCKET:-datastream}"
RETENTION="${INFLUX_RETENTION:-0}"   # 0 = infinite; use e.g. "2160h" for 90 days

if [[ -z "$INFLUX_TOKEN" ]]; then
  echo "ERROR: INFLUX_TOKEN is not set. Export it or source your .env file first." >&2
  exit 1
fi

echo "==> Connecting to InfluxDB at $INFLUX_URL"

# Check InfluxDB health
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$INFLUX_URL/health")
if [[ "$STATUS" != "200" ]]; then
  echo "ERROR: InfluxDB health check failed (HTTP $STATUS). Is the server running?" >&2
  exit 1
fi
echo "    Health: OK"

# Create the organisation if it does not exist
echo "==> Ensuring organisation '$INFLUX_ORG' exists..."
influx org create \
  --host "$INFLUX_URL" \
  --token "$INFLUX_TOKEN" \
  --name "$INFLUX_ORG" 2>/dev/null \
  && echo "    Created org '$INFLUX_ORG'" \
  || echo "    Org '$INFLUX_ORG' already exists (skipping)"

# Create the bucket
echo "==> Ensuring bucket '$INFLUX_BUCKET' exists in org '$INFLUX_ORG'..."
if [[ "$RETENTION" == "0" ]]; then
  RETENTION_FLAG=""
else
  RETENTION_FLAG="--retention $RETENTION"
fi

influx bucket create \
  --host "$INFLUX_URL" \
  --token "$INFLUX_TOKEN" \
  --org "$INFLUX_ORG" \
  --name "$INFLUX_BUCKET" \
  $RETENTION_FLAG 2>/dev/null \
  && echo "    Created bucket '$INFLUX_BUCKET' (retention: ${RETENTION:-infinite})" \
  || echo "    Bucket '$INFLUX_BUCKET' already exists (skipping)"

echo ""
echo "Done. InfluxDB is ready for AEMOS."
echo ""
echo "Set these in your .env:"
echo "  TIMESERIES_BACKEND=influx"
echo "  INFLUX_URL=$INFLUX_URL"
echo "  INFLUX_TOKEN=<your-token>"
echo "  INFLUX_ORG=$INFLUX_ORG"
echo "  INFLUX_BUCKET=$INFLUX_BUCKET"
