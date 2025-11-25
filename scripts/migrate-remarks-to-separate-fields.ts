import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRemarks() {
  console.log('🔄 Migrating remarks from entityType/entityId to enquiryId/bookingId...');

  try {
    // Get all remarks with entityType and entityId
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

    console.log(`✅ Migration complete!`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Errors: ${errors}`);
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateRemarks();

