// fix-all-firebase-claims.js
// Update Firebase custom claims for ALL users to match database roles
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

async function fixAllUserClaims() {
  try {
    console.log('🔄 Syncing Firebase claims for ALL users...\n');
    
    // Get all users from database
    const users = await prisma.user.findMany({
      include: { role: true }
    });
    
    console.log(`Found ${users.length} users in database\n`);
    
    let updated = 0;
    let failed = 0;
    
    for (const user of users) {
      try {
        console.log(`📝 ${user.email}`);
        console.log(`   Database Role: ${user.role.name}`);
        console.log(`   Employee ID: ${user.employeeId}`);
        
        // Update Firebase custom claims
        await admin.auth().setCustomUserClaims(user.firebaseUid, {
          role: user.role.name,
          roleId: user.role.id,
          employeeId: user.employeeId
        });
        
        console.log(`   ✅ Firebase claims updated\n`);
        updated++;
        
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        failed++;
      }
    }
    
    console.log('═'.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Updated: ${updated} ✅`);
    console.log(`   Failed: ${failed} ❌`);
    console.log('═'.repeat(60));
    console.log('');
    console.log('⚠️  IMPORTANT: All users must LOG OUT and LOG BACK IN');
    console.log('   for the changes to take effect in the app!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllUserClaims();

