// update-firebase-claims.js
// Update Firebase custom claims for a user to match database role
const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    })
  });
}

async function updateUserClaims(email) {
  try {
    console.log(`🔄 Updating Firebase claims for: ${email}`);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      return;
    }
    
    console.log(`📊 Database Role: ${user.role.name}`);
    console.log(`🆔 Employee ID: ${user.employeeId}`);
    
    // Update Firebase custom claims
    await admin.auth().setCustomUserClaims(user.firebaseUid, {
      role: user.role.name,
      roleId: user.role.id,
      employeeId: user.employeeId
    });
    
    console.log(`✅ Firebase claims updated successfully!`);
    console.log(`📝 New claims: role=${user.role.name}, employeeId=${user.employeeId}`);
    console.log('');
    console.log('⚠️  IMPORTANT: User must log out and log back in for changes to take effect!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'test3@test.com';
updateUserClaims(email);

