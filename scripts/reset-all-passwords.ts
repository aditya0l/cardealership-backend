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

interface UserPassword {
  email: string;
  password: string;
  name: string;
}

const USERS: UserPassword[] = [
  { email: 'admin@test.com', password: 'admin123', name: 'Admin User' },
  { email: 'gm@test.com', password: 'gm12345', name: 'General Manager' },
  { email: 'sm@test.com', password: 'sm12345', name: 'Sales Manager' },
  { email: 'tl@test.com', password: 'tl12345', name: 'Team Lead' },
  { email: 'ca1@test.com', password: 'ca12345', name: 'Customer Advisor 1' },
  { email: 'ca2@test.com', password: 'ca12345', name: 'Customer Advisor 2' }
];

async function resetAllPasswords() {
  console.log('🔧 Resetting passwords for all test users...\n');
  console.log('='.repeat(60));

  const results: Array<{ email: string; status: string; uid?: string }> = [];

  for (const user of USERS) {
    try {
      // Try to get existing user
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUserByEmail(user.email);
        console.log(`\n✅ Found user: ${user.email} (${firebaseUser.uid})`);
        
        // Update password
        await admin.auth().updateUser(firebaseUser.uid, {
          password: user.password,
          emailVerified: true
        });
        
        console.log(`   ✅ Password reset to: ${user.password}`);
        results.push({ email: user.email, status: 'UPDATED', uid: firebaseUser.uid });
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create new user
          console.log(`\n📝 Creating new user: ${user.email}`);
          firebaseUser = await admin.auth().createUser({
            email: user.email,
            password: user.password,
            displayName: user.name,
            emailVerified: true,
          });
          console.log(`   ✅ User created (UID: ${firebaseUser.uid})`);
          results.push({ email: user.email, status: 'CREATED', uid: firebaseUser.uid });
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          results.push({ email: user.email, status: 'ERROR', uid: undefined });
        }
      }
    } catch (error: any) {
      console.error(`\n❌ Error processing ${user.email}:`, error.message);
      results.push({ email: user.email, status: 'ERROR', uid: undefined });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Summary:');
  console.log('─'.repeat(60));
  results.forEach(result => {
    const icon = result.status === 'ERROR' ? '❌' : '✅';
    console.log(`${icon} ${result.email}: ${result.status}`);
    if (result.uid) {
      console.log(`   UID: ${result.uid}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Password reset process completed!');
  console.log('\n📋 All Credentials:');
  console.log('─'.repeat(60));
  USERS.forEach(user => {
    console.log(`\n${user.name}:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.password}`);
  });
}

resetAllPasswords()
  .then(() => {
    console.log('\n🎉 All passwords reset successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

