#!/usr/bin/env node

/**
 * This script removes the failed migration record from the database
 * so that Prisma can proceed with new migrations
 */

const { PrismaClient } = require('@prisma/client');

async function fixFailedMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Checking for failed migrations...');
    
    // Delete the failed migration records
    await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations" 
      WHERE migration_name IN (
        '20251011_add_employee_hierarchy_stock_and_models',
        '20251011060000_cleanup_failed_migration'
      )
      AND finished_at IS NULL;
    `);
    
    console.log('✅ Cleaned up failed migration record');
  } catch (error) {
    console.error('❌ Error cleaning up migration:', error.message);
    // Don't exit with error, let the migration continue anyway
  } finally {
    await prisma.$disconnect();
  }
}

fixFailedMigration();

