const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDatabaseUsers() {
  console.log('👥 Creating database user records to match Firebase users...\n');
  
  const users = [
    {
      firebaseUid: 'admin-user-001',
      email: 'admin@cardealership.com',
      name: 'System Administrator',
      roleName: 'ADMIN'
    },
    {
      firebaseUid: 'gm-user-001',
      email: 'gm@cardealership.com',
      name: 'John General Manager',
      roleName: 'GENERAL_MANAGER'
    },
    {
      firebaseUid: 'sm-user-001',
      email: 'sm@cardealership.com',
      name: 'Jane Sales Manager',
      roleName: 'SALES_MANAGER'
    },
    {
      firebaseUid: 'tl-user-001',
      email: 'tl@cardealership.com',
      name: 'Mike Team Lead',
      roleName: 'TEAM_LEAD'
    },
    {
      firebaseUid: 'advisor-user-001',
      email: 'advisor@cardealership.com',
      name: 'Sarah Customer Advisor',
      roleName: 'CUSTOMER_ADVISOR'
    }
  ];

  try {
    for (const userData of users) {
      // Find the role ID
      const role = await prisma.role.findUnique({
        where: { name: userData.roleName }
      });
      
      if (!role) {
        console.log(`❌ Role ${userData.roleName} not found`);
        continue;
      }

      // Create or update user
      const user = await prisma.user.upsert({
        where: { firebaseUid: userData.firebaseUid },
        update: {
          email: userData.email,
          name: userData.name,
          roleId: role.id,
          isActive: true
        },
        create: {
          firebaseUid: userData.firebaseUid,
          email: userData.email,
          name: userData.name,
          roleId: role.id,
          isActive: true
        }
      });

      console.log(`✅ Created/Updated user: ${userData.email} (${userData.roleName})`);
    }

    console.log('\n📊 Database Users Summary:');
    console.log('=========================');
    
    const allUsers = await prisma.user.findMany({
      include: { role: true }
    });
    
    allUsers.forEach(user => {
      console.log(`👤 ${user.email} | ${user.role.name} | Active: ${user.isActive}`);
    });
    
    console.log(`\n🎉 Successfully created ${allUsers.length} database user records!`);
    
  } catch (error) {
    console.error('❌ Error creating users:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createDatabaseUsers();
