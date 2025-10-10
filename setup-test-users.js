// Firebase Test Users Creation Script
// Run this script to create test users for each role

const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test users for each role
const testUsers = [
  {
    email: 'admin@dealership.com',
    password: 'Admin123!',
    name: 'Test Admin',
    roleName: 'ADMIN'
  },
  {
    email: 'generalmanager@dealership.com', 
    password: 'Manager123!',
    name: 'Test General Manager',
    roleName: 'GENERAL_MANAGER'
  },
  {
    email: 'salesmanager@dealership.com',
    password: 'Sales123!', 
    name: 'Test Sales Manager',
    roleName: 'SALES_MANAGER'
  },
  {
    email: 'teamlead@dealership.com',
    password: 'Lead123!',
    name: 'Test Team Lead', 
    roleName: 'TEAM_LEAD'
  },
  {
    email: 'advisor@dealership.com',
    password: 'Advisor123!',
    name: 'Test Customer Advisor',
    roleName: 'CUSTOMER_ADVISOR'  
  }
];

async function createTestUsers() {
  console.log('🔧 Creating Firebase test users...\n');
  
  for (const userData of testUsers) {
    try {
      // Create Firebase user
      const userRecord = await admin.auth().createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
        emailVerified: true
      });
      
      console.log(`✅ Created Firebase user: ${userData.email}`);
      
      // Get role from database
      const role = await prisma.role.findUnique({
        where: { name: userData.roleName }
      });
      
      if (!role) {
        console.log(`❌ Role ${userData.roleName} not found in database`);
        continue;
      }
      
      // Create user in our database
      const dbUser = await prisma.user.create({
        data: {
          firebaseUid: userRecord.uid,
          name: userData.name,
          email: userData.email,
          roleId: role.id,
          isActive: true
        }
      });
      
      console.log(`✅ Created database user: ${userData.name} (${userData.roleName})`);
      
      // Set custom claims for role-based access
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: userData.roleName,
        roleId: role.id
      });
      
      console.log(`✅ Set custom claims for: ${userData.email}\n`);
      
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }
  
  console.log('🎉 Test users creation completed!');
  console.log('\n📋 Test Users Created:');
  testUsers.forEach(user => {
    console.log(`  ${user.roleName}: ${user.email} / ${user.password}`);
  });
  
  await prisma.$disconnect();
}

// Helper function to generate JWT tokens (for testing)
async function generateTokens() {
  console.log('\n🔑 Generating JWT tokens for testing...\n');
  
  for (const userData of testUsers) {
    try {
      const user = await admin.auth().getUserByEmail(userData.email);
      const customToken = await admin.auth().createCustomToken(user.uid);
      
      console.log(`${userData.roleName}:`);
      console.log(`Email: ${userData.email}`);
      console.log(`Custom Token: ${customToken.substring(0, 50)}...`);
      console.log('---');
      
    } catch (error) {
      console.error(`❌ Error generating token for ${userData.email}:`, error.message);
    }
  }
}

// Run the setup
if (require.main === module) {
  createTestUsers()
    .then(() => {
      console.log('\n💡 Next steps:');
      console.log('1. Use these credentials to sign in via Firebase Auth');
      console.log('2. Get ID tokens from Firebase');  
      console.log('3. Use tokens in Postman Authorization headers');
      console.log('4. Test different role permissions');
    })
    .catch(error => {
      console.error('Setup failed:', error);
    });
}

module.exports = { createTestUsers, generateTokens, testUsers };
