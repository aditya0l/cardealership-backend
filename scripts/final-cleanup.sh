#!/bin/bash

# Final cleanup - Move non-essential docs to archive

echo "🧹 Final cleanup - Organizing remaining files..."

# Keep only these essential files in root
KEEP_FILES=(
  "README.md"
  "PHASE_2_COMPLETE_SUMMARY.md"
  "PHASE_2_VERIFICATION_REPORT.md"
  "EXPO_APP_PHASE2_UPDATES.md"
  "DASHBOARD_PHASE2_UPDATES.md"
  "BACKEND_COMPLETION_STATUS.md"
  "DESIGN.md"
  "SETUP.md"
  "NETWORK-SETUP.md"
  "FIREBASE-SETUP.md"
  "HOW_EVERYTHING_WORKS.md"
  "COMPLETE_SYSTEM_FUNCTIONALITY.md"
  "COMPLETE_SYSTEM_SUMMARY.md"
)

mkdir -p docs/archive/old-docs

# Move all MD files except keep files
for file in *.md; do
  if [ -f "$file" ]; then
    KEEP=false
    for keep_file in "${KEEP_FILES[@]}"; do
      if [ "$file" == "$keep_file" ]; then
        KEEP=true
        break
      fi
    done
    if [ "$KEEP" == false ]; then
      mv "$file" docs/archive/old-docs/ 2>/dev/null
    fi
  fi
done

echo "✅ Cleanup complete!"
echo "📊 Root MD files: $(ls -1 *.md 2>/dev/null | wc -l | tr -d ' ')"
echo "📁 Archived: $(find docs/archive -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
