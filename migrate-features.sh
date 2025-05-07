#!/bin/bash

# Migration script for reorganizing features directory
# This script moves all necessary components from features to their proper locations

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_DIR="client/src/features-backup-$BACKUP_DATE"

echo "Creating backup of features directory to $BACKUP_DIR..."
cp -R client/src/features "$BACKUP_DIR"

# Create necessary directories if they don't exist
mkdir -p client/src/components/auth
mkdir -p client/src/components/notifications
mkdir -p client/src/components/settings
mkdir -p client/src/pages

# Step 1: Move auth components to components/auth or pages directory
echo "Moving authentication components..."
if [ -f client/src/features/auth/Login.tsx ]; then
  cp client/src/features/auth/Login.tsx client/src/pages/Login.tsx
  echo "Moved Login.tsx to pages/"
fi

if [ -f client/src/features/auth/Register.tsx ]; then
  cp client/src/features/auth/Register.tsx client/src/pages/Register.tsx
  echo "Moved Register.tsx to pages/"
fi

# Step 2: Move device components
echo "Moving device components..."
if [ -d client/src/features/devices/components ]; then
  cp -R client/src/features/devices/components/* client/src/components/devices/
  echo "Moved device components to components/devices/"
fi

# Step 3: Move sensor components
echo "Moving sensor components..."
if [ -d client/src/features/sensors/components ]; then
  cp -R client/src/features/sensors/components/* client/src/components/sensors/
  echo "Moved sensor components to components/sensors/"
fi

# Step 4: Move notification components
echo "Moving notification components..."
if [ -d client/src/features/notifications/components ]; then
  cp -R client/src/features/notifications/components/* client/src/components/notifications/
  echo "Moved notification components to components/notifications/"
fi

# Step 5: Move dashboard components
echo "Moving dashboard components..."
if [ -d client/src/features/dashboard/components ]; then
  cp -R client/src/features/dashboard/components/* client/src/components/dashboard/
  echo "Moved dashboard components to components/dashboard/"
fi

# Step 6: Move settings components
echo "Moving settings components..."
if [ -d client/src/features/settings/components ]; then
  cp -R client/src/features/settings/components/* client/src/components/settings/
  echo "Moved settings components to components/settings/"
fi

# Now update App.tsx to import Login and Register from pages instead of features
echo "Updating App.tsx imports..."
sed -i '' 's|import Login from '"'"'./features/auth/Login'"'"';|import Login from '"'"'./pages/Login'"'"';|g' client/src/App.tsx
sed -i '' 's|import Register from '"'"'./features/auth/Register'"'"';|import Register from '"'"'./pages/Register'"'"';|g' client/src/App.tsx

echo "Migration complete!"
echo "A backup of all original files is available in $BACKUP_DIR"
echo ""
echo "IMPORTANT: You need to check and fix any import paths in the moved files."
echo "After verifying the app works, you can remove the features directory with:"
echo "rm -rf client/src/features" 