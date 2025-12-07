import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';

dotenv.config();

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

async function testLogin(email: string, password: string) {
  try {
    console.log(`\n🔍 Testing login for: ${email}`);
    
    // Get user from Firebase
    const user = await admin.auth().getUserByEmail(email);
    console.log('✅ Firebase user found:', user.uid);
    console.log('   Email Verified:', user.emailVerified);
    console.log('   Disabled:', user.disabled);
    
    // Try to verify password (Firebase Admin SDK doesn't have direct password verification)
    // But we can check if user exists and is enabled
    if (user.disabled) {
      console.log('❌ User is disabled');
      return false;
    }
    
    if (!user.emailVerified) {
      console.log('⚠️  Email not verified (this might cause login issues)');
      // Verify email
      await admin.auth().updateUser(user.uid, { emailVerified: true });
      console.log('✅ Email verified');
    }
    
    console.log('✅ User is active and ready for login');
    console.log('\n📋 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Firebase UID:', user.uid);
    
    return true;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testAllUsers() {
  const users = [
    { email: 'admin@test.com', password: 'admin123' },
    { email: 'gm@test.com', password: 'gm12345' },
    { email: 'sm@test.com', password: 'sm12345' },
    { email: 'tl@test.com', password: 'tl12345' },
    { email: 'ca1@test.com', password: 'ca12345' },
    { email: 'ca2@test.com', password: 'ca12345' }
  ];

  console.log('🧪 Testing all user logins...\n');
  console.log('='.repeat(60));

  for (const user of users) {
    await testLogin(user.email, user.password);
    console.log('─'.repeat(60));
  }

  console.log('\n✅ Login test completed!');
  console.log('\n💡 If login still fails, try:');
  console.log('   1. Reset password: npx ts-node scripts/reset-all-passwords.ts');
  console.log('   2. Check Firebase console for user status');
  console.log('   3. Verify backend login endpoint is working');
}

// Test specific user or all users
const email = process.argv[2];
if (email) {
  const password = process.argv[3] || 'tl12345';
  testLogin(email, password)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  testAllUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

