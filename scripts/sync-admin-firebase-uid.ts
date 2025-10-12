#!/usr/bin/env ts-node
/**
 * Sync admin users - update database with correct Firebase UIDs
 */

import { PrismaClient, RoleName } from '@prisma/client';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

async function syncAdminUsers() {
  console.log('🔄 Syncing admin users Firebase UID with database...\n');

  const usersToSync = [
    { email: 'admin.new@test.com', expectedRole: RoleName.ADMIN },
    { email: 'admin@dealership.com', expectedRole: RoleName.ADMIN },
    { email: 'advisor.new@test.com', expectedRole: RoleName.CUSTOMER_ADVISOR },
  ];

  for (const userInfo of usersToSync) {
    try {
      console.log(`\n🔍 Processing: ${userInfo.email}`);
      
      // Get user from Firebase
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUserByEmail(userInfo.email);
        console.log(`   ✅ Found in Firebase (UID: ${firebaseUser.uid})`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`   ❌ NOT in Firebase - creating...`);
          
          // Create in Firebase
          firebaseUser = await admin.auth().createUser({
            email: userInfo.email,
            password: 'testpassword123',
            displayName: userInfo.email.split('@')[0].replace('.', ' '),
            emailVerified: true,
          });
          
          console.log(`   ✅ Created in Firebase (UID: ${firebaseUser.uid})`);
        } else {
          throw error;
        }
      }

      // Get role from database
      const role = await prisma.role.findUnique({
        where: { name: userInfo.expectedRole }
      });

      if (!role) {
        console.log(`   ❌ Role ${userInfo.expectedRole} not found in database`);
        continue;
      }

      // Generate employee ID
      const rolePrefix = userInfo.expectedRole === RoleName.ADMIN ? 'ADM' : 
                        userInfo.expectedRole === RoleName.CUSTOMER_ADVISOR ? 'ADV' : 'EMP';
      
      const existingCount = await prisma.user.count({
        where: {
          employeeId: { startsWith: rolePrefix },
          role: { name: userInfo.expectedRole }
        }
      });
      
      const employeeId = `${rolePrefix}${String(existingCount + 1).padStart(3, '0')}`;

      // Upsert user in database
      const dbUser = await prisma.user.upsert({
        where: { firebaseUid: firebaseUser.uid },
        update: {
          email: userInfo.email,
          isActive: true,
          roleId: role.id,
        },
        create: {
          firebaseUid: firebaseUser.uid,
          email: userInfo.email,
          name: firebaseUser.displayName || userInfo.email.split('@')[0],
          employeeId,
          roleId: role.id,
          isActive: true,
        },
        include: {
          role: true
        }
      });

      console.log(`   ✅ Synced in database:`);
      console.log(`      Firebase UID: ${dbUser.firebaseUid}`);
      console.log(`      Employee ID: ${dbUser.employeeId}`);
      console.log(`      Role: ${dbUser.role.name}`);

    } catch (error: any) {
      console.error(`   ❌ Error processing ${userInfo.email}:`, error.message);
    }
  }

  console.log('\n✅ Sync complete!\n');
  console.log('🔑 Test these credentials:');
  console.log('   admin.new@test.com / testpassword123');
  console.log('   admin@dealership.com / testpassword123');
  console.log('   advisor.new@test.com / testpassword123');
}

syncAdminUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

