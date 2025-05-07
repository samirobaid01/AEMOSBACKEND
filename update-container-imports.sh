#!/bin/bash

# Script to update container imports to use components from new locations
# This script updates imports in container components to point to the new component locations

echo "Updating container imports..."

# Fix NotificationCenterContainer.tsx
if [ -f client/src/containers/notifications/NotificationCenterContainer.tsx ]; then
  echo "Updating imports in NotificationCenterContainer.tsx..."
  sed -i '' 's|import NotificationCenterView from "../../features/notifications/components/NotificationCenterView";|import NotificationCenterView from "../../components/notifications/NotificationCenterView";|g' client/src/containers/notifications/NotificationCenterContainer.tsx
fi

# Fix DeviceListContainer.tsx
if [ -f client/src/containers/devices/DeviceListContainer.tsx ]; then
  echo "Updating imports in DeviceListContainer.tsx..."
  # If it has imports from features, update them
  grep -q "from \"../../features/" client/src/containers/devices/DeviceListContainer.tsx
  if [ $? -eq 0 ]; then
    sed -i '' 's|from "../../features/devices/components/|from "../../components/devices/|g' client/src/containers/devices/DeviceListContainer.tsx
  fi
fi

# Fix DeviceDetailContainer.tsx
if [ -f client/src/containers/devices/DeviceDetailContainer.tsx ]; then
  echo "Updating imports in DeviceDetailContainer.tsx..."
  # If it has imports from features, update them
  grep -q "from \"../../features/" client/src/containers/devices/DeviceDetailContainer.tsx
  if [ $? -eq 0 ]; then
    sed -i '' 's|from "../../features/devices/components/|from "../../components/devices/|g' client/src/containers/devices/DeviceDetailContainer.tsx
  fi
fi

# Fix SensorListContainer.tsx
if [ -f client/src/containers/sensors/SensorListContainer.tsx ]; then
  echo "Updating imports in SensorListContainer.tsx..."
  # If it has imports from features, update them
  grep -q "from \"../../features/" client/src/containers/sensors/SensorListContainer.tsx
  if [ $? -eq 0 ]; then
    sed -i '' 's|from "../../features/sensors/components/|from "../../components/sensors/|g' client/src/containers/sensors/SensorListContainer.tsx
  fi
fi

# Fix SensorDetailContainer.tsx
if [ -f client/src/containers/sensors/SensorDetailContainer.tsx ]; then
  echo "Updating imports in SensorDetailContainer.tsx..."
  # If it has imports from features, update them
  grep -q "from \"../../features/" client/src/containers/sensors/SensorDetailContainer.tsx
  if [ $? -eq 0 ]; then
    sed -i '' 's|from "../../features/sensors/components/|from "../../components/sensors/|g' client/src/containers/sensors/SensorDetailContainer.tsx
  fi
fi

# Fix SettingsContainer.tsx
if [ -f client/src/containers/settings/SettingsContainer.tsx ]; then
  echo "Updating imports in SettingsContainer.tsx..."
  # If it has imports from features, update them
  grep -q "from \"../../features/" client/src/containers/settings/SettingsContainer.tsx
  if [ $? -eq 0 ]; then
    sed -i '' 's|from "../../features/settings/components/|from "../../components/settings/|g' client/src/containers/settings/SettingsContainer.tsx
  fi
fi

echo "Container imports updated!"
echo "Please verify the import paths manually in the container files." 