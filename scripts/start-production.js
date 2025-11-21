#!/usr/bin/env node

/**
 * Production start script with automatic database connection retry
 * This script handles database connection issues gracefully during deployment
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const MAX_RETRIES = 30;
const RETRY_DELAY = 2000; // 2 seconds

async function waitForDatabase() {
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  console.log('⏳ Waiting for database to be ready...');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Try a simple query to test connection
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        ),
      ]);

      console.log(`✅ Database connection successful on attempt ${attempt}!`);
      await prisma.$disconnect();
      return true;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.log(
          `⏳ Attempt ${attempt}/${MAX_RETRIES}: Database not ready yet, waiting ${RETRY_DELAY / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.log('⚠️  Database connection timeout after maximum attempts');
        console.log('   This is normal during initial deployment - proceeding anyway');
      }
    }
  }

  try {
    await prisma.$disconnect();
  } catch (e) {
    // Ignore disconnect errors
  }

  return false;
}

async function runMigrationFix() {
  try {
    console.log('🔧 Running migration cleanup (if needed)...');
    // Run the migration fix script as a separate process
    // This ensures it can exit gracefully without affecting our main process
    execSync('node scripts/fix-failed-migration.js', {
      stdio: 'inherit',
      env: process.env,
      timeout: 15000, // 15 second timeout
    });
    console.log('✅ Migration cleanup completed');
  } catch (error) {
    // Script exits with code 0 even on errors, so this catch is just for safety
    console.log('⚠️  Migration cleanup skipped (this is normal if database isn\'t ready)');
    // Don't throw - continue anyway
  }
}

async function runMigrations() {
  console.log('📦 Running database migrations...');
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.log('⚠️  Migration failed - this is normal if database isn\'t ready yet');
    console.log('   The app will start anyway and migrations can be run manually later');
    // Don't exit - let the app start
  }
}

async function startApplication() {
  console.log('🚀 Starting application...');
  try {
    // Start the application (this will block)
    execSync('npm start', {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting production deployment...\n');

  // Step 1: Wait for database (with retries)
  const dbReady = await waitForDatabase();

  // Step 2: Run migration fix (non-blocking)
  if (dbReady) {
    await runMigrationFix();
  }

  // Step 3: Run migrations
  await runMigrations();

  // Step 4: Start the application
  await startApplication();
}

// Handle unhandled errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('⚠️  Unhandled error:', error.message);
  // Continue anyway - don't crash
});

process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

