#!/usr/bin/env node

/**
 * Fix the EnquirySource enum by adding missing enum values
 * This script ensures all enum values from the Prisma schema exist in the database
 */

const { PrismaClient } = require('@prisma/client');

async function fixEnquirySourceEnumMigration() {
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
    console.log('🔧 Fixing EnquirySource enum...\n');
    
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

    // Step 2: Check current enum values
    console.log('📊 Checking current enum values...');
    
    const currentEnumCheck = await prisma.$queryRawUnsafe(`
      SELECT 
        t.typname as enum_name,
        string_agg(e.enumlabel::text, ', ' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'EnquirySource'
      GROUP BY t.typname;
    `);
    
    const expectedValues = [
      'WALK_IN',
      'PHONE_CALL',
      'WEBSITE',
      'DIGITAL',
      'SOCIAL_MEDIA',
      'REFERRAL',
      'ADVERTISEMENT',
      'EMAIL',
      'SHOWROOM_VISIT',
      'EVENT',
      'BTL_ACTIVITY',
      'WHATSAPP',
      'OUTBOUND_CALL',
      'OTHER'
    ];
    
    let currentValues = [];
    
    if (currentEnumCheck.length > 0) {
      currentValues = currentEnumCheck[0].enum_values.split(', ').map(v => v.trim());
      console.log(`📊 Current EnquirySource values: ${currentEnumCheck[0].enum_values}`);
    } else {
      console.log('⚠️  EnquirySource enum not found');
      process.exit(0);
    }
    
    // Step 3: Add missing enum values
    const missingValues = expectedValues.filter(val => !currentValues.includes(val));
    
    if (missingValues.length === 0) {
      console.log('✅ All EnquirySource enum values already exist');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Missing enum values: ${missingValues.join(', ')}`);
    console.log('🔧 Adding missing enum values...\n');
    
    for (const value of missingValues) {
      try {
        // Use DO block to handle duplicate_object exception
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS '${value}';
          EXCEPTION
            WHEN duplicate_object THEN
              RAISE NOTICE 'Value ${value} already exists';
            WHEN OTHERS THEN
              -- Try without IF NOT EXISTS for older PostgreSQL versions
              BEGIN
                ALTER TYPE "EnquirySource" ADD VALUE '${value}';
                RAISE NOTICE 'Added value ${value}';
              EXCEPTION
                WHEN duplicate_object THEN
                  RAISE NOTICE 'Value ${value} already exists';
              END;
          END $$;
        `);
        console.log(`✅ Added/verified enum value: ${value}`);
        
        // Small delay to ensure commit
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate_object')) {
          console.log(`⏭️  ${value} already exists`);
        } else {
          console.error(`❌ Failed to add ${value}:`, error.message);
          // Continue with other values
        }
      }
    }
    
    // Step 4: Verify final state
    console.log('\n📊 Verifying final enum state...');
    const finalEnumCheck = await prisma.$queryRawUnsafe(`
      SELECT 
        t.typname as enum_name,
        string_agg(e.enumlabel::text, ', ' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'EnquirySource'
      GROUP BY t.typname;
    `);
    
    if (finalEnumCheck.length > 0) {
      const finalValues = finalEnumCheck[0].enum_values.split(', ').map(v => v.trim());
      console.log(`📊 Final EnquirySource values: ${finalEnumCheck[0].enum_values}`);
      console.log(`📊 Total values: ${finalValues.length}`);
      
      const stillMissing = expectedValues.filter(val => !finalValues.includes(val));
      if (stillMissing.length > 0) {
        console.warn(`⚠️  Still missing values: ${stillMissing.join(', ')}`);
      } else {
        console.log('✅ All expected enum values are present');
      }
    }
    
    console.log('\n✅ EnquirySource enum fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing enum:', error.message);
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
  fixEnquirySourceEnumMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(0); // Exit successfully to allow migrations to continue
    });
}

module.exports = { fixEnquirySourceEnumMigration };

