#!/usr/bin/env ts-node

/**
 * List all Firebase users and create missing test users
 * This script uses your backend's Firebase Admin SDK credentials
 */

import { auth } from '../src/config/firebase';
import prisma from '../src/config/db';
import { RoleName } from '@prisma/client';

const TEST_USERS = [
  {
    email: 'test1@test.com',
    password: 'Test123456',
    name: 'Test User 1',
    roleName: 'CUSTOMER_ADVISOR' as RoleName
  },
  {
    email: 'advisor.new@test.com',
    password: 'testpassword123',
    name: 'Test Advisor',
    roleName: 'CUSTOMER_ADVISOR' as RoleName
  },
  {
    email: 'admin.new@test.com',
    password: 'testpassword123',
    name: 'Admin User',
    roleName: 'ADMIN' as RoleName
  }
];

async function listAllFirebaseUsers() {
  console.log('📋 Listing all Firebase users...\n');
  
  try {
    const listUsersResult = await auth.listUsers(1000);
    console.log(`✅ Found ${listUsersResult.users.length} users in Firebase:\n`);
    
    if (listUsersResult.users.length === 0) {
      console.log('❌ No users found in Firebase Authentication!');
      console.log('   This is why login is failing - users must exist in Firebase first.\n');
      return [];
    }
    
    listUsersResult.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || 'No email'}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Disabled: ${user.disabled}`);
      console.log(`   Created: ${new Date(user.metadata.creationTime).toLocaleString()}`);
      console.log('');
    });
    
    return listUsersResult.users;
  } catch (error: any) {
    console.error('❌ Error listing Firebase users:', error.message);
    throw error;
  }
}

async function createFirebaseUser(email: string, password: string, name: string) {
  try {
    console.log(`🔧 Creating Firebase user: ${email}...`);
    
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
      disabled: false
    });
    
    console.log(`✅ Created Firebase user: ${email}`);
    console.log(`   UID: ${userRecord.uid}\n`);
    
    return userRecord;
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`⚠️  User already exists in Firebase: ${email}`);
      try {
        const existingUser = await auth.getUserByEmail(email);
        console.log(`   UID: ${existingUser.uid}\n`);
        return existingUser;
      } catch (e: any) {
        console.log(`   Error fetching existing user: ${e.message}\n`);
        return null;
      }
    } else {
      console.error(`❌ Error creating user ${email}:`, error.message);
      console.log('');
      return null;
    }
  }
}

async function syncUserToDatabase(firebaseUid: string, email: string, name: string, roleName: RoleName) {
  try {
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });
    
    if (!role) {
      console.log(`⚠️  Role ${roleName} not found in database`);
      return null;
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid },
      include: { role: true }
    });
    
    if (existingUser) {
      console.log(`✅ User already exists in database: ${email}`);
      return existingUser;
    }
    
    const dbUser = await prisma.user.create({
      data: {
        firebaseUid,
        email,
        name,
        roleId: role.id,
        isActive: true
      },
      include: { role: true }
    });
    
    console.log(`✅ Created database user: ${email} (${roleName})`);
    
    // Set custom claims in Firebase
    await auth.setCustomUserClaims(firebaseUid, {
      role: roleName,
      roleId: role.id
    });
    
    console.log(`✅ Set custom claims for: ${email}\n`);
    
    return dbUser;
  } catch (error: any) {
    console.error(`❌ Error syncing to database:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔥 Firebase Users Management Script\n');
  console.log('=' .repeat(50));
  console.log('');
  
  // Step 1: List all existing Firebase users
  const existingUsers = await listAllFirebaseUsers();
  const existingEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()).filter(Boolean));
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📦 Creating/Verifying Test Users...\n');
  
  // Step 2: Create missing users
  for (const userData of TEST_USERS) {
    const emailLower = userData.email.toLowerCase();
    
    if (existingEmails.has(emailLower)) {
      console.log(`✅ User already exists in Firebase: ${userData.email}`);
      // Get existing user
      try {
        const firebaseUser = await auth.getUserByEmail(userData.email);
        // Sync to database if needed
        await syncUserToDatabase(
          firebaseUser.uid,
          userData.email,
          userData.name,
          userData.roleName
        );
      } catch (e) {
        console.log(`   Error syncing: ${e}\n`);
      }
    } else {
      // Create new user
      const firebaseUser = await createFirebaseUser(
        userData.email,
        userData.password,
        userData.name
      );
      
      if (firebaseUser) {
        // Sync to database
        await syncUserToDatabase(
          firebaseUser.uid,
          userData.email,
          userData.name,
          userData.roleName
        );
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ SUMMARY - Test Credentials:\n');
  
  TEST_USERS.forEach(user => {
    console.log(`📧 ${user.email}`);
    console.log(`   Password: ${user.password}`);
    console.log(`   Role: ${user.roleName}`);
    console.log('');
  });
  
  console.log('🎉 Done! You can now use these credentials in your Expo app.');
  console.log('');
  
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

