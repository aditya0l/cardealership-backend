import { PrismaClient } from '@prisma/client';
import * as admin from 'firebase-admin';
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

async function createUsersInDeployedDB() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🚀 Creating users in deployed database...\n');

    // Step 1: Get or create roles
    console.log('Step 1: Ensuring roles exist...');
    const roles = await prisma.role.findMany();
    console.log(`✅ Found ${roles.length} roles`);

    const advisorRole = roles.find(r => r.name === 'CUSTOMER_ADVISOR');
    const adminRole = roles.find(r => r.name === 'ADMIN');

    if (!advisorRole || !adminRole) {
      console.log('❌ Required roles not found!');
      return;
    }

    // Step 2: Get Firebase users
    console.log('\nStep 2: Getting Firebase users...');
    const listUsersResult = await admin.auth().listUsers(100);
    console.log(`✅ Found ${listUsersResult.users.length} Firebase users`);

    // Step 3: Create database users for each Firebase user
    console.log('\nStep 3: Creating database users...\n');

    for (const firebaseUser of listUsersResult.users) {
      try {
        // Check if user already exists
        const existing = await prisma.user.findUnique({
          where: { firebaseUid: firebaseUser.uid }
        });

        if (existing) {
          console.log(`⏭️  ${firebaseUser.email} - already exists`);
          continue;
        }

        // Determine role based on email
        let roleId = advisorRole.id;
        if (firebaseUser.email?.includes('admin')) {
          roleId = adminRole.id;
        }

        // Create user
        const user = await prisma.user.create({
          data: {
            firebaseUid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email!,
            roleId: roleId,
            isActive: true
          }
        });

        console.log(`✅ Created: ${user.email}`);
        console.log(`   Firebase UID: ${user.firebaseUid}`);
        console.log(`   Role: ${roleId === advisorRole.id ? 'CUSTOMER_ADVISOR' : 'ADMIN'}\n`);

      } catch (error: any) {
        console.error(`❌ Error creating ${firebaseUser.email}:`, error.message);
      }
    }

    // Step 4: Verify
    console.log('\nStep 4: Verifying users in database...');
    const dbUsers: any = await prisma.$queryRaw`
      SELECT u.email, u."firebaseUid", r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u."roleId" = r.id
    `;
    
    console.log(`\n✅ Total users in database: ${dbUsers.length}\n`);
    dbUsers.forEach((u: any) => {
      console.log(`   ${u.email} - ${u.role_name}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUsersInDeployedDB();

