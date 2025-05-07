#!/bin/bash

# Master script to reorganize the React codebase
# This script coordinates all steps of the reorganization process

# Set variables
BACKUP_DATE=$(date +%Y%m%d)
BACKUP_DIR="client/src/features-backup-$BACKUP_DATE"

echo "========================================================"
echo "  AEMOS Frontend Codebase Reorganization"
echo "========================================================"
echo "This script will:"
echo "1. Create a backup of the features directory"
echo "2. Move components from features to their proper locations"
echo "3. Update import paths in moved files"
echo "4. Update container components to use the new locations"
echo "5. Clean up duplicate container components"
echo ""
echo "A backup will be created at: $BACKUP_DIR"
echo "========================================================"
echo ""

read -p "Do you want to proceed? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Operation cancelled."
  exit 1
fi

echo ""
echo "Step 1: Creating backup of features directory..."
cp -R client/src/features "$BACKUP_DIR"
echo "Backup created at $BACKUP_DIR"
echo ""

echo "Step 2: Creating necessary directories..."
mkdir -p client/src/components/auth
mkdir -p client/src/components/notifications
mkdir -p client/src/components/settings
mkdir -p client/src/pages
echo ""

echo "Step 3: Moving authentication components to pages..."
if [ -f client/src/features/auth/Login.tsx ]; then
  cp client/src/features/auth/Login.tsx client/src/pages/Login.tsx
  echo "Moved Login.tsx to pages/"
fi

if [ -f client/src/features/auth/Register.tsx ]; then
  cp client/src/features/auth/Register.tsx client/src/pages/Register.tsx
  echo "Moved Register.tsx to pages/"
fi
echo ""

echo "Step 4: Moving feature components to component directories..."
# Move device components
if [ -d client/src/features/devices/components ]; then
  mkdir -p client/src/components/devices
  cp -R client/src/features/devices/components/* client/src/components/devices/
  echo "Moved device components to components/devices/"
fi

# Move sensor components
if [ -d client/src/features/sensors/components ]; then
  mkdir -p client/src/components/sensors
  cp -R client/src/features/sensors/components/* client/src/components/sensors/
  echo "Moved sensor components to components/sensors/"
fi

# Move notification components
if [ -d client/src/features/notifications/components ]; then
  mkdir -p client/src/components/notifications
  cp -R client/src/features/notifications/components/* client/src/components/notifications/
  echo "Moved notification components to components/notifications/"
fi

# Move dashboard components
if [ -d client/src/features/dashboard/components ]; then
  mkdir -p client/src/components/dashboard
  cp -R client/src/features/dashboard/components/* client/src/components/dashboard/
  echo "Moved dashboard components to components/dashboard/"
fi

# Move settings components
if [ -d client/src/features/settings/components ]; then
  mkdir -p client/src/components/settings
  cp -R client/src/features/settings/components/* client/src/components/settings/
  echo "Moved settings components to components/settings/"
fi
echo ""

echo "Step 5: Updating App.tsx imports..."
sed -i '' 's|import Login from '"'"'./features/auth/Login'"'"';|import Login from '"'"'./pages/Login'"'"';|g' client/src/App.tsx
sed -i '' 's|import Register from '"'"'./features/auth/Register'"'"';|import Register from '"'"'./pages/Register'"'"';|g' client/src/App.tsx
echo ""

echo "Step 6: Fixing import paths in moved files..."
# Fix Login.tsx and Register.tsx imports
if [ -f client/src/pages/Login.tsx ]; then
  echo "Fixing imports in Login.tsx..."
  sed -i '' 's|from "../../state/|from "../state/|g' client/src/pages/Login.tsx
  sed -i '' 's|from "../state/hooks"|from "../state/hooks"|g' client/src/pages/Login.tsx
fi

if [ -f client/src/pages/Register.tsx ]; then
  echo "Fixing imports in Register.tsx..."
  sed -i '' 's|from "../../state/|from "../state/|g' client/src/pages/Register.tsx
  sed -i '' 's|from "../state/hooks"|from "../state/hooks"|g' client/src/pages/Register.tsx
fi

# Fix component imports
for dir in devices sensors notifications dashboard settings; do
  if [ -d "client/src/components/$dir" ]; then
    for file in "client/src/components/$dir"/*.tsx; do
      if [ -f "$file" ]; then
        echo "Fixing imports in $(basename "$file")..."
        sed -i '' 's|from "../components/|from "./|g' "$file"
        sed -i '' 's|from "../../|from "../|g' "$file"
      fi
    done
  fi
done
echo ""

echo "Step 7: Updating container imports..."
# Fix containers to import from new locations
for container in notifications/NotificationCenterContainer devices/DeviceListContainer devices/DeviceDetailContainer sensors/SensorListContainer sensors/SensorDetailContainer settings/SettingsContainer; do
  if [ -f "client/src/containers/$container.tsx" ]; then
    echo "Updating imports in $(basename "$container.tsx")..."
    dir=$(echo $container | cut -d'/' -f1)
    sed -i '' "s|from \"../../features/$dir/components/|from \"../../components/$dir/|g" "client/src/containers/$container.tsx"
  fi
done
echo ""

echo "Step 8: Removing duplicate container components..."
# List of feature directories with duplicate containers
DUPLICATE_DIRS=(
  "client/src/features/devices/containers"
  "client/src/features/dashboard/containers"
  "client/src/features/sensors/containers"
  "client/src/features/notifications/containers"
  "client/src/features/settings/containers"
)

for dir in "${DUPLICATE_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Found duplicate containers in $dir"
    rm -rf "$dir"
    echo "Removed $dir"
  fi
done
echo ""

echo "========================================================"
echo "  REORGANIZATION COMPLETE"
echo "========================================================"
echo "The codebase has been reorganized with a more consistent structure."
echo ""
echo "To verify the changes:"
echo "1. Check App.tsx imports"
echo "2. Check container component imports"
echo "3. Test the application to make sure everything works"
echo ""
echo "If everything is working correctly, you can remove the features directory:"
echo "rm -rf client/src/features"
echo ""
echo "Or keep it for reference until you're ready to remove it."
echo "A backup is available at: $BACKUP_DIR"
echo "========================================================" 