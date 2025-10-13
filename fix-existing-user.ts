// Quick script to fix existing users without employeeId
// Run with: npx ts-node fix-existing-user.ts

import { PrismaClient, RoleName } from '@prisma/client';
import { generateEmployeeId } from './src/utils/employee-id-generator';

const prisma = new PrismaClient();

async function fixExistingUsers() {
  console.log('🔧 Fixing users without employee IDs...\n');

  try {
    // Find all users without employee ID
    const usersWithoutEmployeeId = await prisma.user.findMany({
      where: {
        employeeId: null
      },
      include: {
        role: true
      }
    });

    if (usersWithoutEmployeeId.length === 0) {
      console.log('✅ No users need fixing - all have employee IDs');
      return;
    }

    console.log(`📋 Found ${usersWithoutEmployeeId.length} users without employee ID:\n`);

    for (const user of usersWithoutEmployeeId) {
      console.log(`👤 User: ${user.email}`);
      console.log(`   Role: ${user.role.name}`);
      console.log(`   Firebase UID: ${user.firebaseUid}`);
      
      // Generate employee ID based on role
      const employeeId = await generateEmployeeId(user.role.name);
      
      // Update user with employee ID
      await prisma.user.update({
        where: {
          firebaseUid: user.firebaseUid
        },
        data: {
          employeeId
        }
      });

      console.log(`   ✅ Updated with employee ID: ${employeeId}\n`);
    }

    console.log('🎉 All users fixed successfully!');
    
    // Show updated users
    const updatedUsers = await prisma.user.findMany({
      select: {
        email: true,
        employeeId: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('\n📊 Current users:');
    updatedUsers.forEach(u => {
      console.log(`   ${u.email} (${u.employeeId}) - ${u.role.name}`);
    });

  } catch (error) {
    console.error('❌ Error fixing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingUsers();

