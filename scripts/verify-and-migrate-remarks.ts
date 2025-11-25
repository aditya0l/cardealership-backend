import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAndMigrate() {
  console.log('🔍 Verifying database structure...\n');

  try {
    // Check if old columns exist
    const oldColumnsCheck = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'remarks' 
      AND column_name IN ('entity_type', 'entity_id')
    `;

    // Check if new columns exist
    const newColumnsCheck = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'remarks' 
      AND column_name IN ('enquiry_id', 'booking_id')
    `;

    const hasOldColumns = oldColumnsCheck.length > 0;
    const hasNewColumns = newColumnsCheck.length > 0;

    console.log('📊 Database Status:');
    console.log(`   Old columns (entity_type, entity_id): ${hasOldColumns ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   New columns (enquiry_id, booking_id): ${hasNewColumns ? '✅ EXISTS' : '❌ NOT FOUND'}\n`);

    if (!hasOldColumns && !hasNewColumns) {
      console.log('⚠️  Neither old nor new columns found. Table might be empty or schema mismatch.');
      console.log('   Creating new columns...\n');
      
      // Create new columns
      await prisma.$executeRaw`
        ALTER TABLE remarks 
        ADD COLUMN IF NOT EXISTS enquiry_id TEXT,
        ADD COLUMN IF NOT EXISTS booking_id TEXT
      `;
      
      console.log('✅ New columns created.\n');
    } else if (hasOldColumns && !hasNewColumns) {
      console.log('🔄 Migration needed: Old columns exist, new columns missing.');
      console.log('   Step 1: Creating new columns...\n');
      
      // Create new columns
      await prisma.$executeRaw`
        ALTER TABLE remarks 
        ADD COLUMN IF NOT EXISTS enquiry_id TEXT,
        ADD COLUMN IF NOT EXISTS booking_id TEXT
      `;
      
      console.log('✅ New columns created.');
      console.log('   Step 2: Migrating data...\n');
      
      // Migrate data
      const remarks = await prisma.$queryRaw<Array<{ id: string; entity_type: string; entity_id: string }>>`
        SELECT id, entity_type, entity_id 
        FROM remarks 
        WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL
      `;

      console.log(`📊 Found ${remarks.length} remarks to migrate`);

      let migrated = 0;
      let errors = 0;

      for (const remark of remarks) {
        try {
          if (remark.entity_type === 'enquiry') {
            await prisma.$executeRaw`
              UPDATE remarks 
              SET enquiry_id = ${remark.entity_id}
              WHERE id = ${remark.id}
            `;
            migrated++;
          } else if (remark.entity_type === 'booking') {
            await prisma.$executeRaw`
              UPDATE remarks 
              SET booking_id = ${remark.entity_id}
              WHERE id = ${remark.id}
            `;
            migrated++;
          }
        } catch (error: any) {
          console.error(`❌ Error migrating remark ${remark.id}:`, error.message);
          errors++;
        }
      }

      console.log(`\n✅ Data migration complete!`);
      console.log(`   - Migrated: ${migrated}`);
      console.log(`   - Errors: ${errors}\n`);
      
      console.log('   Step 3: Dropping old columns...\n');
      
      // Drop old columns (commented out for safety - uncomment after verification)
      // await prisma.$executeRaw`
      //   ALTER TABLE remarks 
      //   DROP COLUMN IF EXISTS entity_type,
      //   DROP COLUMN IF EXISTS entity_id
      // `;
      
      console.log('⚠️  Old columns kept for now. Uncomment drop statements after verification.\n');
    } else if (hasNewColumns) {
      console.log('✅ New columns already exist. Checking if data needs migration...\n');
      
      // Check if there's data in old columns that needs migration
      if (hasOldColumns) {
        const unmigrated = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM remarks 
          WHERE (entity_type IS NOT NULL AND entity_id IS NOT NULL)
          AND (enquiry_id IS NULL AND booking_id IS NULL)
        `;
        
        const unmigratedCount = Number(unmigrated[0]?.count || 0);
        
        if (unmigratedCount > 0) {
          console.log(`🔄 Found ${unmigratedCount} remarks that need migration...\n`);
          
          const remarks = await prisma.$queryRaw<Array<{ id: string; entity_type: string; entity_id: string }>>`
            SELECT id, entity_type, entity_id 
            FROM remarks 
            WHERE (entity_type IS NOT NULL AND entity_id IS NOT NULL)
            AND (enquiry_id IS NULL AND booking_id IS NULL)
          `;

          let migrated = 0;
          for (const remark of remarks) {
            try {
              if (remark.entity_type === 'enquiry') {
                await prisma.$executeRaw`
                  UPDATE remarks 
                  SET enquiry_id = ${remark.entity_id}
                  WHERE id = ${remark.id}
                `;
                migrated++;
              } else if (remark.entity_type === 'booking') {
                await prisma.$executeRaw`
                  UPDATE remarks 
                  SET booking_id = ${remark.entity_id}
                  WHERE id = ${remark.id}
                `;
                migrated++;
              }
            } catch (error: any) {
              console.error(`❌ Error migrating remark ${remark.id}:`, error.message);
            }
          }
          
          console.log(`✅ Migrated ${migrated} remarks.\n`);
        } else {
          console.log('✅ All data already migrated.\n');
        }
      }
    }

    // Final verification
    console.log('🔍 Final Verification:\n');
    
    const enquiryRemarks = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM remarks WHERE enquiry_id IS NOT NULL
    `;
    
    const bookingRemarks = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM remarks WHERE booking_id IS NOT NULL
    `;
    
    console.log(`   Enquiry remarks: ${Number(enquiryRemarks[0]?.count || 0)}`);
    console.log(`   Booking remarks: ${Number(bookingRemarks[0]?.count || 0)}`);
    console.log('\n✅ Verification complete!\n');

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyAndMigrate();

