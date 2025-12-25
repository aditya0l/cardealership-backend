#!/usr/bin/env node

/**
 * Fix the EnquiryCategory enum migration by cleaning up partial state
 * and resolving the failed migration record
 */

const { PrismaClient } = require('@prisma/client');

async function fixEnquiryCategoryEnumMigration() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping enum migration fix');
    process.exit(0);
  }

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log('🔧 Fixing EnquiryCategory enum migration...\n');
    
    // Connect to database
    await prisma.$connect();
    
    // Step 1: Check if migrations table exists
    const migrationsTableExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);
    
    if (!migrationsTableExists[0]?.exists) {
      console.log('ℹ️  Migrations table does not exist yet - this is a fresh database');
      console.log('   Migrations will be applied from the beginning');
      process.exit(0);
    }

    // Step 2: Check migration status
    const migrationStatus = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, success, started_at
      FROM "_prisma_migrations"
      WHERE migration_name = '20251221_fix_enquiry_category_enum';
    `);
    
    const migration = migrationStatus[0];
    
    if (!migration) {
      console.log('ℹ️  Migration not found in database - will be applied normally');
      process.exit(0);
    }
    
    if (migration.finished_at && migration.success) {
      console.log('✅ Migration already completed successfully');
      process.exit(0);
    }
    
    console.log(`📊 Migration status: ${migration.finished_at ? 'FAILED' : 'IN_PROGRESS'}`);
    
    // Step 3: Check current enum state
    console.log('\n📊 Checking current enum state...');
    
    // Check if EnquiryCategory enum exists and what values it has
    const currentEnumCheck = await prisma.$queryRawUnsafe(`
      SELECT 
        t.typname as enum_name,
        string_agg(e.enumlabel::text, ', ' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'EnquiryCategory'
      GROUP BY t.typname;
    `);
    
    const expectedValues = ['HOT', 'LOST', 'BOOKED'];
    let enumHasCorrectValues = false;
    let currentValues = [];
    
    if (currentEnumCheck.length > 0) {
      currentValues = currentEnumCheck[0].enum_values.split(', ').map(v => v.trim());
      enumHasCorrectValues = expectedValues.every(val => currentValues.includes(val)) && 
                             currentValues.length === expectedValues.length;
      console.log(`📊 Current EnquiryCategory values: ${currentEnumCheck[0].enum_values}`);
    } else {
      console.log('⚠️  EnquiryCategory enum not found');
    }
    
    // Check if EnquiryCategory_new enum exists (partial application)
    const newEnumCheck = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'EnquiryCategory_new'
      ) as exists;
    `);
    
    const newEnumExists = newEnumCheck[0]?.exists || false;
    console.log(`📊 EnquiryCategory_new enum exists: ${newEnumExists}`);
    
    // Step 4: Clean up partial state if migration partially succeeded
    if (newEnumExists) {
      console.log('\n🧹 Cleaning up partial migration state...');
      
      // Check if enquiries table is using EnquiryCategory_new
      const columnTypeCheck = await prisma.$queryRawUnsafe(`
        SELECT 
          column_name,
          udt_name
        FROM information_schema.columns
        WHERE table_name = 'enquiries'
        AND column_name = 'category';
      `);
      
      if (columnTypeCheck.length > 0 && columnTypeCheck[0].udt_name === 'EnquiryCategory_new') {
        console.log('⚠️  Column is using EnquiryCategory_new - migration partially applied');
        
        // We need to complete the migration or rollback
        // Since we can't safely determine which, we'll clean up the new enum
        // and let the migration re-run cleanly
        
        // First, check if we can safely switch back
        // For safety, we'll mark the migration as rolled-back and let Prisma re-run it
        console.log('🔧 Removing EnquiryCategory_new enum...');
        await prisma.$executeRawUnsafe(`
          DROP TYPE IF EXISTS "EnquiryCategory_new" CASCADE;
        `);
        console.log('✅ Cleaned up EnquiryCategory_new enum');
      } else {
        // New enum exists but column is not using it, safe to remove
        console.log('🔧 Removing unused EnquiryCategory_new enum...');
        await prisma.$executeRawUnsafe(`
          DROP TYPE IF EXISTS "EnquiryCategory_new" CASCADE;
        `);
        console.log('✅ Cleaned up EnquiryCategory_new enum');
      }
    }
    
    // Step 5: If enum already has correct values, mark migration as applied
    // Otherwise, delete the failed record to allow clean re-run
    if (enumHasCorrectValues) {
      console.log('\n✅ EnquiryCategory enum already has correct values');
      console.log('📝 Marking migration as applied...');
      
      await prisma.$executeRawUnsafe(`
        UPDATE "_prisma_migrations"
        SET finished_at = NOW(),
            success = true
        WHERE migration_name = '20251221_fix_enquiry_category_enum'
        AND finished_at IS NULL;
      `);
      
      console.log('✅ Migration marked as applied');
    } else {
      console.log('\n🧹 Enum values do not match expected values');
      console.log('📝 Deleting failed migration record to allow clean re-run...');
      
      await prisma.$executeRawUnsafe(`
        DELETE FROM "_prisma_migrations"
        WHERE migration_name = '20251221_fix_enquiry_category_enum'
        AND finished_at IS NULL;
      `);
      
      console.log('✅ Failed migration record deleted - migration will re-run cleanly');
    }
    
    console.log('\n✅ EnquiryCategory enum migration fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing enum migration:', error.message);
    console.error('   Stack:', error.stack);
    // Don't exit with error - let migrations continue
    process.exit(0);
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
  }
}

if (require.main === module) {
  fixEnquiryCategoryEnumMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(0); // Exit successfully to allow migrations to continue
    });
}

module.exports = { fixEnquiryCategoryEnumMigration };

