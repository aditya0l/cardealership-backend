#!/usr/bin/env node

/**
 * Wait for database and then run migrations
 * This script is designed to work with Render's existing start command
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
        console.log('❌ Database connection timeout after maximum attempts');
        console.log('   Unable to connect to database after 60 seconds');
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

async function runCommand(command, description) {
  try {
    console.log(`\n📦 ${description}...`);
    execSync(command, {
      stdio: 'inherit',
      env: process.env,
    });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting deployment with database connection retry...\n');

  // Step 1: Run migration fix (non-blocking) - matches Render's current command
  console.log('🔧 Running migration cleanup (if needed)...');
  try {
    execSync('node scripts/fix-failed-migration.js', {
      stdio: 'inherit',
      env: process.env,
      timeout: 15000,
    });
  } catch (error) {
    console.log('⚠️  Migration cleanup skipped (database may not be ready yet)');
  }

  // Step 2: Wait for database (with retries)
  console.log('\n⏳ Waiting for database connection...');
  const dbReady = await waitForDatabase();

  if (!dbReady) {
    console.error('\n❌ Cannot connect to database after all retries');
    console.error('   This might mean:');
    console.error('   1. Database is still provisioning (wait 2-3 minutes)');
    console.error('   2. DATABASE_URL is incorrect');
    console.error('   3. Database service is down');
    console.error('\n   Exiting deployment. Please retry after database is ready.');
    process.exit(1);
  }

  // Step 3: Try to resolve any rolled-back migrations (non-blocking) - matches Render's current command
  const migrationName = '20251002200510_update_rbac_roles';
  try {
    console.log(`\n🔧 Attempting to resolve rolled-back migration: ${migrationName}...`);
    execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
      stdio: 'inherit',
      env: process.env,
      timeout: 30000,
    });
    console.log('✅ Migration resolved successfully');
  } catch (error) {
    // This is expected if migration doesn't exist or already resolved
    console.log('⚠️  Could not resolve migration (this is OK if migration doesn\'t exist or already resolved)');
  }

  // Step 4: Run migrations (required) - matches Render's current command
  console.log('\n📦 Running database migrations...');
  const migrationsSuccess = await runCommand(
    'npx prisma migrate deploy',
    'Running database migrations'
  );

  if (!migrationsSuccess) {
    console.error('\n❌ Migration deployment failed');
    console.error('   Please check database connection and migration status');
    process.exit(1);
  }

  // Step 5: Start application - matches Render's current command
  console.log('\n🚀 Starting application...\n');
  execSync('npm start', {
    stdio: 'inherit',
    env: process.env,
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

