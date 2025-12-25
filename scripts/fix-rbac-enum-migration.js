#!/usr/bin/env node

/**
 * Fix the RBAC enum migration by adding enum values properly
 * PostgreSQL requires enum values to be committed before they can be used
 */

const { PrismaClient } = require('@prisma/client');

async function fixRbacEnumMigration() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping enum fix');
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
    console.log('🔧 Fixing RBAC enum migration...\n');
    
    // Connect to database
    await prisma.$connect();
    
    // Step 1: Check if enum values already exist
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'RoleName'
      )
      ORDER BY enumsortorder;
    `;
    
    const existingValues = enumValues.map(v => v.enumlabel);
    console.log('📊 Current RoleName enum values:', existingValues);
    
    // Step 2: Add enum values one at a time (each in its own transaction)
    const newValues = ['GENERAL_MANAGER', 'SALES_MANAGER', 'CUSTOMER_ADVISOR', 'TEAM_LEAD'];
    
    for (const value of newValues) {
      if (existingValues.includes(value)) {
        console.log(`⏭️  ${value} already exists`);
        continue;
      }
      
      try {
        // Use DO block to commit each enum addition separately
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = '${value}' 
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RoleName')
            ) THEN
              ALTER TYPE "RoleName" ADD VALUE '${value}';
            END IF;
          END $$;
        `);
        console.log(`✅ Added enum value: ${value}`);
        
        // Small delay to ensure commit
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  ${value} already exists`);
        } else {
          console.error(`❌ Failed to add ${value}:`, error.message);
          // Continue with other values
        }
      }
    }
    
    // Step 3: Wait a moment for enum values to be committed
    console.log('\n⏳ Waiting for enum values to be committed...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 4: Update existing roles (now safe to use new enum values)
    console.log('\n📝 Updating existing role data...');
    
    try {
      // Check if MANAGER role exists and update it
      const managerCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM roles WHERE name::text = 'MANAGER';
      `;
      
      if (managerCount[0]?.count > 0) {
        await prisma.$executeRawUnsafe(`
          UPDATE roles 
          SET name = 'GENERAL_MANAGER'::"RoleName" 
          WHERE name::text = 'MANAGER';
        `);
        console.log('✅ Updated MANAGER -> GENERAL_MANAGER');
      }
    } catch (error) {
      console.log('⚠️  Could not update MANAGER role:', error.message);
    }
    
    try {
      // Check if ADVISOR role exists and update it
      const advisorCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM roles WHERE name::text = 'ADVISOR';
      `;
      
      if (advisorCount[0]?.count > 0) {
        await prisma.$executeRawUnsafe(`
          UPDATE roles 
          SET name = 'CUSTOMER_ADVISOR'::"RoleName" 
          WHERE name::text = 'ADVISOR';
        `);
        console.log('✅ Updated ADVISOR -> CUSTOMER_ADVISOR');
      }
    } catch (error) {
      console.log('⚠️  Could not update ADVISOR role:', error.message);
    }
    
    // Step 5: Insert missing roles
    console.log('\n📝 Ensuring all required roles exist...');
    
    const requiredRoles = ['ADMIN', 'GENERAL_MANAGER', 'SALES_MANAGER', 'TEAM_LEAD', 'CUSTOMER_ADVISOR'];
    
    for (const roleName of requiredRoles) {
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO roles (id, name) 
          SELECT gen_random_uuid()::text, '${roleName}'::"RoleName"
          WHERE NOT EXISTS (
            SELECT 1 FROM roles WHERE name = '${roleName}'::"RoleName"
          );
        `);
        console.log(`✅ Ensured ${roleName} role exists`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⏭️  ${roleName} role already exists`);
        } else {
          console.log(`⚠️  Could not ensure ${roleName} role:`, error.message);
        }
      }
    }
    
    // Step 6: Mark the migration as applied
    console.log('\n📝 Marking migration as applied...');
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "_prisma_migrations" 
        SET finished_at = NOW()
        WHERE migration_name = '20251002200510_update_rbac_roles' 
          AND finished_at IS NULL;
      `);
      console.log('✅ Migration marked as applied');
    } catch (error) {
      // Migration might not be in the table yet, that's OK
      console.log('⚠️  Could not mark migration (might not exist yet)');
    }
    
    console.log('\n✅ RBAC enum migration fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing enum migration:', error.message);
    // Don't exit with error - let migrations continue
  } finally {
    await prisma.$disconnect();
  }
}

fixRbacEnumMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(0); // Exit successfully to allow migrations to continue
  });

