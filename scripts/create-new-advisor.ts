import admin from 'firebase-admin';
import prisma from '../src/config/db';

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

async function createNewAdvisor() {
  console.log('🔧 Creating new advisor user...\n');

  try {
    const email = 'newadvisor@test.com';
    const password = 'testpassword123';
    const name = 'New Test Advisor';

    // Step 1: Create Firebase user
    console.log('Step 1: Creating Firebase user...');
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false
    });

    console.log(`✅ Firebase user created: ${firebaseUser.uid}`);

    // Step 2: Find CUSTOMER_ADVISOR role
    console.log('\nStep 2: Finding CUSTOMER_ADVISOR role...');
    const role = await prisma.role.findFirst({
      where: {
        name: 'CUSTOMER_ADVISOR'
      }
    });

    if (!role) {
      throw new Error('CUSTOMER_ADVISOR role not found');
    }

    console.log(`✅ Role found: ${role.name} (${role.id})`);

    // Step 3: Generate employee ID
    console.log('\nStep 3: Generating employee ID...');
    const { generateEmployeeId } = await import('../src/utils/employee-id-generator');
    const employeeId = await generateEmployeeId('CUSTOMER_ADVISOR');
    console.log(`✅ Employee ID: ${employeeId}`);

    // Step 4: Create database user
    console.log('\nStep 4: Creating database user...');
    const user = await prisma.user.create({
      data: {
        firebaseUid: firebaseUser.uid,
        name,
        email,
        roleId: role.id,
        employeeId,
        isActive: true
      }
    });

    console.log(`✅ Database user created: ${user.firebaseUid}`);

    // Step 5: Show credentials
    console.log('\n🎉 NEW ADVISOR CREATED SUCCESSFULLY!');
    console.log('=====================================');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🆔 Employee ID: ${employeeId}`);
    console.log(`🔥 Firebase UID: ${firebaseUser.uid}`);
    console.log(`📊 Database UID: ${user.firebaseUid}`);
    console.log(`🎭 Role: ${role.name}`);
    console.log('=====================================');
    console.log('\n✅ Ready to use in your Expo app!');

  } catch (error) {
    console.error('❌ Error creating advisor:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createNewAdvisor();
