#!/usr/bin/env ts-node

/**
 * Fix the enum migration by adding enum values in separate transactions
 */

import prisma from '../src/config/db';

async function fixEnumMigration() {
  console.log('🔧 Fixing enum migration...\n');
  
  try {
    // Step 1: Add enum values (these must be committed separately)
    console.log('Step 1: Adding enum values (separate transactions)...');
    
    // Add each enum value in its own transaction
    await prisma.$executeRawUnsafe(`ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'GENERAL_MANAGER';`);
    await prisma.$executeRawUnsafe(`COMMIT;`);
    await prisma.$executeRawUnsafe(`BEGIN;`);
    
    await prisma.$executeRawUnsafe(`ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'SALES_MANAGER';`);
    await prisma.$executeRawUnsafe(`COMMIT;`);
    await prisma.$executeRawUnsafe(`BEGIN;`);
    
    await prisma.$executeRawUnsafe(`ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'CUSTOMER_ADVISOR';`);
    await prisma.$executeRawUnsafe(`COMMIT;`);
    await prisma.$executeRawUnsafe(`BEGIN;`);
    
    await prisma.$executeRawUnsafe(`ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'TEAM_LEAD';`);
    await prisma.$executeRawUnsafe(`COMMIT;`);
    
    console.log('✅ Enum values added\n');
    
    // Step 2: Update existing roles (now safe to use new enum values)
    console.log('Step 2: Updating existing role data...');
    
    await prisma.$executeRawUnsafe(`
      UPDATE "roles" 
      SET "name" = 'GENERAL_MANAGER'::"RoleName" 
      WHERE "name"::text = 'MANAGER';
    `);
    
    await prisma.$executeRawUnsafe(`
      UPDATE "roles" 
      SET "name" = 'CUSTOMER_ADVISOR'::"RoleName" 
      WHERE "name"::text = 'ADVISOR';
    `);
    
    console.log('✅ Role data updated\n');
    
    // Step 3: Insert missing roles
    console.log('Step 3: Ensuring all roles exist...');
    
    const roles = [
      'GENERAL_MANAGER',
      'SALES_MANAGER',
      'CUSTOMER_ADVISOR',
      'TEAM_LEAD',
      'ADMIN'
    ];
    
    for (const roleName of roles) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "roles" ("id", "name") 
        SELECT gen_random_uuid()::text, $1::"RoleName"
        WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = $1::"RoleName");
      `, roleName);
      console.log(`✅ Role ${roleName} ensured`);
    }
    
    console.log('\n✅ Enum migration fixed!');
    console.log('   You can now run: npx prisma migrate deploy\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('   Enum values may already exist - continuing...');
    } else {
      throw error;
    }
  }
}

async function main() {
  await fixEnumMigration();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

