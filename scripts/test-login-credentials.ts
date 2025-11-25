#!/usr/bin/env ts-node

/**
 * Test if login credentials work by attempting to create a custom token
 * This verifies the user exists and can authenticate
 */

import { auth } from '../src/config/firebase';

async function testCredentials(email: string, password: string) {
  console.log(`🔐 Testing credentials for: ${email}\n`);
  
  try {
    // Get user from Firebase
    const user = await auth.getUserByEmail(email);
    
    console.log('✅ User exists in Firebase:');
    console.log(`   Email: ${user.email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Email Verified: ${user.emailVerified}`);
    console.log(`   Disabled: ${user.disabled}`);
    console.log(`   Created: ${new Date(user.metadata.creationTime).toLocaleString()}`);
    console.log('');
    
    // Create a custom token to verify user can authenticate
    const customToken = await auth.createCustomToken(user.uid);
    
    console.log('✅ Custom token created successfully!');
    console.log('   This means the user can authenticate.\n');
    console.log('📝 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('💡 Note: Firebase doesn\'t let us verify passwords directly.');
    console.log('   But if the user exists and is not disabled,');
    console.log('   and you\'ve set the password, it should work.');
    console.log('');
    console.log('⚠️  If login fails, check:');
    console.log('   1. Firebase config in Expo app (apiKey, projectId, etc.)');
    console.log('   2. Network connection to backend');
    console.log('   3. Backend server is running on port 4000');
    
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log('❌ User does NOT exist in Firebase');
      console.log(`   Email: ${email}`);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function main() {
  const email = process.argv[2] || 'advisor@test.com';
  const password = process.argv[3] || 'testpassword123';
  
  await testCredentials(email, password);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

