import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkAdminRole() {
  try {
    console.log('🔍 Checking admin.new@test.com role in database...\n');
    
    const user = await prisma.user.findUnique({
      where: { email: 'admin.new@test.com' },
      include: { role: true }
    });

    if (user) {
      console.log('✅ User found:');
      console.log('   Email:', user.email);
      console.log('   Name:', user.name);
      console.log('   Firebase UID:', user.firebaseUid);
      console.log('   Employee ID:', user.employeeId);
      console.log('   Role Name:', user.role.name);
      console.log('   Role ID:', user.role.id);
      console.log('   Is Active:', user.isActive);
    } else {
      console.log('❌ User not found in database');
    }

    // Also check what roles exist
    console.log('\n📋 Available roles:');
    const roles = await prisma.role.findMany();
    roles.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminRole();

