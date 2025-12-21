import { PrismaClient } from '@prisma/client';
import prisma from '../src/config/db';

async function addMissingColumns() {
  console.log('🔧 Adding missing database columns...');

  try {
    // Check and add enquiries.location column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'enquiries' AND column_name = 'location'
          ) THEN
            ALTER TABLE enquiries ADD COLUMN location TEXT;
            RAISE NOTICE '✅ Added enquiries.location column';
          ELSE
            RAISE NOTICE '⏭️  enquiries.location column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add enquiries.location:', error.message);
    }

    // Check and add enquiries.last_follow_up_date column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'enquiries' AND column_name = 'last_follow_up_date'
          ) THEN
            ALTER TABLE enquiries ADD COLUMN last_follow_up_date TIMESTAMP(3);
            RAISE NOTICE '✅ Added enquiries.last_follow_up_date column';
          ELSE
            RAISE NOTICE '⏭️  enquiries.last_follow_up_date column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add enquiries.last_follow_up_date:', error.message);
    }

    // Check and add enquiries.follow_up_count column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'enquiries' AND column_name = 'follow_up_count'
          ) THEN
            ALTER TABLE enquiries ADD COLUMN follow_up_count INTEGER DEFAULT 0 NOT NULL;
            RAISE NOTICE '✅ Added enquiries.follow_up_count column';
          ELSE
            RAISE NOTICE '⏭️  enquiries.follow_up_count column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add enquiries.follow_up_count:', error.message);
    }

    // Check and add enquiries.next_follow_up_date column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'enquiries' AND column_name = 'next_follow_up_date'
          ) THEN
            ALTER TABLE enquiries ADD COLUMN next_follow_up_date TIMESTAMP(3);
            RAISE NOTICE '✅ Added enquiries.next_follow_up_date column';
          ELSE
            RAISE NOTICE '⏭️  enquiries.next_follow_up_date column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add enquiries.next_follow_up_date:', error.message);
    }

    // Check and add bookings.last_follow_up_date column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'last_follow_up_date'
          ) THEN
            ALTER TABLE bookings ADD COLUMN last_follow_up_date TIMESTAMP(3);
            RAISE NOTICE '✅ Added bookings.last_follow_up_date column';
          ELSE
            RAISE NOTICE '⏭️  bookings.last_follow_up_date column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add bookings.last_follow_up_date:', error.message);
    }

    // Check and add bookings.follow_up_count column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'follow_up_count'
          ) THEN
            ALTER TABLE bookings ADD COLUMN follow_up_count INTEGER DEFAULT 0 NOT NULL;
            RAISE NOTICE '✅ Added bookings.follow_up_count column';
          ELSE
            RAISE NOTICE '⏭️  bookings.follow_up_count column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add bookings.follow_up_count:', error.message);
    }

    // Check and add bookings.next_follow_up_date column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'next_follow_up_date'
          ) THEN
            ALTER TABLE bookings ADD COLUMN next_follow_up_date TIMESTAMP(3);
            RAISE NOTICE '✅ Added bookings.next_follow_up_date column';
          ELSE
            RAISE NOTICE '⏭️  bookings.next_follow_up_date column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add bookings.next_follow_up_date:', error.message);
    }

    // Check and add bookings.chassis_number column (if it doesn't exist with different name)
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'chassis_number'
          ) THEN
            ALTER TABLE bookings ADD COLUMN chassis_number TEXT;
            RAISE NOTICE '✅ Added bookings.chassis_number column';
          ELSE
            RAISE NOTICE '⏭️  bookings.chassis_number column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add bookings.chassis_number:', error.message);
    }

    // Check and add bookings.allocation_order_number column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'allocation_order_number'
          ) THEN
            ALTER TABLE bookings ADD COLUMN allocation_order_number TEXT;
            RAISE NOTICE '✅ Added bookings.allocation_order_number column';
          ELSE
            RAISE NOTICE '⏭️  bookings.allocation_order_number column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add bookings.allocation_order_number:', error.message);
    }

    // Check and add enquiries.fuel_type column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'enquiries' AND column_name = 'fuel_type'
          ) THEN
            ALTER TABLE enquiries ADD COLUMN fuel_type TEXT;
            RAISE NOTICE '✅ Added enquiries.fuel_type column';
          ELSE
            RAISE NOTICE '⏭️  enquiries.fuel_type column already exists';
          END IF;
        END $$;
      `);
    } catch (error: any) {
      console.warn('⚠️  Could not add enquiries.fuel_type:', error.message);
    }

    console.log('✅ Missing columns check complete!');
    console.log('💡 Tip: If columns were added, restart your backend server.');

  } catch (error: any) {
    console.error('❌ Error adding columns:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

