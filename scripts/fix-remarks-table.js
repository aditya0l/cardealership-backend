/**
 * Fix script to ensure remarks table exists
 * This ensures the table exists even if migrations weren't applied
 */

const { PrismaClient } = require('@prisma/client');

async function fixRemarksTable() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Checking for remarks table...');
    
    // Check if table exists
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'remarks'
    `;
    
    if (tableCheck.length === 0) {
      console.log('📦 Creating remarks table...');
      
      // Create the table with all columns
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "remarks" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "remark" TEXT NOT NULL,
          "remark_type" TEXT NOT NULL,
          "created_by" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
          "cancellation_reason" TEXT,
          "cancelled_at" TIMESTAMP(3),
          "cancelled_by" TEXT,
          "is_editable" BOOLEAN NOT NULL DEFAULT true,
          "enquiry_id" TEXT,
          "booking_id" TEXT,
          CONSTRAINT "remarks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("firebaseUid") ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT "remarks_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("firebaseUid") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "remarks_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "remarks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `;
      
      // Create indexes
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "remarks_enquiry_id_idx" ON "remarks"("enquiry_id")
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "remarks_booking_id_idx" ON "remarks"("booking_id")
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "remarks_created_by_idx" ON "remarks"("created_by")
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "remarks_created_at_idx" ON "remarks"("created_at")
      `;
      
      // Create trigger for updated_at auto-update
      await prisma.$executeRaw`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `;
      
      await prisma.$executeRaw`
        DROP TRIGGER IF EXISTS update_remarks_updated_at ON "remarks"
      `;
      
      await prisma.$executeRaw`
        CREATE TRIGGER update_remarks_updated_at
        BEFORE UPDATE ON "remarks"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `;
      
      console.log('✅ Created remarks table with indexes and triggers');
    } else {
      console.log('⏭️  remarks table already exists');
      
      // Check if all required columns exist
      const columns = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'remarks'
      `;
      
      const columnNames = columns.map(col => col.column_name);
      const requiredColumns = [
        'id', 'remark', 'remark_type', 'created_by', 'created_at', 'updated_at',
        'is_cancelled', 'cancellation_reason', 'cancelled_at', 'cancelled_by',
        'is_editable', 'enquiry_id', 'booking_id'
      ];
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️  Missing columns in remarks: ${missingColumns.join(', ')}`);
        console.log('   Table exists but may be incomplete. Consider running migrations.');
      } else {
        console.log('✅ remarks table has all required columns');
      }
      
      // Ensure indexes exist
      try {
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "remarks_enquiry_id_idx" ON "remarks"("enquiry_id")
        `;
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "remarks_booking_id_idx" ON "remarks"("booking_id")
        `;
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "remarks_created_by_idx" ON "remarks"("created_by")
        `;
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "remarks_created_at_idx" ON "remarks"("created_at")
        `;
        
        // Ensure updated_at trigger exists
        await prisma.$executeRaw`
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
          END;
          $$ language 'plpgsql';
        `;
        
        await prisma.$executeRaw`
          DROP TRIGGER IF EXISTS update_remarks_updated_at ON "remarks"
        `;
        
        await prisma.$executeRaw`
          CREATE TRIGGER update_remarks_updated_at
          BEFORE UPDATE ON "remarks"
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
        `;
        
        console.log('✅ Verified indexes and triggers exist');
      } catch (indexError) {
        console.log('⚠️  Could not create indexes/triggers (they may already exist)');
      }
    }
    
    console.log('✅ Remarks table check complete!');
    
  } catch (error) {
    console.error('❌ Error fixing remarks table:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixRemarksTable()
    .then(() => {
      console.log('✅ Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixRemarksTable };

