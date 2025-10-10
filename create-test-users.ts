import { auth } from './src/config/firebase';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('🔧 Creating test users from integration guide...\n');

  const testUsers = [
    {
      email: 'admin.new@test.com',
      password: 'testpassword123',
      name: 'Admin User (New)',
      roleName: 'ADMIN'
    },
    {
      email: 'advisor.new@test.com',
      password: 'testpassword123',
      name: 'Test Advisor (New)',
      roleName: 'CUSTOMER_ADVISOR'
    }
  ];

  for (const userData of testUsers) {
    try {
      // Create in Firebase
      let firebaseUser;
      try {
        firebaseUser = await auth.getUserByEmail(userData.email);
        console.log(`✅ Firebase user exists: ${userData.email}`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          firebaseUser = await auth.createUser({
            email: userData.email,
            emailVerified: true,
            password: userData.password,
            displayName: userData.name,
            disabled: false,
          });
          console.log(`✅ Created Firebase user: ${userData.email}`);
        } else {
          throw error;
        }
      }

      // Check database
      let dbUser = await prisma.user.findUnique({
        where: { email: userData.email },
        include: { role: true }
      });

      if (!dbUser) {
        // Get role
        const role = await prisma.role.findFirst({
          where: { name: userData.roleName as any }
        });

        if (role) {
          dbUser = await prisma.user.create({
            data: {
              firebaseUid: firebaseUser.uid,
              email: userData.email,
              name: userData.name,
              roleId: role.id,
              isActive: true
            },
            include: { role: true }
          });
          console.log(`✅ Created database user: ${userData.email} (${dbUser.role.name})`);
        }
      } else {
        // Update UID if mismatch
        if (dbUser.firebaseUid !== firebaseUser.uid) {
          await prisma.user.update({
            where: { email: userData.email },
            data: { firebaseUid: firebaseUser.uid }
          });
          console.log(`✅ Updated UID for: ${userData.email}`);
        } else {
          console.log(`✅ Database user exists: ${userData.email}`);
        }
      }

      console.log(`\n📧 Login: ${userData.email} / ${userData.password}\n`);

    } catch (error: any) {
      console.error(`❌ Error with ${userData.email}:`, error.message);
    }
  }

  console.log('\n🎉 Test users ready!');
  await prisma.$disconnect();
}

createTestUsers();
