#!/bin/bash

# Documentation Cleanup Script
# Organizes 119+ markdown files into proper folders

echo "🧹 Starting documentation cleanup..."

# Create folders
mkdir -p docs/archive/old-fixes
mkdir -p docs/archive/old-deployment
mkdir -p docs/archive/old-integration
mkdir -p docs/phase2/reference

# Keep in root - Essential active docs
ESSENTIAL_FILES=(
  "README.md"
  "PHASE_2_COMPLETE_SUMMARY.md"
  "PHASE_2_VERIFICATION_REPORT.md"
  "EXPO_APP_PHASE2_UPDATES.md"
  "DASHBOARD_PHASE2_UPDATES.md"
  "BACKEND_COMPLETION_STATUS.md"
  "DESIGN.md"
  "SETUP.md"
  "NETWORK-SETUP.md"
)

# Move Phase 2 reference docs
echo "📦 Organizing Phase 2 documentation..."
mv PHASE_2_IMPLEMENTATION_COMPLETE.md docs/phase2/reference/ 2>/dev/null
mv PHASE_2_MISSING_FEATURES.md docs/phase2/reference/ 2>/dev/null
mv API_ENDPOINT_DOCUMENTATION.md docs/phase2/reference/ 2>/dev/null
mv API_QUICK_FIX_GUIDE.md docs/phase2/reference/ 2>/dev/null

# Move old fix docs
echo "📦 Archiving old fix documentation..."
mv *_FIX_*.md docs/archive/old-fixes/ 2>/dev/null
mv *FIX_*.md docs/archive/old-fixes/ 2>/dev/null
mv FIX_*.md docs/archive/old-fixes/ 2>/dev/null

# Move old deployment docs
echo "📦 Archiving old deployment documentation..."
mv *DEPLOYMENT*.md docs/archive/old-deployment/ 2>/dev/null
mv DEPLOYMENT*.md docs/archive/old-deployment/ 2>/dev/null

# Move old admin docs
echo "📦 Archiving old admin documentation..."
mv ADMIN*.md docs/archive/old-fixes/ 2>/dev/null
mv *ADMIN*.md docs/archive/old-fixes/ 2>/dev/null

# Move old complete docs (but keep Phase 2 ones)
echo "📦 Archiving old completion documentation..."
mv ALL_FEATURES_IMPLEMENTED.md docs/archive/old-integration/ 2>/dev/null
mv COMPLETE_*.md docs/archive/old-integration/ 2>/dev/null
mv *_COMPLETE_*.md docs/archive/old-integration/ 2>/dev/null
mv IMPLEMENTATION_COMPLETE.md docs/archive/old-integration/ 2>/dev/null

# Move old Expo/Dashboard guides (but keep Phase 2 ones)
echo "📦 Archiving old integration documentation..."
mv EXPO_APP_INTEGRATION*.md docs/archive/old-integration/ 2>/dev/null
mv EXPO_MULTI*.md docs/archive/old-integration/ 2>/dev/null
mv EXPO_QUICK*.md docs/archive/old-integration/ 2>/dev/null
mv DASHBOARD_COMPLETE*.md docs/archive/old-integration/ 2>/dev/null
mv DASHBOARD_QUICK*.md docs/archive/old-integration/ 2>/dev/null

# Move other old docs
echo "📦 Archiving miscellaneous old documentation..."
mv CLEANUP*.md docs/archive/old-integration/ 2>/dev/null
mv MULTI_TENANT*.md docs/archive/old-integration/ 2>/dev/null
mv INTEGRATION*.md docs/archive/old-integration/ 2>/dev/null
mv WHAT_TO_DO_NOW.md docs/archive/old-integration/ 2>/dev/null
mv START_HERE*.md docs/archive/old-integration/ 2>/dev/null

# Delete temporary files
echo "🗑️  Deleting temporary files..."
rm -f *.backup 2>/dev/null
rm -f temp.ts 2>/dev/null
rm -f CLEANUP_SUMMARY.txt 2>/dev/null
rm -f FINAL_CLEANUP_STATUS.txt 2>/dev/null
rm -f admin.controller.ts.backup 2>/dev/null
rm -f admin.routes.ts.backup 2>/dev/null

# Restore essential files if they were moved
echo "✅ Restoring essential files to root..."
for file in "${ESSENTIAL_FILES[@]}"; do
  if [ -f "docs/archive/"*"/$file" ]; then
    mv docs/archive/*/$file . 2>/dev/null
  fi
done

# Restore Phase 2 essential files
if [ -f "docs/phase2/reference/PHASE_2_COMPLETE_SUMMARY.md" ]; then
  mv docs/phase2/reference/PHASE_2_COMPLETE_SUMMARY.md . 2>/dev/null
fi
if [ -f "docs/phase2/reference/PHASE_2_VERIFICATION_REPORT.md" ]; then
  mv docs/phase2/reference/PHASE_2_VERIFICATION_REPORT.md . 2>/dev/null
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Essential docs kept in root: $(ls -1 *.md 2>/dev/null | wc -l | tr -d ' ') files"
echo "  - Archived in docs/archive/: $(find docs/archive -name "*.md" 2>/dev/null | wc -l | tr -d ' ') files"
echo "  - Phase 2 reference in docs/phase2/: $(find docs/phase2 -name "*.md" 2>/dev/null | wc -l | tr -d ' ') files"
echo ""
echo "📁 Organization:"
echo "  Root: Essential active documentation"
echo "  docs/phase2/: Phase 2 reference documentation"
echo "  docs/archive/: Old/temporary documentation"

