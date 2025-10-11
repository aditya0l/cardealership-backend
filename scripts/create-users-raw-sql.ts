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

async function createUsersWithRawSQL() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🚀 Creating users in deployed database...\n');

    // Step 1: Get roles
    console.log('Step 1: Getting roles...');
    const roles: any = await prisma.$queryRaw`SELECT * FROM roles`;
    console.log(`✅ Found ${roles.length} roles`);

    const advisorRole = roles.find((r: any) => r.name === 'CUSTOMER_ADVISOR');
    const adminRole = roles.find((r: any) => r.name === 'ADMIN');

    // Step 2: Get Firebase users
    console.log('\nStep 2: Getting Firebase users...');
    const listUsersResult = await admin.auth().listUsers(100);
    console.log(`✅ Found ${listUsersResult.users.length} Firebase users`);

    // Step 3: Create database users
    console.log('\nStep 3: Creating database users...\n');

    for (const firebaseUser of listUsersResult.users) {
      if (!firebaseUser.email) continue;

      try {
        // Check if exists
        const existing: any = await prisma.$queryRaw`
          SELECT * FROM users WHERE "firebaseUid" = ${firebaseUser.uid}
        `;

        if (existing.length > 0) {
          console.log(`⏭️  ${firebaseUser.email} - already exists`);
          continue;
        }

        // Determine role
        let roleId = advisorRole.id;
        if (firebaseUser.email.includes('admin')) {
          roleId = adminRole.id;
        }

        const name = firebaseUser.displayName || firebaseUser.email.split('@')[0];

        // Insert user
        await prisma.$executeRaw`
          INSERT INTO users ("firebaseUid", name, email, "roleId", "isActive", "createdAt", "updatedAt")
          VALUES (${firebaseUser.uid}, ${name}, ${firebaseUser.email}, ${roleId}, true, NOW(), NOW())
        `;

        console.log(`✅ Created: ${firebaseUser.email}`);
        console.log(`   Firebase UID: ${firebaseUser.uid}`);
        console.log(`   Role: ${roleId === advisorRole.id ? 'CUSTOMER_ADVISOR' : 'ADMIN'}\n`);

      } catch (error: any) {
        if (error.message.includes('unique constraint')) {
          console.log(`⏭️  ${firebaseUser.email} - already exists`);
        } else {
          console.error(`❌ Error creating ${firebaseUser.email}:`, error.message);
        }
      }
    }

    // Step 4: Verify
    console.log('\nStep 4: Verifying users in database...');
    const dbUsers: any = await prisma.$queryRaw`
      SELECT u.email, u."firebaseUid", r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u."roleId" = r.id
      ORDER BY u."createdAt" DESC
    `;
    
    console.log(`\n✅ Total users in database: ${dbUsers.length}\n`);
    dbUsers.forEach((u: any) => {
      console.log(`   ${u.email} - ${u.role_name}`);
    });

    // Specifically check for advisor.new@test.com
    console.log('\n🎯 Checking advisor.new@test.com...');
    const advisor = dbUsers.find((u: any) => u.email === 'advisor.new@test.com');
    if (advisor) {
      console.log('✅ advisor.new@test.com is ready to use!');
      console.log(`   Firebase UID: ${advisor.firebaseUid}`);
      console.log(`   Role: ${advisor.role_name}`);
    } else {
      console.log('❌ advisor.new@test.com not found');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUsersWithRawSQL();

