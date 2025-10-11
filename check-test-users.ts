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

async function checkTestUsers() {
  try {
    console.log('🔍 Checking users for test-user bypass...');
    
    // Check admin user
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@dealership.com' },
      include: { role: true }
    });
    
    console.log('Admin user (admin@dealership.com):', adminUser ? 'FOUND' : 'NOT FOUND');
    if (adminUser) console.log('   Role:', adminUser.role.name);
    
    // Check general manager
    const gmUser = await prisma.user.findFirst({
      where: { role: { name: 'GENERAL_MANAGER' } },
      include: { role: true }
    });
    
    console.log('General Manager:', gmUser ? 'FOUND' : 'NOT FOUND');
    if (gmUser) console.log('   Email:', gmUser.email, 'Role:', gmUser.role.name);
    
    // Check sales manager
    const smUser = await prisma.user.findFirst({
      where: { role: { name: 'SALES_MANAGER' } },
      include: { role: true }
    });
    
    console.log('Sales Manager:', smUser ? 'FOUND' : 'NOT FOUND');
    if (smUser) console.log('   Email:', smUser.email, 'Role:', smUser.role.name);
    
    // Check any user
    const anyUser = await prisma.user.findFirst({
      include: { role: true }
    });
    
    console.log('Any user:', anyUser ? 'FOUND' : 'NOT FOUND');
    if (anyUser) console.log('   Email:', anyUser.email, 'Role:', anyUser.role.name);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestUsers();
