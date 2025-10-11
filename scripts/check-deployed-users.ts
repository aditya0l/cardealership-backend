import prisma from '../src/config/db';

async function checkDeployedUsers() {
  console.log('🔧 Checking users in deployed database...\n');

  try {
    // Check all users
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`✅ Found ${users.length} users in database:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role.name}`);
      console.log(`   Employee ID: ${user.employeeId || 'N/A'}`);
      console.log(`   Firebase UID: ${user.firebaseUid}`);
      console.log(`   Active: ${user.isActive}`);
      console.log('');
    });

    // Check if test-user bypass users exist
    console.log('🔍 Checking test-user bypass requirements:');
    
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@dealership.com' },
      include: { role: true }
    });
    
    const gmUser = await prisma.user.findFirst({
      where: { 
        role: { name: 'GENERAL_MANAGER' }
      },
      include: { role: true }
    });

    const smUser = await prisma.user.findFirst({
      where: { 
        role: { name: 'SALES_MANAGER' }
      },
      include: { role: true }
    });

    const advisorUser = await prisma.user.findFirst({
      where: { 
        role: { name: 'CUSTOMER_ADVISOR' }
      },
      include: { role: true }
    });

    console.log(`Admin user: ${adminUser ? '✅ Found' : '❌ Missing'}`);
    console.log(`GM user: ${gmUser ? '✅ Found' : '❌ Missing'}`);
    console.log(`SM user: ${smUser ? '✅ Found' : '❌ Missing'}`);
    console.log(`Advisor user: ${advisorUser ? '✅ Found' : '❌ Missing'}`);

    // Show which user would be used for test-user bypass
    const testUser = adminUser || gmUser || smUser || advisorUser;
    if (testUser) {
      console.log(`\n🎯 Test-user bypass would use: ${testUser.name} (${testUser.email})`);
    } else {
      console.log('\n❌ No suitable user found for test-user bypass!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDeployedUsers();
