#!/usr/bin/env node

/**
 * This script removes the failed migration record from the database
 * so that Prisma can proceed with new migrations
 */

const { PrismaClient } = require('@prisma/client');

async function fixFailedMigration() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping migration cleanup');
    process.exit(0);
  }

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  
  try {
    console.log('🔧 Checking for failed migrations...');
    
    // Try to connect first with a timeout
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);
    
    // Delete the failed migration records
    await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations" 
      WHERE migration_name IN (
        '20251011_add_employee_hierarchy_stock_and_models',
        '20251011060000_cleanup_failed_migration',
        '20251014_multitenant_dealership_required'
      )
      AND finished_at IS NULL;
    `);
    
    console.log('✅ Cleaned up failed migration record');
    process.exit(0);
  } catch (error) {
    // Check if it's a connection error
    if (error.message.includes("Can't reach database server") || 
        error.message.includes("Connection timeout") ||
        error.code === 'P1001') {
      console.log('⚠️  Database not ready yet, skipping migration cleanup');
      console.log('   This is normal during initial deployment. Migrations will run later.');
      process.exit(0); // Exit successfully so deployment continues
    } else {
      console.error('❌ Error cleaning up migration:', error.message);
      process.exit(0); // Still exit successfully to allow migration deploy to run
    }
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
  }
}

fixFailedMigration();

