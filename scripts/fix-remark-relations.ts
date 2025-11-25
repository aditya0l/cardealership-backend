import prisma from '../src/config/db';

/**
 * Fix Remark model relations in database
 * The issue is that Prisma Studio can't handle polymorphic relations properly
 * We'll remove the foreign key constraints that are causing issues
 */
async function fixRemarkRelations() {
  console.log('🔧 Fixing Remark relations...');

  try {
    // Check if foreign key constraints exist
    const fkConstraints = await prisma.$queryRaw<Array<{
      constraint_name: string;
      table_name: string;
    }>>`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE table_name = 'remarks'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name IN ('remark_enquiry_fkey', 'remark_booking_fkey');
    `;

    console.log(`Found ${fkConstraints.length} foreign key constraints on remarks table`);

    // Remove the problematic foreign key constraints
    // These cause issues in Prisma Studio because they're polymorphic
    for (const fk of fkConstraints) {
      console.log(`Removing constraint: ${fk.constraint_name}`);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "remarks" 
        DROP CONSTRAINT IF EXISTS "${fk.constraint_name}";
      `);
    }

    // Keep the user foreign keys (these are fine)
    console.log('✅ Removed polymorphic foreign key constraints');
    console.log('💡 Relations will still work in application code');
    console.log('💡 Prisma Studio should now be able to query remarks');

  } catch (error: any) {
    console.error('❌ Error fixing Remark relations:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixRemarkRelations()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

