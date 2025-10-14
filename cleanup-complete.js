// cleanup-complete.js
// Complete cleanup script for BOTH databases and Firebase
const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');
const readline = require('readline');
require('dotenv').config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const targetDB = args[0]; // 'local', 'deployed', or 'both'

// Get database URL based on target
function getDatabaseURL(target) {
  if (target === 'deployed') {
    // Try multiple environment variable names for deployed DB
    return process.env.DEPLOYED_DATABASE_URL || 
           process.env.DATABASE_URL_DEPLOYED ||
           process.env.RENDER_DATABASE_URL;
  }
  return process.env.DATABASE_URL;
}

async function cleanupDatabase(dbUrl, dbName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🗑️  Cleaning ${dbName} Database`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Database: ${dbUrl.replace(/:[^:]*@/, ':****@')}\n`);

  const prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl }
    }
  });

  try {
    // Delete in order to respect foreign key constraints
    console.log('1️⃣  Deleting booking audit logs...');
    const auditLogs = await prisma.bookingAuditLog.deleteMany({});
    console.log(`   ✅ Deleted ${auditLogs.count} audit logs`);

    console.log('2️⃣  Deleting booking import errors...');
    const importErrors = await prisma.bookingImportError.deleteMany({});
    console.log(`   ✅ Deleted ${importErrors.count} import errors`);

    console.log('3️⃣  Deleting booking imports...');
    const imports = await prisma.bookingImport.deleteMany({});
    console.log(`   ✅ Deleted ${imports.count} imports`);

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

    console.log('9️⃣  Deleting vehicle catalogs...');
    try {
      const catalogs = await prisma.$executeRaw`DELETE FROM "vehicle_catalogs"`;
      console.log(`   ✅ Deleted ${catalogs} catalogs`);
    } catch (error) {
      console.log('   ⚠️  vehicle_catalogs table not found');
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
    } catch (error) {
      console.log('   ⚠️  dealerships table not found');
    }

    console.log('\n✅ Database cleanup completed!');
    console.log(`\n📊 ${dbName} Summary:`);
    console.log(`   Users: ${users.count}`);
    console.log(`   Bookings: ${bookings.count}`);
    console.log(`   Enquiries: ${enquiries.count}`);
    console.log(`   Quotations: ${quotations.count}`);
    console.log(`   Vehicles: ${vehicles.count}`);
    console.log(`   Models: ${models.count}`);
    console.log(`   Dealers: ${dealers.count}`);

    return {
      users: users.count,
      bookings: bookings.count,
      enquiries: enquiries.count,
      quotations: quotations.count,
      vehicles: vehicles.count,
      models: models.count,
      dealers: dealers.count
    };

  } catch (error) {
    console.error(`❌ Error cleaning ${dbName}:`, error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupFirebase() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🔥 Cleaning Firebase Authentication');
  console.log(`${'='.repeat(60)}\n`);

  try {
    let deletedCount = 0;
    let totalUsers = 0;

    const listAllUsers = async (nextPageToken) => {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      totalUsers += result.users.length;

      if (result.users.length > 0) {
        console.log(`📋 Found ${result.users.length} users (Total: ${totalUsers})`);
        
        const deletePromises = result.users.map(async (user) => {
          try {
            await admin.auth().deleteUser(user.uid);
            deletedCount++;
            console.log(`   ✅ Deleted: ${user.email || user.uid}`);
          } catch (error) {
            console.error(`   ❌ Failed: ${user.email || user.uid}`);
          }
        });

        await Promise.all(deletePromises);
      }

      if (result.pageToken) {
        await listAllUsers(result.pageToken);
      }
    };

    await listAllUsers();

    console.log(`\n✅ Firebase cleanup completed!`);
    console.log(`📊 Total users deleted: ${deletedCount} out of ${totalUsers}`);

    return deletedCount;

  } catch (error) {
    console.error('❌ Error cleaning Firebase:', error.message);
    throw error;
  }
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('        🗑️  COMPLETE SYSTEM CLEANUP');
  console.log('═'.repeat(60));

  // Show usage if no arguments
  if (!targetDB) {
    console.log('\nUsage:');
    console.log('  node cleanup-complete.js <target>');
    console.log('\nTargets:');
    console.log('  local     - Clean local database only');
    console.log('  deployed  - Clean deployed (Render) database only');
    console.log('  both      - Clean both databases');
    console.log('  firebase  - Clean Firebase only');
    console.log('  all       - Clean both databases + Firebase');
    console.log('\nExamples:');
    console.log('  node cleanup-complete.js local');
    console.log('  node cleanup-complete.js deployed');
    console.log('  node cleanup-complete.js all');
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const confirm = await new Promise((resolve) => {
    rl.question(`\n⚠️  Clean ${targetDB.toUpperCase()}? Type "YES" to confirm: `, resolve);
  });
  rl.close();

  if (confirm !== 'YES') {
    console.log('\n❌ Cleanup cancelled.');
    process.exit(0);
  }

  try {
    const results = {};

    // Clean databases
    if (targetDB === 'local' || targetDB === 'both' || targetDB === 'all') {
      const localUrl = getDatabaseURL('local');
      if (localUrl) {
        results.local = await cleanupDatabase(localUrl, 'LOCAL');
      } else {
        console.log('⚠️  Local database URL not found');
      }
    }

    if (targetDB === 'deployed' || targetDB === 'both' || targetDB === 'all') {
      const deployedUrl = getDatabaseURL('deployed');
      if (deployedUrl) {
        results.deployed = await cleanupDatabase(deployedUrl, 'DEPLOYED');
      } else {
        console.log('\n⚠️  Deployed database URL not found!');
        console.log('Add to .env: DEPLOYED_DATABASE_URL="your-render-postgres-url"');
      }
    }

    // Clean Firebase
    if (targetDB === 'firebase' || targetDB === 'all') {
      results.firebase = await cleanupFirebase();
    }

    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('        ✅ CLEANUP COMPLETE!');
    console.log('═'.repeat(60));
    console.log('\n📊 Final Summary:');
    
    if (results.local) {
      console.log(`\nLOCAL Database: ${results.local.users} users, ${results.local.bookings} bookings`);
    }
    if (results.deployed) {
      console.log(`DEPLOYED Database: ${results.deployed.users} users, ${results.deployed.bookings} bookings`);
    }
    if (results.firebase !== undefined) {
      console.log(`Firebase Auth: ${results.firebase} users deleted`);
    }

    console.log('\n🎉 All done!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

