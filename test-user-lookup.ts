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

async function testUserLookup() {
  try {
    console.log('🔍 Testing user lookup in deployed database...');
    
    // Test 1: Find user by Firebase UID
    const userByUid = await prisma.user.findUnique({
      where: { firebaseUid: 'g5Fr20vtaMZkjCxLRJJr9WORGJc2' },
      include: { role: true }
    });
    
    console.log('✅ User by Firebase UID:', userByUid ? 'FOUND' : 'NOT FOUND');
    if (userByUid) {
      console.log('   Email:', userByUid.email);
      console.log('   Role:', userByUid.role.name);
      console.log('   Employee ID:', userByUid.employeeId);
    }
    
    // Test 2: Find user by email
    const userByEmail = await prisma.user.findUnique({
      where: { email: 'advisor.new@test.com' },
      include: { role: true }
    });
    
    console.log('✅ User by Email:', userByEmail ? 'FOUND' : 'NOT FOUND');
    if (userByEmail) {
      console.log('   Firebase UID:', userByEmail.firebaseUid);
      console.log('   Role:', userByEmail.role.name);
    }
    
    // Test 3: Check if UIDs match
    if (userByUid && userByEmail) {
      console.log('✅ UIDs match:', userByUid.firebaseUid === userByEmail.firebaseUid);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUserLookup();
