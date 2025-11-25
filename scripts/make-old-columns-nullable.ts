import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeOldColumnsNullable() {
  console.log('🔧 Making old columns nullable...\n');

  try {
    // Make entity_type and entity_id nullable
    await prisma.$executeRaw`
      ALTER TABLE remarks 
      ALTER COLUMN entity_type DROP NOT NULL,
      ALTER COLUMN entity_id DROP NOT NULL
    `;

    console.log('✅ Made entity_type and entity_id nullable\n');

    // Verify the change
    const columns = await prisma.$queryRaw<Array<{ column_name: string; is_nullable: string }>>`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'remarks' 
      AND column_name IN ('entity_type', 'entity_id')
    `;

    console.log('📊 Column status:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.is_nullable === 'YES' ? '✅ NULLABLE' : '❌ NOT NULL'}`);
    });
    console.log('\n✅ Done!\n');

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

makeOldColumnsNullable();

