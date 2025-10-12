import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load .env to get deployed DATABASE_URL
dotenv.config();

// Use the deployed database URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

console.log('🔗 Connecting to DEPLOYED database...');
console.log('   URL:', databaseUrl.substring(0, 30) + '...\n');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function checkDeployedAdminRole() {
  try {
    console.log('🔍 Checking admin.new@test.com in DEPLOYED database...\n');
    
    const user = await prisma.user.findUnique({
      where: { email: 'admin.new@test.com' },
      include: { role: true }
    });

    if (user) {
      console.log('✅ User found in DEPLOYED database:');
      console.log('   Email:', user.email);
      console.log('   Name:', user.name);
      console.log('   Firebase UID:', user.firebaseUid);
      console.log('   Employee ID:', user.employeeId);
      console.log('   Role Name:', user.role.name, user.role.name === 'ADMIN' ? '✅' : '❌ WRONG!');
      console.log('   Role ID:', user.role.id);
      console.log('   Is Active:', user.isActive);
      
      if (user.role.name !== 'ADMIN') {
        console.log('\n❌ PROBLEM FOUND: Role is', user.role.name, 'but should be ADMIN');
        console.log('\n🔧 Fix this by running:');
        console.log('   npx ts-node fix-deployed-admin-role.ts');
      } else {
        console.log('\n✅ Role is correct! Problem must be elsewhere.');
      }
    } else {
      console.log('❌ User NOT found in deployed database');
      console.log('\n🔧 This means the user was never synced to deployed DB');
      console.log('   Run the /api/fix-users endpoint on deployed backend');
    }

    // Also check all users to see what's there
    console.log('\n📋 All users in DEPLOYED database:');
    const allUsers = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    if (allUsers.length === 0) {
      console.log('   ⚠️ NO USERS FOUND! Database might be empty.');
    } else {
      allUsers.forEach(u => {
        console.log(`   - ${u.email} → ${u.role.name}${u.email === 'admin.new@test.com' ? ' 🎯' : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDeployedAdminRole();

