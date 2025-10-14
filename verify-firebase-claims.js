// verify-firebase-claims.js
// Verify what Firebase actually has for custom claims
const admin = require('firebase-admin');
require('dotenv').config();

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

async function verifyUserClaims(email) {
  try {
    console.log(`🔍 Checking Firebase claims for: ${email}\n`);
    
    // Get user from Firebase
    const firebaseUser = await admin.auth().getUserByEmail(email);
    
    console.log('📊 Firebase User Info:');
    console.log('   UID:', firebaseUser.uid);
    console.log('   Email:', firebaseUser.email);
    console.log('   Display Name:', firebaseUser.displayName);
    console.log('');
    console.log('🔑 Custom Claims:');
    console.log(JSON.stringify(firebaseUser.customClaims, null, 2));
    console.log('');
    
    if (!firebaseUser.customClaims || !firebaseUser.customClaims.role) {
      console.log('⚠️  NO CUSTOM CLAIMS SET!');
      console.log('   This user has no role in Firebase custom claims.');
      console.log('   Backend should rely on database lookup, not token claims.');
    } else {
      console.log('✅ Custom claims are set');
      console.log(`   Role: ${firebaseUser.customClaims.role}`);
      console.log(`   Employee ID: ${firebaseUser.customClaims.employeeId}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get email from command line
const email = process.argv[2] || 'test3@test.com';
verifyUserClaims(email).then(() => process.exit(0));

