import prisma from '../src/config/db';

/**
 * Fix EnquirySource enum to match Prisma schema
 * Database has old values but schema expects many more
 */
async function fixEnquirySourceEnum() {
  console.log('🔧 Fixing EnquirySource enum...');

  try {
    // Check current enum values
    const currentValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'EnquirySource'
      )
      ORDER BY enumsortorder;
    `;

    console.log('Current enum values:', currentValues.map(v => v.enumlabel));

    // Expected values from schema
    const expectedValues = [
      'WALK_IN',
      'PHONE_CALL',
      'WEBSITE',
      'DIGITAL',
      'SOCIAL_MEDIA',
      'REFERRAL',
      'ADVERTISEMENT',
      'EMAIL',
      'SHOWROOM_VISIT',
      'EVENT',
      'BTL_ACTIVITY',
      'WHATSAPP',
      'OUTBOUND_CALL',
      'OTHER'
    ];
    
    for (const value of expectedValues) {
      const exists = currentValues.some(v => v.enumlabel === value);
      if (!exists) {
        console.log(`Adding enum value: ${value}`);
        try {
          await prisma.$executeRawUnsafe(`
            ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS '${value}';
          `);
          console.log(`✅ Added ${value}`);
        } catch (error: any) {
          // IF NOT EXISTS might not work in all PostgreSQL versions
          if (error.message.includes('already exists')) {
            console.log(`⏭️  ${value} already exists`);
          } else {
            // Try without IF NOT EXISTS for older PostgreSQL
            try {
              await prisma.$executeRawUnsafe(`
                ALTER TYPE "EnquirySource" ADD VALUE '${value}';
              `);
              console.log(`✅ Added ${value}`);
            } catch (retryError: any) {
              if (retryError.message.includes('already exists')) {
                console.log(`⏭️  ${value} already exists`);
              } else {
                console.error(`❌ Failed to add ${value}:`, retryError.message);
              }
            }
          }
        }
      } else {
        console.log(`⏭️  ${value} already exists`);
      }
    }

    // Verify final enum values
    const finalValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'EnquirySource'
      )
      ORDER BY enumsortorder;
    `;

    console.log('\n✅ Final enum values:', finalValues.map(v => v.enumlabel));
    console.log(`\n✅ Total values: ${finalValues.length}`);
    console.log('\n✅ Enum fix complete!');
    console.log('💡 Restart your backend server to apply changes.');

  } catch (error: any) {
    console.error('❌ Error fixing enum:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixEnquirySourceEnum()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

