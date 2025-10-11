import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkUsers() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🔍 Checking users in database...\n');
    
    // Use raw query to avoid Prisma schema issues
    const users: any = await prisma.$queryRaw`
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u."roleId" = r.id 
      ORDER BY u."createdAt" DESC
    `;
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user: any, index: number) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 Firebase UID: ${user.firebaseUid}`);
      console.log(`   🎭 Role: ${user.role_name}`);
      console.log(`   ✅ Active: ${user.isActive}`);
      console.log('');
    });

    // Check for specific advisor
    const advisor: any = await prisma.$queryRaw`
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u."roleId" = r.id 
      WHERE u.email = 'advisor.new@test.com'
    `;
    
    console.log('\n🔍 Checking for advisor.new@test.com...');
    if (advisor.length > 0) {
      console.log('✅ advisor.new@test.com EXISTS');
      console.log(`   Firebase UID: ${advisor[0].firebaseUid}`);
      console.log(`   Role: ${advisor[0].role_name}`);
    } else {
      console.log('❌ advisor.new@test.com NOT FOUND');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

