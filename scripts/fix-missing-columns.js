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

