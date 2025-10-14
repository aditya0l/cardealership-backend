// update-firebase-claims-deployed.js
// Update Firebase custom claims using DEPLOYED database
const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Use deployed database URL
const DEPLOYED_DB_URL = "postgresql://dealership_db_user:4Ds1v1zleTGWRchOHlOc6qyJFapCIw1f@dpg-d3ke5i63jp1c73b566c0-a.singapore-postgres.render.com/dealership_db";

const prisma = new PrismaClient({
  datasources: {
    db: { url: DEPLOYED_DB_URL }
  }
});

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
    
    // Get user from deployed database
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
    console.log(`🔥 Firebase UID: ${user.firebaseUid}`);
    
    // Update Firebase custom claims
    await admin.auth().setCustomUserClaims(user.firebaseUid, {
      role: user.role.name,
      roleId: user.role.id,
      employeeId: user.employeeId
    });
    
    console.log(`✅ Firebase claims updated successfully!`);
    console.log(`📝 New claims: role=${user.role.name}, employeeId=${user.employeeId}`);
    console.log('');
    console.log('⚠️  IMPORTANT: User must LOG OUT and LOG BACK IN for changes to take effect!');
    console.log('   The app caches the old token until user re-authenticates.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'test3@test.com';
updateUserClaims(email);

