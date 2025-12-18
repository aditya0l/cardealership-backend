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

// Find project root by looking for package.json
function findProjectRoot(startPath = process.cwd()) {
  let currentPath = path.resolve(startPath);
  const root = path.parse(currentPath).root;
  
  while (currentPath !== root) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
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
    path.join(process.cwd(), 'dist', 'server.js'),         // Fallback to cwd
    path.join(projectRoot, '..', 'dist', 'server.js'),     // If in subdirectory
  ];
  
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
        env: process.env,
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

  // Step 5: Verify build exists before starting
  if (!fs.existsSync(distServerPath)) {
    console.error('❌ dist/server.js still not found after build attempt');
    console.error('   Please check build logs for errors');
    process.exit(1);
  }

  // Step 6: Start application using absolute path
  console.log('\n🚀 Starting application...\n');
  console.log(`📁 Using server file: ${distServerPath}\n`);
  
  // Determine project root (parent of dist directory)
  const projectRoot = path.dirname(path.dirname(distServerPath));
  console.log(`📁 Project root: ${projectRoot}\n`);
  
  // Use absolute path to start the server instead of npm start
  // This ensures we use the correct path regardless of working directory
  // Set cwd to project root so relative imports work correctly
  execSync(`node "${distServerPath}"`, {
    stdio: 'inherit',
    env: process.env,
    cwd: projectRoot, // Set cwd to project root
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

