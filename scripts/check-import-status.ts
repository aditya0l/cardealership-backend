import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImportStatus() {
  console.log('🔍 Checking import status...\n');

  try {
    // Get recent imports
    const imports = await prisma.bookingImport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        admin: {
          select: {
            name: true,
            email: true,
            dealershipId: true
          }
        }
      }
    });

    console.log(`📊 Recent imports: ${imports.length}\n`);

    imports.forEach((imp, index) => {
      console.log(`${index + 1}. Import ID: ${imp.id}`);
      console.log(`   Admin: ${imp.admin.name} (${imp.admin.email})`);
      console.log(`   Admin Dealership: ${imp.admin.dealershipId || 'NULL'}`);
      console.log(`   Status: ${imp.status}`);
      console.log(`   Successful: ${imp.successfulRows || 0}`);
      console.log(`   Failed: ${imp.failedRows || 0}`);
      console.log(`   Total: ${imp.totalRows || 0}`);
      console.log(`   Created: ${imp.createdAt.toISOString()}`);
      console.log('');
    });

    // Check bookings created by these imports
    if (imports.length > 0) {
      const importIds = imports.map(i => i.id);
      const bookings = await prisma.booking.findMany({
        where: {
          source: 'BULK_IMPORT'
        },
        select: {
          id: true,
          customerName: true,
          dealershipId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      console.log(`\n📦 Bookings with source BULK_IMPORT: ${bookings.length}`);
      bookings.forEach((b, index) => {
        console.log(`${index + 1}. ${b.customerName} - Dealership: ${b.dealershipId || 'NULL'} - Created: ${b.createdAt.toISOString()}`);
      });

      // Match bookings to admin dealership
      if (imports[0] && bookings.length > 0) {
        const adminDealership = imports[0].admin.dealershipId;
        const matching = bookings.filter(b => b.dealershipId === adminDealership);
        const nonMatching = bookings.filter(b => b.dealershipId !== adminDealership);

        console.log(`\n🔍 Matching Analysis:`);
        console.log(`   Admin dealership: ${adminDealership || 'NULL'}`);
        console.log(`   Matching bookings: ${matching.length}`);
        console.log(`   Non-matching bookings: ${nonMatching.length}`);

        if (nonMatching.length > 0) {
          console.log(`\n⚠️  Non-matching bookings:`);
          nonMatching.forEach(b => {
            console.log(`   - ${b.customerName}: dealershipId = ${b.dealershipId}`);
          });
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkImportStatus();

