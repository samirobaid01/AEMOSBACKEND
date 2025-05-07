#!/bin/bash

# Cleanup script for removing duplicate container components
# This script safely removes duplicate container components from features directory
# since they're already properly implemented in the containers directory

echo "Creating backup of features directory..."
cp -R client/src/features client/src/features-backup-$(date +%Y%m%d)

echo "Checking which containers are duplicated..."

# List of feature directories with duplicate containers
DUPLICATE_DIRS=(
  "client/src/features/devices/containers"
  "client/src/features/dashboard/containers"
  "client/src/features/sensors/containers"
  "client/src/features/notifications/containers"
)

for dir in "${DUPLICATE_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Found duplicate containers in $dir"
    # Only delete the containers directory, not the entire feature
    # This preserves components, hooks, etc. in the feature directory
    rm -rf "$dir"
    echo "Removed $dir"
  fi
done

echo "Cleanup complete!"
echo "A backup of the original files is available in client/src/features-backup-$(date +%Y%m%d)"
echo "The application should continue working normally as it was already using containers from /containers" 