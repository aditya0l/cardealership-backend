#!/bin/bash

# Move Phase 2 docs to phase2 folder
mv PHASE_2_IMPLEMENTATION_COMPLETE.md docs/phase2/ 2>/dev/null
mv PHASE_2_MISSING_FEATURES.md docs/phase2/ 2>/dev/null

# Move old completion docs to archive
mv *_COMPLETE_*.md docs/archive/ 2>/dev/null
mv *_FIX_*.md docs/archive/ 2>/dev/null
mv *_DEPLOYMENT_*.md docs/archive/ 2>/dev/null
mv *ADMIN*.md docs/archive/ 2>/dev/null
mv *EXPO*.md docs/archive/ 2>/dev/null
mv *DASHBOARD*.md docs/archive/ 2>/dev/null

# But keep essential Phase 2 docs in root
mv docs/archive/PHASE_2_COMPLETE_SUMMARY.md . 2>/dev/null
mv docs/archive/PHASE_2_VERIFICATION_REPORT.md . 2>/dev/null
mv docs/archive/EXPO_APP_PHASE2_UPDATES.md . 2>/dev/null
mv docs/archive/DASHBOARD_PHASE2_UPDATES.md . 2>/dev/null
mv docs/archive/BACKEND_COMPLETION_STATUS.md . 2>/dev/null

echo "Cleanup complete!"
