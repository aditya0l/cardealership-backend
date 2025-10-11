import { PrismaClient } from '@prisma/client';

// This should be the Render PostgreSQL database URL
// You'll need to get this from your Render dashboard
const RENDER_DATABASE_URL = process.env.RENDER_DATABASE_URL || 'postgresql://...';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: RENDER_DATABASE_URL
    }
  }
});

async function checkRenderDatabase() {
  try {
    console.log('🔍 Checking Render database connection...');
    console.log('Database URL:', RENDER_DATABASE_URL.substring(0, 50) + '...');
    
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
    console.log('💡 This might be because RENDER_DATABASE_URL is not set correctly');
    console.log('💡 Check your Render dashboard for the correct database URL');
  } finally {
    await prisma.$disconnect();
  }
}

checkRenderDatabase();
