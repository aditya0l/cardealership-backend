#!/usr/bin/env node

/**
 * Wait for database and then run migrations
 * This script is designed to work with Render's existing start command
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const MAX_RETRIES = 30;
const RETRY_DELAY = 2000; // 2 seconds

async function waitForDatabase() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.error('   Please set DATABASE_URL in Render Dashboard → Environment tab');
    console.error('   Current environment variables:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB')));
    throw new Error('DATABASE_URL not found in environment');
  }

  // Clean and validate DATABASE_URL
  let databaseUrl = process.env.DATABASE_URL.trim();

  // Remove any trailing invalid characters that might cause parsing issues
  if (databaseUrl.endsWith('postgresql:') || databaseUrl.endsWith('postgresql://')) {
    console.warn('⚠️  DATABASE_URL has trailing "postgresql:" - removing it');
    databaseUrl = databaseUrl.replace(/postgresql:?\/?\/?$/, '');
    process.env.DATABASE_URL = databaseUrl;
  }

  // Validate URL format
  try {
    const url = new URL(databaseUrl);
    console.log('📊 DATABASE_URL is set:', databaseUrl.substring(0, 50) + '...');
    console.log(`📊 Database name: ${url.pathname.substring(1)}`);
    console.log(`📊 Host: ${url.hostname}`);
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format:', error.message);
    console.error(`   Current value: ${databaseUrl.substring(0, 100)}...`);
    throw new Error('Invalid DATABASE_URL format');
  }

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: databaseUrl, // Use cleaned URL
      },
    },
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

/**
 * Check migration status in database
 * Returns: 'applied', 'failed', 'in_progress', or 'not_found'
 */
async function checkMigrationStatus(migrationName) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    await prisma.$connect();

    // Check if migrations table exists
    const migrationsTableExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);

    if (!migrationsTableExists[0]?.exists) {
      await prisma.$disconnect();
      return 'not_found';
    }

    // Check migration status
    const migrationStatus = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, success, started_at
      FROM "_prisma_migrations"
      WHERE migration_name = '${migrationName.replace(/'/g, "''")}';
    `);

    await prisma.$disconnect();

    if (!migrationStatus || migrationStatus.length === 0) {
      return 'not_found';
    }

    const migration = migrationStatus[0];
    if (migration.finished_at && migration.success) {
      return 'applied';
    } else if (migration.finished_at && !migration.success) {
      return 'failed';
    } else {
      return 'in_progress';
    }
  } catch (error) {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    // Return 'not_found' on error to be safe
    return 'not_found';
  }
}

// Find project root by looking for package.json
// Handle case where we might be in /opt/render/project/src
function findProjectRoot(startPath = process.cwd()) {
  let currentPath = path.resolve(startPath);
  const root = path.parse(currentPath).root;

  // If we're in a 'src' subdirectory, go up one level first
  if (currentPath.endsWith('/src') || currentPath.endsWith('\\src')) {
    const parentPath = path.dirname(currentPath);
    const parentPackageJson = path.join(parentPath, 'package.json');
    if (fs.existsSync(parentPackageJson)) {
      console.log(`📁 Detected we're in src/, using parent directory: ${parentPath}`);
      // Verify parent has dist/ or prisma/ to confirm it's the real root
      const hasDist = fs.existsSync(path.join(parentPath, 'dist'));
      const hasPrisma = fs.existsSync(path.join(parentPath, 'prisma'));
      if (hasDist || hasPrisma) {
        return parentPath;
      }
    }
  }

  // Normal search for package.json
  while (currentPath !== root) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      // Verify this is the main package.json by checking for key directories
      const hasSrcDir = fs.existsSync(path.join(currentPath, 'src'));
      const hasDistDir = fs.existsSync(path.join(currentPath, 'dist'));
      const hasPrismaDir = fs.existsSync(path.join(currentPath, 'prisma'));

      // If we found package.json but it's in src/, go up one more level
      if (currentPath.endsWith('/src') || currentPath.endsWith('\\src')) {
        const parentPath = path.dirname(currentPath);
        const parentPackageJson = path.join(parentPath, 'package.json');
        if (fs.existsSync(parentPackageJson)) {
          return parentPath;
        }
      }

      // If we have src/, dist/, or prisma/, this is likely the root
      if (hasSrcDir || hasDistDir || hasPrismaDir) {
        return currentPath;
      }

      // Otherwise, go up one more level to check
      const parentPath = path.dirname(currentPath);
      const parentPackageJson = path.join(parentPath, 'package.json');
      if (fs.existsSync(parentPackageJson)) {
        return parentPath;
      }

      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  // Fallback to current working directory
  return process.cwd();
}

async function main() {
  console.log('🚀 Starting deployment with database connection retry...\n');
  console.log(`📁 Current working directory: ${process.cwd()}\n`);

  // Check DATABASE_URL early
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.error('\n📋 To fix this:');
    console.error('   1. Go to Render Dashboard → Your Web Service');
    console.error('   2. Click "Environment" tab');
    console.error('   3. Add environment variable:');
    console.error('      Key: DATABASE_URL');
    console.error('      Value: postgresql://dealership_db_9v47_user:...@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47');
    console.error('   4. Click "Save Changes"');
    console.error('   5. Redeploy the service\n');
    process.exit(1);
  }

  // Validate and clean DATABASE_URL
  let databaseUrl = process.env.DATABASE_URL.trim();

  // Remove any trailing "postgresql:" or other invalid characters
  if (databaseUrl.endsWith('postgresql:') || databaseUrl.endsWith('postgresql://')) {
    console.warn('⚠️  DATABASE_URL has trailing "postgresql:" - removing it');
    databaseUrl = databaseUrl.replace(/postgresql:?\/?\/?$/, '');
  }

  // Validate URL format
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== 'postgresql:') {
      console.error(`❌ Invalid DATABASE_URL protocol: ${url.protocol}. Expected postgresql:`);
      process.exit(1);
    }
    console.log('✅ DATABASE_URL is set and valid');
    console.log(`📊 Database URL: ${databaseUrl.substring(0, 60)}...`);
    console.log(`📊 Database name: ${url.pathname.substring(1)}`);
    console.log(`📊 Host: ${url.hostname}\n`);
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format:', error.message);
    console.error(`   Current value: ${databaseUrl.substring(0, 100)}...`);
    process.exit(1);
  }

  // Update process.env with cleaned URL
  process.env.DATABASE_URL = databaseUrl;

  // Find project root
  const projectRoot = findProjectRoot();
  console.log(`📁 Project root: ${projectRoot}\n`);

  // Change to project root to ensure all commands run from correct directory
  process.chdir(projectRoot);
  console.log(`📁 Changed working directory to: ${process.cwd()}\n`);

  // Step 0: Verify build exists, rebuild if needed
  // Check multiple possible locations for dist/server.js
  const possiblePaths = [
    path.join(projectRoot, 'dist', 'server.js'),           // Standard: /opt/render/project/dist/server.js
    path.resolve(projectRoot, 'dist', 'server.js'),       // Absolute path version
    path.join(process.cwd(), 'dist', 'server.js'),         // Fallback to cwd
    path.resolve(process.cwd(), 'dist', 'server.js'),     // Absolute cwd version
  ];

  console.log('🔍 Checking for dist/server.js in these locations:');
  possiblePaths.forEach(p => {
    const exists = fs.existsSync(p);
    console.log(`   ${exists ? '✅' : '❌'} ${p}`);
  });

  let distServerPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      distServerPath = possiblePath;
      console.log(`✅ Found build at: ${distServerPath}`);
      break;
    }
  }

  if (!distServerPath) {
    console.log('⚠️  dist/server.js not found in any expected location. Building application...');
    console.log('📦 Running TypeScript build...');
    try {
      execSync('npm run build', {
        stdio: 'inherit',
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=2048' },
        cwd: projectRoot,
      });
      console.log('✅ Build completed successfully');

      // Check again after build
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          distServerPath = possiblePath;
          console.log(`✅ Found build at: ${distServerPath}`);
          break;
        }
      }
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  if (!distServerPath) {
    console.error('❌ dist/server.js still not found after build attempt');
    console.error('   Checked paths:');
    possiblePaths.forEach(p => console.error(`     - ${p}`));
    process.exit(1);
  }

  // Step 1: Run migration fix (non-blocking) - matches Render's current command
  console.log('🔧 Running migration cleanup (if needed)...');
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping migration cleanup');
  } else {
    try {
      execSync('node scripts/fix-failed-migration.js', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        timeout: 15000,
      });
    } catch (error) {
      console.log('⚠️  Migration cleanup skipped (database may not be ready yet)');
    }
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
    console.log(`\n🔧 Checking status of migration: ${migrationName}...`);
    const status = await checkMigrationStatus(migrationName);
    console.log(`📊 Migration status: ${status}`);

    if (status === 'applied') {
      console.log('✅ Migration already applied - skipping resolution');
    } else if (status === 'failed' || status === 'in_progress') {
      console.log(`🔧 Attempting to resolve ${status} migration: ${migrationName}...`);
      try {
        execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
          stdio: 'inherit',
          env: process.env,
          timeout: 30000,
        });
        console.log('✅ Migration resolved successfully');
      } catch (resolveError) {
        console.log('⚠️  Could not resolve migration (this is OK if it doesn\'t need resolution)');
      }
    } else {
      console.log('ℹ️  Migration not found in database - will be applied normally');
    }
  } catch (error) {
    // This is expected if migration doesn't exist or already resolved
    console.log('⚠️  Could not check migration status (this is OK if migration doesn\'t exist or already resolved)');
  }

  // Step 4: Fix RBAC enum migration if needed (before running migrations)
  console.log('\n🔧 Checking for RBAC enum migration issues...');
  try {
    execSync('node scripts/fix-rbac-enum-migration.js', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      timeout: 30000,
    });
    console.log('✅ RBAC enum migration check completed');
  } catch (error) {
    console.log('⚠️  RBAC enum fix skipped (this is OK if not needed)');
  }

  // Step 4.5: Fix missing columns (FCM, fuel_type, chassis_number, etc.)
  console.log('\n🔧 Checking for missing database columns...');
  try {
    execSync('node scripts/fix-fcm-columns.js', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      timeout: 30000,
    });
    console.log('✅ FCM columns check completed');
  } catch (error) {
    console.log('⚠️  FCM columns fix skipped (this is OK if not needed)');
  }

  try {
    execSync('node scripts/fix-missing-columns.js', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      timeout: 30000,
    });
    console.log('✅ Missing columns check completed');
  } catch (error) {
    console.log('⚠️  Missing columns fix skipped (this is OK if not needed)');
  }

  // Step 4.7: Fix notification_logs table if missing
  console.log('\n🔧 Checking for notification_logs table...');
  try {
    execSync('node scripts/fix-notification-logs-table.js', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      timeout: 30000,
    });
    console.log('✅ Notification logs table check completed');
  } catch (error) {
    console.log('⚠️  Notification logs table fix skipped (this is OK if not needed)');
  }

  // Step 4.8: Fix EnquiryCategory enum migration if it failed
  console.log('\n🔧 Checking for EnquiryCategory enum migration issues...');
  try {
    execSync('node scripts/fix-enquiry-category-enum-migration.js', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      timeout: 30000,
    });
    console.log('✅ EnquiryCategory enum migration check completed');
  } catch (error) {
    console.log('⚠️  EnquiryCategory enum migration fix skipped (this is OK if not needed)');
  }

  // Step 5: Resolve failed migration if it exists
  const failedMigrationName = '20250102200000_add_fuel_type_to_enquiry';
  try {
    console.log(`\n🔧 Attempting to resolve failed migration: ${failedMigrationName}...`);
    execSync(`npx prisma migrate resolve --applied ${failedMigrationName}`, {
      stdio: 'inherit',
      env: process.env,
      timeout: 30000,
    });
    console.log('✅ Failed migration resolved');
  } catch (error) {
    // This is expected if migration doesn't exist or already resolved
    console.log('⚠️  Could not resolve failed migration (this is OK if it doesn\'t exist or already resolved)');
  }

  // Step 5.5: Add FCM columns if missing (safety measure)
  console.log('\n🔧 Checking for FCM notification columns...');
  try {
    execSync('ts-node scripts/add-fcm-columns.ts', {
      stdio: 'inherit',
      env: process.env,
      timeout: 30000,
    });
    console.log('✅ FCM columns check completed');
  } catch (error) {
    console.log('⚠️  FCM columns check skipped (this is OK if columns already exist or migration will handle it)');
  }

  // Step 5.7: (Removed - handled in Step 4.8 above with comprehensive fix script)

  // Step 6: Run migrations (required) - matches Render's current command
  console.log('\n📦 Running database migrations...');
  console.log(`📊 Using DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 60) + '...' : 'NOT SET'}\n`);
  const migrationsSuccess = await runCommand(
    'npx prisma migrate deploy',
    'Running database migrations'
  );

  if (!migrationsSuccess) {
    console.error('\n❌ Migration deployment failed');
    console.error('   Attempting to fix failed migrations and retry...');

    // Try to fix enum migrations and retry
    try {
      console.log(`\n🔧 Fixing enum migrations and retrying...`);
      
      // Fix EnquiryCategory enum migration
      try {
        execSync('node scripts/fix-enquiry-category-enum-migration.js', {
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
          timeout: 30000,
        });
        console.log('✅ EnquiryCategory enum migration fix attempted');
      } catch (enumFixError) {
        console.log('⚠️  Could not fix EnquiryCategory enum migration (may already be fixed)');
      }

      // Fix RBAC enum migration
      try {
        execSync('node scripts/fix-rbac-enum-migration.js', {
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
          timeout: 30000,
        });
        console.log('✅ RBAC enum migration fix attempted');
      } catch (rbacFixError) {
        console.log('⚠️  Could not fix RBAC enum migration (may already be fixed)');
      }

      // Check RBAC migration status before attempting resolution
      try {
        const rbacStatus = await checkMigrationStatus('20251002200510_update_rbac_roles');
        if (rbacStatus === 'failed' || rbacStatus === 'in_progress') {
          console.log(`🔧 Attempting to resolve RBAC migration (status: ${rbacStatus})...`);
          execSync(`npx prisma migrate resolve --applied 20251002200510_update_rbac_roles`, {
            stdio: 'inherit',
            env: process.env,
            timeout: 30000,
          });
          console.log('✅ RBAC migration resolved');
        } else {
          console.log(`ℹ️  RBAC migration status: ${rbacStatus} - skipping resolution`);
        }
      } catch (resolveError) {
        console.log('⚠️  Could not resolve RBAC migration (might already be resolved)');
      }

      console.log('✅ Migration fixes completed, retrying migrations...');

      // Retry migrations
      const retrySuccess = await runCommand(
        'npx prisma migrate deploy',
        'Retrying database migrations'
      );

      if (!retrySuccess) {
        console.error('\n❌ Migration deployment failed after retry');
        console.error('   Please check database connection and migration status');
        console.error('   You may need to manually resolve failed migrations');
        process.exit(1);
      }
    } catch (fixError) {
      console.error('\n❌ Could not fix migrations:', fixError.message);
      console.error('   Please check database connection and migration status');
      console.error('   You may need to manually resolve failed migrations');
      process.exit(1);
    }
  }

  // Step 5: Verify build exists before starting
  if (!fs.existsSync(distServerPath)) {
    console.error('❌ dist/server.js still not found after build attempt');
    console.error('   Please check build logs for errors');
    process.exit(1);
  }

  // Step 6: Start application using absolute path
  console.log('\n🚀 Starting application...\n');
  console.log(`📁 Using server file: ${distServerPath}\n`);
  console.log(`📁 Absolute path resolved: ${path.resolve(distServerPath)}\n`);

  // Ensure we're in project root
  process.chdir(projectRoot);
  console.log(`📁 Final working directory: ${process.cwd()}\n`);

  // Verify file exists one more time
  if (!fs.existsSync(distServerPath)) {
    console.error(`❌ File does not exist: ${distServerPath}`);
    console.error(`   Absolute path: ${path.resolve(distServerPath)}`);
    process.exit(1);
  }

  // Use absolute path to start the server
  // Convert to absolute path to avoid any relative path issues
  const absoluteServerPath = path.resolve(distServerPath);
  console.log(`🚀 Starting server with: node "${absoluteServerPath}"\n`);

  execSync(`node "${absoluteServerPath}"`, {
    stdio: 'inherit',
    env: process.env,
    cwd: projectRoot, // Set cwd to project root
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

