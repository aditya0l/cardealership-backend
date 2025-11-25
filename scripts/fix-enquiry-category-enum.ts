import prisma from '../src/config/db';

/**
 * Fix EnquiryCategory enum to match Prisma schema
 * Database has old values: SALES, SERVICE, PARTS, GENERAL
 * Schema expects: HOT, LOST, BOOKED
 */
async function fixEnquiryCategoryEnum() {
  console.log('🔧 Fixing EnquiryCategory enum...');

  try {
    // Check current enum values
    const currentValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'EnquiryCategory'
      )
      ORDER BY enumsortorder;
    `;

    console.log('Current enum values:', currentValues.map(v => v.enumlabel));

    // Add new enum values if they don't exist
    const newValues = ['HOT', 'LOST', 'BOOKED'];
    
    for (const value of newValues) {
      const exists = currentValues.some(v => v.enumlabel === value);
      if (!exists) {
        console.log(`Adding enum value: ${value}`);
        try {
          await prisma.$executeRawUnsafe(`
            ALTER TYPE "EnquiryCategory" ADD VALUE IF NOT EXISTS '${value}';
          `);
          console.log(`✅ Added ${value}`);
        } catch (error: any) {
          // IF NOT EXISTS might not work in all PostgreSQL versions
          if (error.message.includes('already exists')) {
            console.log(`⏭️  ${value} already exists`);
          } else {
            throw error;
          }
        }
      } else {
        console.log(`⏭️  ${value} already exists`);
      }
    }

    // Check for any enquiries using old enum values
    const enquiriesWithOldValues = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM enquiries 
      WHERE category NOT IN ('HOT', 'LOST', 'BOOKED')
        AND category IS NOT NULL;
    `;

    const count = Number(enquiriesWithOldValues[0]?.count || 0);
    if (count > 0) {
      console.log(`⚠️  Warning: ${count} enquiries have old category values`);
      console.log('💡 You may need to migrate these manually or update them to valid values');
    }

    // Verify final enum values
    const finalValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'EnquiryCategory'
      )
      ORDER BY enumsortorder;
    `;

    console.log('\n✅ Final enum values:', finalValues.map(v => v.enumlabel));
    console.log('\n✅ Enum fix complete!');
    console.log('💡 Restart your backend server to apply changes.');

  } catch (error: any) {
    console.error('❌ Error fixing enum:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixEnquiryCategoryEnum()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

