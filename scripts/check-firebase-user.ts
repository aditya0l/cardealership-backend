#!/usr/bin/env ts-node

/**
 * Check a specific Firebase user and verify they can login
 */

import { auth } from '../src/config/firebase';
import prisma from '../src/config/db';

async function checkUser(email: string) {
  console.log(`🔍 Checking Firebase user: ${email}\n`);
  
  try {
    // Check Firebase
    const firebaseUser = await auth.getUserByEmail(email);
    console.log('✅ User exists in Firebase:');
    console.log(`   Email: ${firebaseUser.email}`);
    console.log(`   UID: ${firebaseUser.uid}`);
    console.log(`   Email Verified: ${firebaseUser.emailVerified}`);
    console.log(`   Disabled: ${firebaseUser.disabled}`);
    console.log(`   Created: ${new Date(firebaseUser.metadata.creationTime).toLocaleString()}`);
    console.log(`   Last Sign In: ${firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).toLocaleString() : 'Never'}`);
    console.log(`   Custom Claims:`, firebaseUser.customClaims || 'None');
    console.log('');
    
    // Check database
    try {
      const dbUser = await prisma.user.findUnique({
        where: { firebaseUid: firebaseUser.uid },
        include: { role: true, dealership: true }
      });
      
      if (dbUser) {
        console.log('✅ User exists in database:');
        console.log(`   Name: ${dbUser.name}`);
        console.log(`   Role: ${dbUser.role.name}`);
        console.log(`   Employee ID: ${dbUser.employeeId || 'Not set'}`);
        console.log(`   Active: ${dbUser.isActive}`);
        console.log(`   Dealership: ${dbUser.dealership?.name || 'None'}`);
        console.log('');
      } else {
        console.log('⚠️  User NOT found in database');
        console.log('   User exists in Firebase but not in database');
        console.log('   This user needs to sync to database\n');
      }
    } catch (dbError: any) {
      console.log('⚠️  Database check failed:', dbError.message);
      console.log('');
    }
    
    console.log('📝 To login in Expo app:');
    console.log(`   Email: ${email}`);
    console.log('   Password: (You set this when creating the user in Firebase Console)');
    console.log('   ⚠️  If you forgot the password, you need to reset it in Firebase Console\n');
    
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log('❌ User does NOT exist in Firebase Authentication');
      console.log('   This is why login is failing!');
      console.log('');
      console.log('💡 Solution: Create the user in Firebase Console:');
      console.log('   1. Go to: https://console.firebase.google.com/');
      console.log('   2. Project: car-dealership-app-9f2d5');
      console.log('   3. Authentication → Users → Add user');
      console.log(`   4. Email: ${email}`);
      console.log('   5. Set a password');
      console.log('   6. Click Add user\n');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: npx ts-node scripts/check-firebase-user.ts <email>');
    console.log('');
    console.log('Examples:');
    console.log('  npx ts-node scripts/check-firebase-user.ts test1@test.com');
    console.log('  npx ts-node scripts/check-firebase-user.ts advisor.new@test.com');
    process.exit(1);
  }
  
  await checkUser(email);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

