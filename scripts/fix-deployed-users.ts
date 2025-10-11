import { PrismaClient } from '@prisma/client';
import * as admin from 'firebase-admin';

// This script runs on the deployed backend using the DATABASE_URL environment variable
const prisma = new PrismaClient();

// Initialize Firebase Admin using environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

async function fixDeployedUsers() {
  try {
    console.log('🚀 Fixing users in deployed database...');
    
    // Step 1: Check current state
    console.log('\n📊 Step 1: Checking current database state...');
    const userCount = await prisma.user.count();
    console.log('Current user count:', userCount);
    
    // Check if our specific user exists
    const specificUser = await prisma.user.findUnique({
      where: { firebaseUid: 'g5Fr20vtaMZkjCxLRJJr9WORGJc2' }
    });
    console.log('advisor.new@test.com user:', specificUser ? 'EXISTS' : 'NOT FOUND');
    
    // Step 2: Get Firebase users
    console.log('\n🔥 Step 2: Getting Firebase users...');
    const listUsersResult = await admin.auth().listUsers(100);
    console.log(`Found ${listUsersResult.users.length} Firebase users`);
    
    // Step 3: Get roles
    console.log('\n👥 Step 3: Getting roles...');
    const roles = await prisma.role.findMany();
    console.log(`Found ${roles.length} roles:`, roles.map(r => r.name).join(', '));
    
    // Step 4: Create/update users
    console.log('\n👤 Step 4: Creating/updating users...');
    
    for (const firebaseUser of listUsersResult.users) {
      try {
        const email = firebaseUser.email;
        if (!email) continue;
        
        const name = firebaseUser.displayName || email.split('@')[0];
        const firebaseUid = firebaseUser.uid;
        
        // Determine role based on email
        let roleName: string = 'CUSTOMER_ADVISOR';
        if (email.includes('admin')) roleName = 'ADMIN';
        if (email.includes('manager')) roleName = 'GENERAL_MANAGER';
        if (email.includes('lead')) roleName = 'TEAM_LEAD';
        if (email.includes('sales')) roleName = 'SALES_MANAGER';
        
        const role = roles.find(r => r.name === roleName);
        if (!role) {
          console.warn(`⚠️ Role ${roleName} not found for ${email}`);
          continue;
        }
        
        // Generate employee ID
        const existingCount = await prisma.user.count({
          where: {
            employeeId: { startsWith: roleName === 'CUSTOMER_ADVISOR' ? 'ADV' : 'EMP' },
            role: { name: roleName as any }
          }
        });
        
        const employeeId = roleName === 'CUSTOMER_ADVISOR' 
          ? `ADV${String(existingCount + 1).padStart(3, '0')}`
          : `EMP${String(existingCount + 1).padStart(3, '0')}`;
        
        // Insert or update user
        await prisma.user.upsert({
          where: { firebaseUid },
          update: {
            name,
            email,
            roleId: role.id,
            employeeId,
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            firebaseUid,
            name,
            email,
            roleId: role.id,
            employeeId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ ${email} -> ${roleName} (${employeeId})`);
        
      } catch (error: any) {
        console.error(`❌ Error processing ${firebaseUser.email}:`, error.message);
      }
    }
    
    // Step 5: Verify the fix
    console.log('\n✅ Step 5: Verifying the fix...');
    const finalUserCount = await prisma.user.count();
    console.log('Final user count:', finalUserCount);
    
    const verifiedUser = await prisma.user.findUnique({
      where: { firebaseUid: 'g5Fr20vtaMZkjCxLRJJr9WORGJc2' },
      include: { role: true }
    });
    
    if (verifiedUser) {
      console.log('🎉 SUCCESS! advisor.new@test.com is now in deployed database:');
      console.log('   Email:', verifiedUser.email);
      console.log('   Employee ID:', verifiedUser.employeeId);
      console.log('   Role:', verifiedUser.role.name);
      console.log('   Active:', verifiedUser.isActive);
    } else {
      console.log('❌ ERROR: advisor.new@test.com still not found');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDeployedUsers();
