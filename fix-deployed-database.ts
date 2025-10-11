import { PrismaClient } from '@prisma/client';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

// Use the Render database URL
const RENDER_DATABASE_URL = 'postgresql://dealership_db_user:4Ds1v1zleTGWRchOHlOc6qyJFapCIw1f@dpg-d3ke5i63jp1c73b566c0-a/dealership_db';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: RENDER_DATABASE_URL
    }
  }
});

// Initialize Firebase Admin
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

async function fixDeployedDatabase() {
  try {
    console.log('🚀 Fixing deployed Render database...');
    console.log('Database URL:', RENDER_DATABASE_URL.substring(0, 50) + '...');
    
    // Step 1: Check current state
    console.log('\n📊 Step 1: Checking current database state...');
    const userCount = await prisma.user.count();
    console.log('Current user count:', userCount);
    
    // Check if our specific user exists
    const specificUser = await prisma.user.findUnique({
      where: { firebaseUid: 'g5Fr20vtaMZkjCxLRJJr9WORGJc2' }
    });
    console.log('advisor.new@test.com user:', specificUser ? 'EXISTS' : 'NOT FOUND');
    
    // Step 2: Apply migration (add employee_id column if missing)
    console.log('\n🔧 Step 2: Applying migration...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;
      `;
      console.log('✅ Added employee_id column');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('✅ employee_id column already exists');
      } else {
        console.log('⚠️ Migration error:', error.message);
      }
    }
    
    // Step 3: Get Firebase users
    console.log('\n🔥 Step 3: Getting Firebase users...');
    const listUsersResult = await admin.auth().listUsers(100);
    console.log(`Found ${listUsersResult.users.length} Firebase users`);
    
    // Step 4: Get roles
    console.log('\n👥 Step 4: Getting roles...');
    const roles = await prisma.role.findMany();
    console.log(`Found ${roles.length} roles:`, roles.map(r => r.name).join(', '));
    
    // Step 5: Create/update users in deployed database
    console.log('\n👤 Step 5: Creating/updating users in deployed database...');
    
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
    
    // Step 6: Verify the fix
    console.log('\n✅ Step 6: Verifying the fix...');
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

fixDeployedDatabase();
