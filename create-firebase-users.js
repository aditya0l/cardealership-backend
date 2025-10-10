const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Test users for each role
const testUsers = [
  {
    uid: 'admin-user-001',
    email: 'admin@cardealership.com',
    password: 'Admin123!',
    displayName: 'System Administrator',
    role: 'ADMIN',
    claims: { role: 'ADMIN', userId: 'admin-user-001' }
  },
  {
    uid: 'gm-user-001',
    email: 'gm@cardealership.com',
    password: 'GeneralManager123!',
    displayName: 'John General Manager',
    role: 'GENERAL_MANAGER',
    claims: { role: 'GENERAL_MANAGER', userId: 'gm-user-001' }
  },
  {
    uid: 'sm-user-001',
    email: 'sm@cardealership.com',
    password: 'SalesManager123!',
    displayName: 'Jane Sales Manager',
    role: 'SALES_MANAGER',
    claims: { role: 'SALES_MANAGER', userId: 'sm-user-001' }
  },
  {
    uid: 'tl-user-001',
    email: 'tl@cardealership.com',
    password: 'TeamLead123!',
    displayName: 'Mike Team Lead',
    role: 'TEAM_LEAD',
    claims: { role: 'TEAM_LEAD', userId: 'tl-user-001' }
  },
  {
    uid: 'advisor-user-001',
    email: 'advisor@cardealership.com',
    password: 'Advisor123!',
    displayName: 'Sarah Customer Advisor',
    role: 'CUSTOMER_ADVISOR',
    claims: { role: 'CUSTOMER_ADVISOR', userId: 'advisor-user-001' }
  }
];

async function createFirebaseUsers() {
  console.log('🔥 Creating Firebase test users...\n');
  
  for (const userData of testUsers) {
    try {
      // Create the user
      const userRecord = await admin.auth().createUser({
        uid: userData.uid,
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        emailVerified: true
      });

      // Set custom claims for the user
      await admin.auth().setCustomUserClaims(userData.uid, userData.claims);

      console.log(`✅ Created ${userData.role}: ${userData.email}`);
      console.log(`   UID: ${userRecord.uid}`);
      console.log(`   Password: ${userData.password}`);
      console.log('');

    } catch (error) {
      if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
        console.log(`⚠️  User ${userData.email} already exists, updating claims...`);
        try {
          await admin.auth().setCustomUserClaims(userData.uid, userData.claims);
          console.log(`✅ Updated claims for ${userData.email}\n`);
        } catch (updateError) {
          console.log(`❌ Failed to update claims for ${userData.email}:`, updateError.message);
        }
      } else {
        console.log(`❌ Failed to create ${userData.email}:`, error.message);
      }
    }
  }

  console.log('\n🎉 Firebase users setup complete!');
  console.log('\n📋 Test Credentials Summary:');
  console.log('================================');
  
  testUsers.forEach(user => {
    console.log(`${user.role}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  UID: ${user.uid}`);
    console.log('');
  });

  console.log('💡 Next Steps:');
  console.log('1. Use these credentials to get ID tokens');
  console.log('2. Test API endpoints in Postman');
  console.log('3. Each user has their role set in custom claims');
  
  process.exit(0);
}

// Run the script
createFirebaseUsers().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});