import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRemarksTable() {
  console.log('🔍 Checking remarks table structure...\n');

  try {
    // Check existing columns
    const columns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'remarks'
      ORDER BY column_name
    `;

    console.log('📊 Current columns in remarks table:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    console.log('');

    // Check what columns are missing
    const requiredColumns = [
      'remark_type',
      'remark', 
      'created_by',
      'created_at',
      'updated_at',
      'is_cancelled',
      'cancellation_reason',
      'cancelled_at',
      'cancelled_by',
      'enquiry_id',
      'booking_id'
    ];

    const existingColumnNames = columns.map(c => c.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumnNames.includes(col));

    if (missingColumns.length > 0) {
      console.log('⚠️  Missing columns:', missingColumns.join(', '));
      console.log('   Creating missing columns...\n');

      // Create missing columns
      for (const col of missingColumns) {
        try {
          if (col === 'remark_type') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS remark_type TEXT`;
            console.log(`   ✅ Created remark_type`);
          } else if (col === 'remark') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS remark TEXT`;
            console.log(`   ✅ Created remark`);
          } else if (col === 'created_by') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS created_by TEXT`;
            console.log(`   ✅ Created created_by`);
          } else if (col === 'created_at') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`;
            console.log(`   ✅ Created created_at`);
          } else if (col === 'updated_at') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
            console.log(`   ✅ Created updated_at`);
          } else if (col === 'is_cancelled') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false`;
            console.log(`   ✅ Created is_cancelled`);
          } else if (col === 'cancellation_reason') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`;
            console.log(`   ✅ Created cancellation_reason`);
          } else if (col === 'cancelled_at') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP`;
            console.log(`   ✅ Created cancelled_at`);
          } else if (col === 'cancelled_by') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS cancelled_by TEXT`;
            console.log(`   ✅ Created cancelled_by`);
          } else if (col === 'enquiry_id') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS enquiry_id TEXT`;
            console.log(`   ✅ Created enquiry_id`);
          } else if (col === 'booking_id') {
            await prisma.$executeRaw`ALTER TABLE remarks ADD COLUMN IF NOT EXISTS booking_id TEXT`;
            console.log(`   ✅ Created booking_id`);
          }
        } catch (error: any) {
          console.error(`   ❌ Error creating ${col}:`, error.message);
        }
      }
    } else {
      console.log('✅ All required columns exist!\n');
    }

    // Check if remarkType column exists (camelCase) and needs to be renamed
    const hasRemarkType = existingColumnNames.includes('remarkType');
    const hasRemarkTypeSnake = existingColumnNames.includes('remark_type');

    if (hasRemarkType && !hasRemarkTypeSnake) {
      console.log('🔄 Renaming remarkType to remark_type...');
      await prisma.$executeRaw`ALTER TABLE remarks RENAME COLUMN "remarkType" TO remark_type`;
      console.log('   ✅ Renamed\n');
    }

    // Final verification
    const finalColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'remarks'
      ORDER BY column_name
    `;

    console.log('✅ Final table structure:');
    finalColumns.forEach(col => {
      console.log(`   - ${col.column_name}`);
    });
    console.log('\n✅ Table structure fixed!\n');

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixRemarksTable();

