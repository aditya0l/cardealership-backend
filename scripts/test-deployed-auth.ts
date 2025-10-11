import * as admin from 'firebase-admin';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

async function testDeployedAuth() {
  try {
    console.log('🔧 Testing authentication on deployed backend...\n');

    // Step 1: Get Firebase user
    console.log('Step 1: Getting advisor.new@test.com from Firebase...');
    const firebaseUser = await admin.auth().getUserByEmail('advisor.new@test.com');
    console.log(`✅ Found in Firebase: ${firebaseUser.email}`);
    console.log(`   UID: ${firebaseUser.uid}`);
    console.log(`   Disabled: ${firebaseUser.disabled}`);

    // Step 2: Generate a custom token
    console.log('\nStep 2: Generating custom token...');
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
    console.log(`✅ Custom token generated (length: ${customToken.length})`);

    // Step 3: Try to use the token with the deployed backend
    console.log('\nStep 3: Testing token with deployed backend...');
    const backendUrl = 'https://automotive-backend-frqe.onrender.com';
    
    try {
      const response = await axios.get(`${backendUrl}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${customToken}`
        }
      });
      console.log('✅ Backend response:', response.data);
    } catch (error: any) {
      console.log('❌ Backend error:', error.response?.status, error.response?.data);
      
      if (error.response?.status === 401) {
        console.log('\n🔍 The backend is rejecting the token.');
        console.log('This could be because:');
        console.log('1. Custom tokens need to be exchanged for ID tokens first');
        console.log('2. The Firebase project mismatch');
        console.log('3. The user exists in database but with wrong Firebase UID');
      }
    }

    // Step 4: Check if user exists in database with correct UID
    console.log('\nStep 4: Checking if user exists in database...');
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    const dbUser: any = await prisma.$queryRaw`
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u."roleId" = r.id 
      WHERE u.email = 'advisor.new@test.com'
    `;

    if (dbUser.length > 0) {
      console.log('✅ User found in database:');
      console.log(`   Email: ${dbUser[0].email}`);
      console.log(`   Database Firebase UID: ${dbUser[0].firebaseUid}`);
      console.log(`   Firebase actual UID: ${firebaseUser.uid}`);
      console.log(`   UIDs match: ${dbUser[0].firebaseUid === firebaseUser.uid ? '✅ YES' : '❌ NO'}`);
      console.log(`   Role: ${dbUser[0].role_name}`);
      console.log(`   Active: ${dbUser[0].isActive}`);

      if (dbUser[0].firebaseUid !== firebaseUser.uid) {
        console.log('\n❌ MISMATCH! The Firebase UID in database is different from Firebase!');
        console.log('This is why authentication fails.');
      }
    } else {
      console.log('❌ User NOT found in database!');
    }

    await prisma.$disconnect();

  } catch (error: any) {
    console.error('❌ Test error:', error.message);
  }
}

testDeployedAuth();

