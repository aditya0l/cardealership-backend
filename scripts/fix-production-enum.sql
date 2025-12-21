-- PRODUCTION DATABASE FIX SCRIPT
-- Run this directly on your production PostgreSQL database
-- This fixes the EnquiryCategory enum mismatch

-- BACKUP FIRST! Run this before making changes:
-- pg_dump -h <host> -U <user> -d <database> -t enquiries > enquiries_backup.sql

BEGIN;

-- Step 1: Check current enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'EnquiryCategory'::regtype 
ORDER BY enumsortorder;

-- Step 2: Create new enum type with correct values
CREATE TYPE "EnquiryCategory_new" AS ENUM ('HOT', 'LOST', 'BOOKED');

-- Step 3: Map old values to new values and update data
-- SALES -> HOT (sales enquiries are hot leads)
-- SERVICE -> LOST (service enquiries not part of sales pipeline)
-- PARTS -> LOST (parts enquiries not part of sales pipeline)
-- GENERAL -> HOT (general enquiries default to hot)
UPDATE "enquiries" 
SET "category" = CASE 
  WHEN "category"::text = 'SALES' THEN 'HOT'
  WHEN "category"::text = 'SERVICE' THEN 'LOST'
  WHEN "category"::text = 'PARTS' THEN 'LOST'
  WHEN "category"::text = 'GENERAL' THEN 'HOT'
  ELSE 'HOT'
END::"EnquiryCategory_new"::text
WHERE "category" IS NOT NULL;

-- Step 4: Change column type to new enum
ALTER TABLE "enquiries" 
  ALTER COLUMN "category" TYPE "EnquiryCategory_new" 
  USING "category"::text::"EnquiryCategory_new";

-- Step 5: Drop old enum
DROP TYPE "EnquiryCategory";

-- Step 6: Rename new enum to original name
ALTER TYPE "EnquiryCategory_new" RENAME TO "EnquiryCategory";

-- Step 7: Set default value
ALTER TABLE "enquiries" 
  ALTER COLUMN "category" SET DEFAULT 'HOT'::"EnquiryCategory";

-- Step 8: Verify the fix
SELECT 'Enum values after fix:' as status;
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'EnquiryCategory'::regtype 
ORDER BY enumsortorder;

SELECT 'Category distribution after migration:' as status;
SELECT category, COUNT(*) as count
FROM "enquiries"
GROUP BY category;

-- If everything looks good, commit the transaction
-- COMMIT;

-- If something went wrong, rollback
-- ROLLBACK;
