#!/bin/bash
# Quick deployment script for fixing production database enum

set -e

echo "🔧 Database Enum Fix Deployment Script"
echo "========================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  echo "Please set it first:"
  echo "  export DATABASE_URL='your_production_database_url'"
  exit 1
fi

echo "📋 This script will:"
echo "  1. Backup current enquiries table"
echo "  2. Fix EnquiryCategory enum values"
echo "  3. Verify the changes"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Aborted"
  exit 1
fi

# Create backup
echo "📦 Creating backup..."
BACKUP_FILE="enquiries_backup_$(date +%Y%m%d_%H%M%S).sql"
psql "$DATABASE_URL" -c "\copy (SELECT * FROM enquiries) TO '$BACKUP_FILE' CSV HEADER"
echo "✅ Backup saved to: $BACKUP_FILE"

# Run migration
echo "🚀 Running migration..."
psql "$DATABASE_URL" -f scripts/fix-production-enum.sql

echo ""
echo "✅ Migration completed!"
echo ""
echo "📊 Next steps:"
echo "  1. Test API: curl https://your-backend.onrender.com/api/enquiries?category=HOT"
echo "  2. Refresh your Expo app"
echo "  3. Verify enquiries and bookings load correctly"
echo ""
echo "💾 Backup location: $BACKUP_FILE"
