// Quick script to create test admin user in Firebase Auth
// Run with: npx ts-node create-test-admin.ts

import { auth } from './src/config/firebase';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestAdmin() {
  console.log('🔧 Creating test admin user...\n');

  const testUsers = [
    {
      uid: 'demo_admin_cardealership_com',
      email: 'admin@cardealership.com',
      password: 'Admin123!',
      displayName: 'Admin User',
      role: 'ADMIN'
    },
    {
      uid: 'demo_gm_cardealership_com',
      email: 'gm@cardealership.com',
      password: 'GeneralManager123!',
      displayName: 'General Manager',
      role: 'GENERAL_MANAGER'
    }
  ];

  for (const user of testUsers) {
    try {
      // Check if user exists in Firebase
      try {
        await auth.getUser(user.uid);
        console.log(`✅ Firebase user already exists: ${user.email}`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create in Firebase
          await auth.createUser({
            uid: user.uid,
            email: user.email,
            emailVerified: true,
            password: user.password,
            displayName: user.displayName,
            disabled: false,
          });
          console.log(`✅ Created Firebase user: ${user.email}`);
        }
      }

      // Check if user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { role: true }
      });

      if (!dbUser) {
        // Get the role
        const role = await prisma.role.findFirst({
          where: { name: user.role as any }
        });

        if (role) {
          // Create in database
          await prisma.user.create({
            data: {
              firebaseUid: user.uid,
              email: user.email,
              name: user.displayName,
              roleId: role.id,
              isActive: true
            }
          });
          console.log(`✅ Created database user: ${user.email}`);
        }
      } else {
        console.log(`✅ Database user already exists: ${user.email}`);
      }

      console.log(`\n📧 Login credentials:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}\n`);

    } catch (error: any) {
      console.error(`❌ Error creating user ${user.email}:`, error.message);
    }
  }

  console.log('\n🎉 Test users are ready!');
  console.log('\n🌐 You can now login at: http://localhost:5173');
  
  await prisma.$disconnect();
}

createTestAdmin().catch(console.error);

