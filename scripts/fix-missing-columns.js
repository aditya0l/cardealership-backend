/**
 * Comprehensive fix script to add missing database columns
 * This ensures all columns exist even if migrations weren't applied
 */

const { PrismaClient } = require('@prisma/client');

async function fixMissingColumns() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Checking for missing database columns...');
    
    // Fix enquiries.fuel_type
    try {
      const fuelTypeCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'enquiries' AND column_name = 'fuel_type'
      `;
      
      if (fuelTypeCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "fuel_type" TEXT`;
        console.log('✅ Added enquiries.fuel_type column');
      } else {
        console.log('⏭️  enquiries.fuel_type column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add enquiries.fuel_type:', error.message);
    }

    // Fix bookings.chassis_number
    try {
      const chassisCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'chassis_number'
      `;
      
      if (chassisCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "chassis_number" TEXT`;
        console.log('✅ Added bookings.chassis_number column');
      } else {
        console.log('⏭️  bookings.chassis_number column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add bookings.chassis_number:', error.message);
    }

    // Fix bookings.allocation_order_number
    try {
      const allocationCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'allocation_order_number'
      `;
      
      if (allocationCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "allocation_order_number" TEXT`;
        console.log('✅ Added bookings.allocation_order_number column');
      } else {
        console.log('⏭️  bookings.allocation_order_number column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add bookings.allocation_order_number:', error.message);
    }

    // Fix enquiries.next_follow_up_date
    try {
      const nextFollowUpCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'enquiries' AND column_name = 'next_follow_up_date'
      `;
      
      if (nextFollowUpCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "next_follow_up_date" TIMESTAMP(3)`;
        console.log('✅ Added enquiries.next_follow_up_date column');
      } else {
        console.log('⏭️  enquiries.next_follow_up_date column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add enquiries.next_follow_up_date:', error.message);
    }

    // Fix enquiries.last_follow_up_date (if missing)
    try {
      const lastFollowUpCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'enquiries' AND column_name = 'last_follow_up_date'
      `;
      
      if (lastFollowUpCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "last_follow_up_date" TIMESTAMP(3)`;
        console.log('✅ Added enquiries.last_follow_up_date column');
      } else {
        console.log('⏭️  enquiries.last_follow_up_date column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add enquiries.last_follow_up_date:', error.message);
    }

    // Fix enquiries.follow_up_count (if missing)
    try {
      const followUpCountCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'enquiries' AND column_name = 'follow_up_count'
      `;
      
      if (followUpCountCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "follow_up_count" INTEGER DEFAULT 0 NOT NULL`;
        console.log('✅ Added enquiries.follow_up_count column');
      } else {
        console.log('⏭️  enquiries.follow_up_count column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add enquiries.follow_up_count:', error.message);
    }

    // Fix enquiries.location (if missing)
    try {
      const locationCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'enquiries' AND column_name = 'location'
      `;
      
      if (locationCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "location" TEXT`;
        console.log('✅ Added enquiries.location column');
      } else {
        console.log('⏭️  enquiries.location column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add enquiries.location:', error.message);
    }

    // Fix bookings.next_follow_up_date (if missing)
    try {
      const bookingNextFollowUpCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'next_follow_up_date'
      `;
      
      if (bookingNextFollowUpCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "next_follow_up_date" TIMESTAMP(3)`;
        console.log('✅ Added bookings.next_follow_up_date column');
      } else {
        console.log('⏭️  bookings.next_follow_up_date column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add bookings.next_follow_up_date:', error.message);
    }

    // Fix enquiries.is_imported_from_quotation (if missing)
    try {
      const isImportedCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'enquiries' AND column_name = 'is_imported_from_quotation'
      `;
      
      if (isImportedCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "is_imported_from_quotation" BOOLEAN DEFAULT false NOT NULL`;
        console.log('✅ Added enquiries.is_imported_from_quotation column');
      } else {
        console.log('⏭️  enquiries.is_imported_from_quotation column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add enquiries.is_imported_from_quotation:', error.message);
    }

    // Fix enquiries.quotation_imported_at (if missing)
    try {
      const quotationImportedAtCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'enquiries' AND column_name = 'quotation_imported_at'
      `;
      
      if (quotationImportedAtCheck.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "quotation_imported_at" TIMESTAMP(3)`;
        console.log('✅ Added enquiries.quotation_imported_at column');
      } else {
        console.log('⏭️  enquiries.quotation_imported_at column already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not add enquiries.quotation_imported_at:', error.message);
    }

    console.log('✅ Missing columns check complete!');
    
  } catch (error) {
    console.error('❌ Error fixing missing columns:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixMissingColumns()
    .then(() => {
      console.log('✅ Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMissingColumns };

