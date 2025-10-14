// check-deployed-users.ts
// Check users in DEPLOYED database on Render
import { PrismaClient } from '@prisma/client';

// Use the deployed database URL
const DEPLOYED_DB_URL = process.env.DEPLOYED_DATABASE_URL || process.env.DATABASE_URL_DEPLOYED;

if (!DEPLOYED_DB_URL) {
  console.error('❌ DEPLOYED_DATABASE_URL not found in environment variables!');
  console.error('Please set DEPLOYED_DATABASE_URL in your .env file');
  console.error('');
  console.error('Add this to your .env file:');
  console.error('DEPLOYED_DATABASE_URL="your-render-postgres-url-here"');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DEPLOYED_DB_URL
    }
  }
});

async function checkDeployedUsers() {
  console.log('🌐 Checking DEPLOYED database...');
  console.log('Database:', DEPLOYED_DB_URL.replace(/:[^:]*@/, ':****@'));
  console.log('');

  try {
    const users = await prisma.user.findMany({
      select: {
        firebaseUid: true,
        email: true,
        name: true,
        roleId: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const bookings = await prisma.booking.count();
    const enquiries = await prisma.enquiry.count();
    const quotations = await prisma.quotation.count();
    const vehicles = await prisma.vehicle.count();

    console.log('📊 Data Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Bookings: ${bookings}`);
    console.log(`   Enquiries: ${enquiries}`);
    console.log(`   Quotations: ${quotations}`);
    console.log(`   Vehicles: ${vehicles}`);
    console.log('');

    if (users.length > 0) {
      console.log('👥 Users in deployed database:');
      users.forEach((u, i) => {
        console.log(`${i + 1}. ${u.email} - ${u.name} (${u.firebaseUid.substring(0, 10)}...)`);
      });
    } else {
      console.log('✅ No users found in deployed database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDeployedUsers()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

