#!/bin/bash

# Production start script with automatic retry logic for database connections
# This script handles database connection issues gracefully

set -e  # Exit on error (but we handle specific cases)

echo "🚀 Starting production deployment..."

# Wait for database to be ready (with retries)
wait_for_database() {
  local max_attempts=30
  local attempt=1
  local delay=2
  
  echo "⏳ Waiting for database to be ready..."
  
  while [ $attempt -le $max_attempts ]; do
    if node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.\$queryRaw\`SELECT 1\`
        .then(() => {
          console.log('✅ Database is ready');
          process.exit(0);
        })
        .catch(() => {
          process.exit(1);
        })
        .finally(() => prisma.\$disconnect());
    " 2>/dev/null; then
      echo "✅ Database connection successful!"
      return 0
    fi
    
    echo "⏳ Attempt $attempt/$max_attempts: Database not ready yet, waiting ${delay}s..."
    sleep $delay
    attempt=$((attempt + 1))
  done
  
  echo "⚠️  Database connection timeout after $max_attempts attempts"
  echo "   Proceeding anyway - migrations will retry..."
  return 1
}

# Run migration fix script (non-blocking)
echo "🔧 Running migration cleanup (if needed)..."
node scripts/fix-failed-migration.js || echo "⚠️  Migration cleanup skipped (database may not be ready yet)"

# Wait for database before running migrations
if wait_for_database; then
  echo "✅ Database is ready, running migrations..."
else
  echo "⚠️  Proceeding with migrations anyway (will fail gracefully if DB not ready)"
fi

# Run migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy || {
  echo "❌ Migration failed - this is normal if database isn't ready yet"
  echo "   The app will start anyway and migrations can be run manually later"
}

# Start the application
echo "🚀 Starting application..."
npm start

