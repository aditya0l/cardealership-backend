import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function addAdminToDatabase() {
  console.log('🔧 Adding admin users to database...\n');

  const testUsers = [
    {
      firebaseUid: 'demo_admin_cardealership_com',
      email: 'admin@cardealership.com',
      name: 'Admin User',
      roleName: 'ADMIN'
    },
    {
      firebaseUid: 'demo_gm_cardealership_com',
      email: 'gm@cardealership.com',
      name: 'General Manager',
      roleName: 'GENERAL_MANAGER'
    }
  ];

  for (const userData of testUsers) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`✅ User already exists in DB: ${userData.email}`);
        continue;
      }

      // Get the role
      const role = await prisma.role.findFirst({
        where: { name: userData.roleName as any }
      });

      if (!role) {
        console.error(`❌ Role ${userData.roleName} not found`);
        continue;
      }

      // Create user in database
      const user = await prisma.user.create({
        data: {
          firebaseUid: userData.firebaseUid,
          email: userData.email,
          name: userData.name,
          roleId: role.id,
          isActive: true
        },
        include: { role: true }
      });

      console.log(`✅ Created user in database: ${user.email} (${user.role.name})`);
    } catch (error: any) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }

  console.log('\n🎉 Done!');
  await prisma.$disconnect();
}

addAdminToDatabase();
