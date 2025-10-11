import admin from 'firebase-admin';

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

async function testFirebaseAuth() {
  console.log('🔧 Testing Firebase authentication...\n');

  try {
    // Test 1: List users
    console.log('Step 1: Listing Firebase users...');
    const listUsersResult = await admin.auth().listUsers(5);
    console.log(`✅ Found ${listUsersResult.users.length} users:`);
    
    listUsersResult.users.forEach(user => {
      console.log(`  - ${user.email} (${user.uid})`);
    });

    // Test 2: Check specific user
    console.log('\nStep 2: Checking newadvisor@test.com...');
    try {
      const user = await admin.auth().getUserByEmail('newadvisor@test.com');
      console.log(`✅ User found: ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Disabled: ${user.disabled}`);
    } catch (error) {
      console.log(`❌ User not found: ${error}`);
    }

    // Test 3: Generate custom token
    console.log('\nStep 3: Testing custom token generation...');
    try {
      const customToken = await admin.auth().createCustomToken('1qyO2vubyibp1EP4COzzjP4C7wx1');
      console.log(`✅ Custom token generated (length: ${customToken.length})`);
      console.log(`   Token preview: ${customToken.substring(0, 50)}...`);
    } catch (error) {
      console.log(`❌ Custom token error: ${error}`);
    }

  } catch (error) {
    console.error('❌ Firebase test error:', error);
  }
}

testFirebaseAuth();
