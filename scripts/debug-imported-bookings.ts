import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugImportedBookings() {
  console.log('🔍 Debugging imported bookings...\n');

  try {
    // Get all bookings
    const allBookings = await prisma.booking.findMany({
      select: {
        id: true,
        customerName: true,
        dealershipId: true,
        advisorId: true,
        source: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log(`📊 Total bookings found: ${allBookings.length}\n`);
    console.log('Recent bookings:');
    allBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ${booking.customerName}`);
      console.log(`   ID: ${booking.id}`);
      console.log(`   Dealership: ${booking.dealershipId || 'NULL'}`);
      console.log(`   Advisor: ${booking.advisorId || 'NULL'}`);
      console.log(`   Source: ${booking.source}`);
      console.log(`   Created: ${booking.createdAt.toISOString()}`);
      console.log('');
    });

    // Check imported bookings specifically
    const importedBookings = await prisma.booking.findMany({
      where: {
        source: 'BULK_IMPORT'
      },
      select: {
        id: true,
        customerName: true,
        dealershipId: true,
        advisorId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n📦 Imported bookings (BULK_IMPORT): ${importedBookings.length}`);
    importedBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ${booking.customerName} - Dealership: ${booking.dealershipId || 'NULL'}`);
    });

    // Get admin users
    const admins = await prisma.user.findMany({
      where: {
        role: {
          name: 'ADMIN'
        }
      },
      select: {
        firebaseUid: true,
        name: true,
        email: true,
        dealershipId: true
      }
    });

    console.log(`\n👤 Admin users: ${admins.length}`);
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email})`);
      console.log(`   Dealership: ${admin.dealershipId || 'NULL'}`);
    });

    // Check if imported bookings match admin's dealership
    if (admins.length > 0 && importedBookings.length > 0) {
      const adminDealership = admins[0].dealershipId;
      const matchingBookings = importedBookings.filter(b => b.dealershipId === adminDealership);
      const nonMatchingBookings = importedBookings.filter(b => b.dealershipId !== adminDealership);

      console.log(`\n🔍 Matching analysis:`);
      console.log(`   Admin dealership: ${adminDealership || 'NULL'}`);
      console.log(`   Matching bookings: ${matchingBookings.length}`);
      console.log(`   Non-matching bookings: ${nonMatchingBookings.length}`);

      if (nonMatchingBookings.length > 0) {
        console.log(`\n⚠️  Non-matching bookings:`);
        nonMatchingBookings.forEach(b => {
          console.log(`   - ${b.customerName}: dealershipId = ${b.dealershipId}`);
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugImportedBookings();

