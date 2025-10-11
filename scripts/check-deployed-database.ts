import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkDeployedDatabase() {
  // Use the Render database URL from environment
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🔍 Checking deployed database...\n');
    
    // Check users
    console.log('👥 Users in database:');
    const users = await prisma.user.findMany({
      include: {
        role: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 Firebase UID: ${user.firebaseUid}`);
      console.log(`   🎭 Role: ${user.role.name}`);
      console.log(`   ✅ Active: ${user.isActive}`);
      console.log('');
    });

    // Check if advisor.new@test.com exists
    console.log('\n🔍 Checking for advisor.new@test.com...');
    const advisor = await prisma.user.findUnique({
      where: { email: 'advisor.new@test.com' },
      include: { role: true }
    });
    
    if (advisor) {
      console.log('✅ advisor.new@test.com EXISTS in database');
      console.log(`   Firebase UID: ${advisor.firebaseUid}`);
      console.log(`   Role: ${advisor.role.name}`);
    } else {
      console.log('❌ advisor.new@test.com NOT FOUND in database');
      console.log('   User exists in Firebase but not in database!');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDeployedDatabase();

