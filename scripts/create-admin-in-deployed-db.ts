import { PrismaClient, RoleName } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';

dotenv.config();

const prisma = new PrismaClient();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

async function createAdminUser() {
  try {
    console.log('🔧 Creating/updating admin user in deployed database...\n');

    // 1. Find or verify Firebase user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail('admin.new@test.com');
      console.log('✅ Firebase user found:');
      console.log('   Email:', firebaseUser.email);
      console.log('   UID:', firebaseUser.uid);
    } catch (error) {
      console.log('❌ Firebase user not found. Creating...');
      firebaseUser = await admin.auth().createUser({
        email: 'admin.new@test.com',
        password: 'testpassword123',
        displayName: 'Admin User',
        emailVerified: true,
      });
      console.log('✅ Firebase user created with UID:', firebaseUser.uid);
    }

    // 2. Find ADMIN role
    const adminRole = await prisma.role.findUnique({
      where: { name: RoleName.ADMIN }
    });

    if (!adminRole) {
      console.error('❌ ADMIN role not found in database!');
      process.exit(1);
    }

    console.log('\n✅ ADMIN role found with ID:', adminRole.id);

    // 3. Create or update user in database
    const user = await prisma.user.upsert({
      where: {
        firebaseUid: firebaseUser.uid
      },
      update: {
        email: 'admin.new@test.com',
        name: 'Admin User',
        roleId: adminRole.id,
        isActive: true,
      },
      create: {
        firebaseUid: firebaseUser.uid,
        email: 'admin.new@test.com',
        name: 'Admin User',
        employeeId: 'ADM001',
        roleId: adminRole.id,
        isActive: true,
      },
      include: {
        role: true
      }
    });

    console.log('\n✅ User created/updated in database:');
    console.log('   Email:', user.email);
    console.log('   Firebase UID:', user.firebaseUid);
    console.log('   Employee ID:', user.employeeId);
    console.log('   Role:', user.role.name);
    console.log('   Is Active:', user.isActive);

    console.log('\n🎉 SUCCESS! Admin user is ready.');
    console.log('\n🔑 Login credentials:');
    console.log('   Email: admin.new@test.com');
    console.log('   Password: testpassword123');
    console.log('   Role: ADMIN');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();

