import { PrismaClient } from '@prisma/client';
import prisma from '../src/config/db';

async function addVahanDateColumn() {
  console.log('🔧 Adding vahan_date column to bookings table...');

  try {
    // Check and add vahan_date column
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bookings' AND column_name = 'vahan_date'
        ) THEN
          ALTER TABLE bookings ADD COLUMN vahan_date TIMESTAMP(3);
          RAISE NOTICE '✅ Added bookings.vahan_date column';
        ELSE
          RAISE NOTICE '⏭️  bookings.vahan_date column already exists';
        END IF;
      END $$;
    `);

    console.log('✅ Vahan date column check complete!');
    console.log('💡 Tip: Restart your backend server if it was running.');

  } catch (error: any) {
    console.error('❌ Error adding vahan_date column:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addVahanDateColumn()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

