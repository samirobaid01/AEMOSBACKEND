#!/bin/bash

# Script to fix import paths in moved files
# This script updates import paths in components that were moved from features

echo "Fixing import paths in moved files..."

# Fix Login.tsx and Register.tsx imports
if [ -f client/src/pages/Login.tsx ]; then
  echo "Fixing imports in Login.tsx..."
  # Update state imports
  sed -i '' 's|from "../state/|from "../state/|g' client/src/pages/Login.tsx
  # Update relative paths for other imports
  sed -i '' 's|from "../|from "./|g' client/src/pages/Login.tsx
fi

if [ -f client/src/pages/Register.tsx ]; then
  echo "Fixing imports in Register.tsx..."
  # Update state imports
  sed -i '' 's|from "../state/|from "../state/|g' client/src/pages/Register.tsx
  # Update relative paths for other imports
  sed -i '' 's|from "../|from "./|g' client/src/pages/Register.tsx
fi

# Fix device component imports
for file in client/src/components/devices/*.tsx; do
  echo "Fixing imports in $file..."
  # Update imports from features to components
  sed -i '' 's|from "../components/|from "./|g' "$file"
  # Fix any relative paths
  sed -i '' 's|from "../../|from "../|g' "$file"
done

# Fix sensor component imports
for file in client/src/components/sensors/*.tsx; do
  echo "Fixing imports in $file..."
  # Update imports from features to components
  sed -i '' 's|from "../components/|from "./|g' "$file"
  # Fix any relative paths
  sed -i '' 's|from "../../|from "../|g' "$file"
done

# Fix notification component imports
for file in client/src/components/notifications/*.tsx; do
  echo "Fixing imports in $file..."
  # Update imports from features to components
  sed -i '' 's|from "../components/|from "./|g' "$file"
  # Fix any relative paths
  sed -i '' 's|from "../../|from "../|g' "$file"
done

# Fix dashboard component imports
for file in client/src/components/dashboard/*.tsx; do
  echo "Fixing imports in $file..."
  # Update imports from features to components
  sed -i '' 's|from "../components/|from "./|g' "$file"
  # Fix any relative paths
  sed -i '' 's|from "../../|from "../|g' "$file"
done

# Fix settings component imports
for file in client/src/components/settings/*.tsx; do
  echo "Fixing imports in $file..."
  # Update imports from features to components
  sed -i '' 's|from "../components/|from "./|g' "$file"
  # Fix any relative paths
  sed -i '' 's|from "../../|from "../|g' "$file"
done

echo "Import paths fixed!"
echo "Please verify the import paths manually in the moved files and containers using them." 