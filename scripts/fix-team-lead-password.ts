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

async function resetTeamLeadPassword() {
  try {
    const email = 'tl@test.com';
    const newPassword = 'tl12345';

    console.log('🔧 Resetting password for Team Lead user...\n');

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log('✅ Found user:', user.uid);

    // Update password
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
      emailVerified: true
    });

    console.log('✅ Password reset successfully!');
    console.log('\n📋 Updated Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);
    console.log('   Firebase UID:', user.uid);

    // Also verify the user can be retrieved
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\n✅ User verified:');
    console.log('   Email:', updatedUser.email);
    console.log('   Email Verified:', updatedUser.emailVerified);
    console.log('   Disabled:', updatedUser.disabled);

    console.log('\n🎉 Team Lead user is ready to use!');

  } catch (error: any) {
    console.error('❌ Error resetting password:', error.message);
    
    // If user doesn't exist, create it
    if (error.code === 'auth/user-not-found') {
      console.log('\n📝 User not found. Creating new user...');
      try {
        const newUser = await admin.auth().createUser({
          email: 'tl@test.com',
          password: 'tl12345',
          displayName: 'Team Lead',
          emailVerified: true,
        });
        console.log('✅ New user created:', newUser.uid);
        console.log('\n📋 Credentials:');
        console.log('   Email: tl@test.com');
        console.log('   Password: tl12345');
      } catch (createError: any) {
        console.error('❌ Error creating user:', createError.message);
      }
    }
    
    process.exit(1);
  }
}

resetTeamLeadPassword()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

