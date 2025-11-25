-- AlterTable: Remove polymorphic relations, use separate enquiryId/bookingId

-- Columns already created by migration script, just need to:
-- 1. Drop old columns (if they exist and data is migrated)
-- 2. Add indexes if needed

-- Drop old columns (commented for safety - uncomment after verifying data migration)
-- ALTER TABLE "remarks" DROP COLUMN IF EXISTS "entity_type";
-- ALTER TABLE "remarks" DROP COLUMN IF EXISTS "entity_id";

-- Indexes are already created via Prisma schema
