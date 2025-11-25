import prisma from '../src/config/db';

/**
 * Create remarks table if it doesn't exist
 * Based on the Prisma schema Remark model
 */
async function createRemarksTable() {
  console.log('🔧 Creating remarks table...');

  try {
    // Check if table exists
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'remarks'
      );
    `;

    if (tableExists[0]?.exists) {
      console.log('✅ remarks table already exists');
      return;
    }

    // Create the table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "remarks" (
        "id" TEXT NOT NULL,
        "entity_type" TEXT NOT NULL,
        "entity_id" TEXT NOT NULL,
        "remark" TEXT NOT NULL,
        "remark_type" TEXT,
        "created_by" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
        "cancellation_reason" TEXT,
        "cancelled_at" TIMESTAMP(3),
        "cancelled_by" TEXT,
        
        CONSTRAINT "remarks_pkey" PRIMARY KEY ("id")
      );
    `);

    // Add foreign key to users table (created_by)
    // Note: firebaseUid is the primary key and is mapped as "firebaseUid" in Prisma
    // But in the database it might be "firebaseUid" or "firebase_uid"
    // Let's check what column actually exists
    const userColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('firebaseUid', 'firebase_uid');
    `;
    
    const firebaseUidColumn = userColumns[0]?.column_name || 'firebaseUid';
    console.log(`📍 Using column name: ${firebaseUidColumn}`);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "remarks" 
      ADD CONSTRAINT "remarks_created_by_fkey" 
      FOREIGN KEY ("created_by") 
      REFERENCES "users"("${firebaseUidColumn}") 
      ON DELETE CASCADE 
      ON UPDATE CASCADE;
    `);

    // Add foreign key to users table (cancelled_by) - nullable
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "remarks" 
      ADD CONSTRAINT "remarks_cancelled_by_fkey" 
      FOREIGN KEY ("cancelled_by") 
      REFERENCES "users"("${firebaseUidColumn}") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);

    // Add foreign key to enquiries table (if entity_type = 'enquiry')
    // Note: This is a soft relation, Prisma handles it via application logic
    
    // Add indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX "remarks_entity_type_entity_id_idx" ON "remarks"("entity_type", "entity_id");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX "remarks_created_by_idx" ON "remarks"("created_by");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX "remarks_created_at_idx" ON "remarks"("created_at");
    `);

    // Add updated_at trigger
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER update_remarks_updated_at
      BEFORE UPDATE ON remarks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `).catch(() => {
      // Trigger function might not exist, that's okay
      console.log('⚠️  Updated_at trigger not created (function may not exist)');
    });

    console.log('✅ remarks table created successfully!');
    console.log('💡 Tip: Regenerate Prisma client: npx prisma generate');
    console.log('💡 Tip: Restart your backend server if it was running.');

  } catch (error: any) {
    console.error('❌ Error creating remarks table:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createRemarksTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

