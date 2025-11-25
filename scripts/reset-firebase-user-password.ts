#!/usr/bin/env ts-node

/**
 * Reset password for a Firebase user
 * This allows you to set a known password for testing
 */

import { auth } from '../src/config/firebase';

async function resetPassword(email: string, newPassword: string) {
  console.log(`🔧 Resetting password for: ${email}\n`);
  
  try {
    // Get user
    const user = await auth.getUserByEmail(email);
    console.log(`✅ Found user: ${email}`);
    console.log(`   UID: ${user.uid}\n`);
    
    // Update password
    await auth.updateUser(user.uid, {
      password: newPassword
    });
    
    console.log(`✅ Password updated successfully!`);
    console.log(`\n📧 Login Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}\n`);
    console.log('🎉 You can now use these credentials in your Expo app!\n');
    
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log(`❌ User not found: ${email}`);
      console.log('   Create the user first in Firebase Console\n');
    } else {
      console.error(`❌ Error:`, error.message);
    }
    throw error;
  }
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.log('Usage: npx ts-node scripts/reset-firebase-user-password.ts <email> <new-password>');
    console.log('');
    console.log('Examples:');
    console.log('  npx ts-node scripts/reset-firebase-user-password.ts test1@test.com Test123456');
    console.log('  npx ts-node scripts/reset-firebase-user-password.ts advisor.new@test.com testpassword123');
    process.exit(1);
  }
  
  await resetPassword(email, password);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

