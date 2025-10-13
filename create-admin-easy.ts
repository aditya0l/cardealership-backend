#!/usr/bin/env ts-node

/**
 * SUPER SIMPLE ADMIN CREATOR
 * 
 * Usage: npx ts-node create-admin-easy.ts
 * 
 * This script creates an admin user in Firebase.
 * They can then just login to the admin panel and everything else is automatic!
 */

import { auth } from './src/config/firebase';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  console.log('\n🎯 SIMPLE ADMIN CREATOR');
  console.log('=' .repeat(50));
  console.log('\nThis creates a user in Firebase.');
  console.log('They can then login to the admin panel.');
  console.log('Everything else (database, role, employee ID) is automatic!\n');

  try {
    // Get email
    const email = await question('📧 Enter admin email: ');
    if (!email || !email.includes('@')) {
      console.log('❌ Invalid email address');
      process.exit(1);
    }

    // Get password
    const password = await question('🔒 Enter password (min 8 chars): ');
    if (!password || password.length < 8) {
      console.log('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // Get name (optional)
    let name = await question('👤 Enter display name (or press Enter to use email): ');
    if (!name) {
      name = email.split('@')[0];
    }

    console.log('\n⏳ Creating Firebase user...');

    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(email);
      console.log(`\n⚠️  User already exists: ${existingUser.email}`);
      console.log(`   UID: ${existingUser.uid}`);
      console.log(`\n✅ They can login to the admin panel with their password!`);
      process.exit(0);
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
      // User doesn't exist, continue to create
    }

    // Create user in Firebase
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
      disabled: false
    });

    console.log('\n✅ Firebase user created successfully!');
    console.log('=' .repeat(50));
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔒 Password: ${password}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🆔 Firebase UID: ${userRecord.uid}`);
    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 NEXT STEPS:');
    console.log('\n1. Go to admin panel: http://localhost:5173');
    console.log('2. Login with the email and password above');
    console.log('3. System will automatically:');
    console.log('   ✅ Create user in database');
    console.log('   ✅ Assign ADMIN role');
    console.log('   ✅ Generate employee ID');
    console.log('   ✅ Grant full access');
    console.log('\n🚀 That\'s it! No more steps needed!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'auth/email-already-exists') {
      console.log('\n💡 This email is already registered.');
      console.log('   They can login directly to the admin panel!');
    } else if (error.code === 'auth/invalid-email') {
      console.log('\n💡 Please provide a valid email address.');
    } else if (error.code === 'auth/weak-password') {
      console.log('\n💡 Please use a stronger password (min 8 characters).');
    }
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAdmin();

