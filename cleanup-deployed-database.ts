// cleanup-deployed-database.ts
// Cleanup script for DEPLOYED database on Render
import { PrismaClient } from '@prisma/client';

// Use the deployed database URL
const DEPLOYED_DB_URL = process.env.DEPLOYED_DATABASE_URL || process.env.DATABASE_URL_DEPLOYED;

if (!DEPLOYED_DB_URL) {
  console.error('❌ DEPLOYED_DATABASE_URL not found in environment variables!');
  console.error('Please set DEPLOYED_DATABASE_URL in your .env file or pass it as an argument');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DEPLOYED_DB_URL
    }
  }
});

async function cleanupDeployedData() {
  console.log('🗑️  Starting DEPLOYED database cleanup...');
  console.log('🌐 Database:', DEPLOYED_DB_URL.replace(/:[^:]*@/, ':****@'));
  console.log('');

  // Prompt for confirmation
  console.log('⚠️  WARNING: This will delete ALL data from the DEPLOYED database!');
  console.log('');

  try {
    // Delete in order to respect foreign key constraints
    
    console.log('1️⃣  Deleting booking audit logs...');
    const auditLogs = await prisma.bookingAuditLog.deleteMany({});
    console.log(`   ✅ Deleted ${auditLogs.count} audit log entries`);

    console.log('2️⃣  Deleting booking import errors...');
    const importErrors = await prisma.bookingImportError.deleteMany({});
    console.log(`   ✅ Deleted ${importErrors.count} import error entries`);

    console.log('3️⃣  Deleting booking imports...');
    const imports = await prisma.bookingImport.deleteMany({});
    console.log(`   ✅ Deleted ${imports.count} import records`);

    console.log('4️⃣  Deleting quotations...');
    const quotations = await prisma.quotation.deleteMany({});
    console.log(`   ✅ Deleted ${quotations.count} quotations`);

    console.log('5️⃣  Deleting bookings...');
    const bookings = await prisma.booking.deleteMany({});
    console.log(`   ✅ Deleted ${bookings.count} bookings`);

    console.log('6️⃣  Deleting enquiries...');
    const enquiries = await prisma.enquiry.deleteMany({});
    console.log(`   ✅ Deleted ${enquiries.count} enquiries`);

    console.log('7️⃣  Deleting vehicles...');
    const vehicles = await prisma.vehicle.deleteMany({});
    console.log(`   ✅ Deleted ${vehicles.count} vehicles`);

    console.log('8️⃣  Deleting models...');
    const models = await prisma.model.deleteMany({});
    console.log(`   ✅ Deleted ${models.count} models`);

    // Delete dealership-related data
    console.log('9️⃣  Deleting vehicle catalogs...');
    try {
      const catalogs = await prisma.$executeRaw`DELETE FROM "vehicle_catalogs"`;
      console.log(`   ✅ Deleted ${catalogs} vehicle catalogs`);
    } catch (error: any) {
      console.log('   ⚠️  vehicle_catalogs table might not exist yet');
    }

    console.log('🔟 Deleting users...');
    const users = await prisma.user.deleteMany({});
    console.log(`   ✅ Deleted ${users.count} users`);

    console.log('1️⃣1️⃣  Deleting dealers...');
    const dealers = await prisma.dealer.deleteMany({});
    console.log(`   ✅ Deleted ${dealers.count} dealers`);

    console.log('1️⃣2️⃣  Deleting dealerships...');
    try {
      const dealerships = await prisma.$executeRaw`DELETE FROM "dealerships"`;
      console.log(`   ✅ Deleted ${dealerships} dealerships`);
    } catch (error: any) {
      console.log('   ⚠️  dealerships table might not exist yet');
    }

    // Keep roles - they're system data
    console.log('⏭️  Skipping roles (system data)\n');

    console.log('✅ DEPLOYED database cleanup completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Audit Logs: ${auditLogs.count}`);
    console.log(`   - Import Errors: ${importErrors.count}`);
    console.log(`   - Imports: ${imports.count}`);
    console.log(`   - Quotations: ${quotations.count}`);
    console.log(`   - Bookings: ${bookings.count}`);
    console.log(`   - Enquiries: ${enquiries.count}`);
    console.log(`   - Vehicles: ${vehicles.count}`);
    console.log(`   - Models: ${models.count}`);
    console.log(`   - Users: ${users.count}`);
    console.log(`   - Dealers: ${dealers.count}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDeployedData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

