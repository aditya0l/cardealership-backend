#!/usr/bin/env ts-node
/**
 * Verify Firebase users exist and can authenticate
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

async function verifyUsers() {
  console.log('🔍 Verifying Firebase users...\n');

  const emailsToCheck = [
    'admin.new@test.com',
    'admin@dealership.com',
    'advisor.new@test.com'
  ];

  for (const email of emailsToCheck) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      
      console.log(`✅ Found: ${email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Display Name: ${user.displayName || 'Not set'}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Disabled: ${user.disabled}`);
      console.log(`   Created: ${new Date(user.metadata.creationTime).toLocaleString()}`);
      console.log(`   Last Sign In: ${user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'Never'}`);
      console.log('');
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`❌ NOT FOUND: ${email}`);
        console.log(`   This user needs to be created in Firebase\n`);
      } else {
        console.error(`❌ Error checking ${email}:`, error.message);
        console.log('');
      }
    }
  }
  
  // List all Firebase users
  console.log('\n📋 All Firebase Users:');
  const listUsersResult = await admin.auth().listUsers(100);
  console.log(`Total: ${listUsersResult.users.length}\n`);
  
  listUsersResult.users.forEach((user) => {
    console.log(`- ${user.email || 'No email'}`);
    console.log(`  UID: ${user.uid}`);
    console.log(`  Disabled: ${user.disabled}`);
    console.log('');
  });
}

verifyUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

