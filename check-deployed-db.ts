import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkDeployedDatabase() {
  try {
    console.log('🔍 Checking deployed database connection...');
    console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    // Check if we can connect
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check user count
    const userCount = await prisma.user.count();
    console.log('📊 Total users in database:', userCount);
    
    // Check if our specific user exists
    const specificUser = await prisma.user.findUnique({
      where: { firebaseUid: 'g5Fr20vtaMZkjCxLRJJr9WORGJc2' },
      select: { email: true, name: true, employeeId: true }
    });
    
    console.log('🎯 advisor.new@test.com user:', specificUser ? 'FOUND' : 'NOT FOUND');
    if (specificUser) {
      console.log('   Email:', specificUser.email);
      console.log('   Employee ID:', specificUser.employeeId);
    }
    
    // List all users
    const allUsers = await prisma.user.findMany({
      select: { email: true, firebaseUid: true, employeeId: true },
      take: 5
    });
    
    console.log('📋 Sample users in database:');
    allUsers.forEach((user, i) => {
      console.log(`   ${i+1}. ${user.email} (${user.employeeId})`);
    });
    
  } catch (error: any) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDeployedDatabase();
