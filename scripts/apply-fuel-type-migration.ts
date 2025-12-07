import prisma from '../src/config/db';

/**
 * Apply fuel_type migration directly to database
 * Run this if Prisma migrate fails
 */
async function applyFuelTypeMigration() {
  console.log('🔧 Applying fuel_type migration...');

  try {
    // Check if columns already exist
    const checkColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'enquiries' 
      AND column_name IN ('fuel_type', 'is_imported_from_quotation', 'quotation_imported_at')
    `;

    const existingColumns = checkColumns.map(c => c.column_name);
    console.log('Existing columns:', existingColumns);

    // Add fuel_type if not exists
    if (!existingColumns.includes('fuel_type')) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "enquiries" 
        ADD COLUMN "fuel_type" TEXT;
      `);
      console.log('✅ Added fuel_type column');
    } else {
      console.log('⏭️  fuel_type column already exists');
    }

    // Add is_imported_from_quotation if not exists
    if (!existingColumns.includes('is_imported_from_quotation')) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "enquiries" 
        ADD COLUMN "is_imported_from_quotation" BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('✅ Added is_imported_from_quotation column');
    } else {
      console.log('⏭️  is_imported_from_quotation column already exists');
    }

    // Add quotation_imported_at if not exists
    if (!existingColumns.includes('quotation_imported_at')) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "enquiries" 
        ADD COLUMN "quotation_imported_at" TIMESTAMP(3);
      `);
      console.log('✅ Added quotation_imported_at column');
    } else {
      console.log('⏭️  quotation_imported_at column already exists');
    }

    // Add is_editable to remarks if not exists
    const checkRemarksColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'remarks' 
      AND column_name = 'is_editable'
    `;

    if (checkRemarksColumns.length === 0) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "remarks" 
        ADD COLUMN "is_editable" BOOLEAN NOT NULL DEFAULT true;
      `);
      console.log('✅ Added is_editable column to remarks');
    } else {
      console.log('⏭️  is_editable column already exists in remarks');
    }

    // Verify columns
    const verifyColumns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'enquiries' 
      AND column_name IN ('fuel_type', 'is_imported_from_quotation', 'quotation_imported_at')
      ORDER BY column_name
    `;

    console.log('\n✅ Migration completed! Columns in database:');
    verifyColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    console.log('\n✅ All columns added successfully!');
  } catch (error: any) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
applyFuelTypeMigration()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });

