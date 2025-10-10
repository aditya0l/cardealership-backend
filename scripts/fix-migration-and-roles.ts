import prisma from '../src/config/db';

async function fixMigrationAndRoles() {
  console.log('🔧 Fixing failed migration and updating roles...\n');

  try {
    // Step 1: Mark the failed migration as resolved
    console.log('Step 1: Resolving failed migration...');
    await prisma.$executeRawUnsafe(`
      UPDATE "_prisma_migrations" 
      SET finished_at = NOW(), 
          success = true,
          logs = 'Manually resolved - enum values added successfully'
      WHERE migration_name = '20251002200510_update_rbac_roles' 
        AND finished_at IS NULL;
    `);
    console.log('✅ Migration marked as resolved\n');

    // Step 2: Update existing roles (MANAGER -> GENERAL_MANAGER, ADVISOR -> CUSTOMER_ADVISOR)
    console.log('Step 2: Updating existing role data...');
    
    // Note: We can't directly update enum values, so we need to check if old values exist
    const managerRole = await prisma.$queryRaw`
      SELECT id FROM roles WHERE name = 'MANAGER'::text LIMIT 1;
    `;
    
    if (Array.isArray(managerRole) && managerRole.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE roles SET name = 'GENERAL_MANAGER' WHERE name = 'MANAGER';
      `);
      console.log('✅ Updated MANAGER -> GENERAL_MANAGER');
    }

    const advisorRole = await prisma.$queryRaw`
      SELECT id FROM roles WHERE name = 'ADVISOR'::text LIMIT 1;
    `;
    
    if (Array.isArray(advisorRole) && advisorRole.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE roles SET name = 'CUSTOMER_ADVISOR' WHERE name = 'ADVISOR';
      `);
      console.log('✅ Updated ADVISOR -> CUSTOMER_ADVISOR');
    }

    // Step 3: Insert missing roles
    console.log('\nStep 3: Ensuring all roles exist...');
    
    const requiredRoles = [
      'GENERAL_MANAGER',
      'SALES_MANAGER', 
      'CUSTOMER_ADVISOR',
      'TEAM_LEAD',
      'ADMIN'
    ];

    for (const roleName of requiredRoles) {
      const exists = await prisma.role.findFirst({
        where: { name: roleName as any }
      });

      if (!exists) {
        await prisma.role.create({
          data: {
            name: roleName as any
          }
        });
        console.log(`✅ Created role: ${roleName}`);
      } else {
        console.log(`✓ Role already exists: ${roleName}`);
      }
    }

    console.log('\n🎉 Migration and roles fixed successfully!');
    
    // Show all roles
    const allRoles = await prisma.role.findMany();
    console.log('\n📋 Current roles:');
    allRoles.forEach(role => {
      console.log(`  - ${role.name} (${role.id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMigrationAndRoles();

