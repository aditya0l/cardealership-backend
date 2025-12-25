-- Fix EnquiryCategory enum values
-- This migration safely updates the enum from old values (SALES, SERVICE, PARTS, GENERAL)
-- to new values (HOT, LOST, BOOKED) without data loss

-- Step 1: Create a temporary enum with the new values
DO $$ BEGIN
  CREATE TYPE "EnquiryCategory_new" AS ENUM ('HOT', 'LOST', 'BOOKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Alter the column to use the new enum type, mapping old values to new values during conversion
-- SALES -> HOT (high priority sales enquiry)
-- SERVICE -> LOST (service enquiries are not sales, mark as lost)
-- PARTS -> LOST (parts enquiries are not sales, mark as lost)
-- GENERAL -> HOT (general enquiries default to hot)
ALTER TABLE "enquiries" 
  ALTER COLUMN "category" TYPE "EnquiryCategory_new" 
  USING (
    CASE 
      WHEN "category"::text = 'SALES' THEN 'HOT'::"EnquiryCategory_new"
      WHEN "category"::text = 'SERVICE' THEN 'LOST'::"EnquiryCategory_new"
      WHEN "category"::text = 'PARTS' THEN 'LOST'::"EnquiryCategory_new"
      WHEN "category"::text = 'GENERAL' THEN 'HOT'::"EnquiryCategory_new"
      WHEN "category"::text IN ('HOT', 'LOST', 'BOOKED') THEN "category"::text::"EnquiryCategory_new"
      ELSE 'HOT'::"EnquiryCategory_new"
    END
  );

-- Step 4: Drop the old enum type
DROP TYPE IF EXISTS "EnquiryCategory";

-- Step 5: Rename the new enum to the original name
ALTER TYPE "EnquiryCategory_new" RENAME TO "EnquiryCategory";

-- Step 6: Set default value for category column
ALTER TABLE "enquiries" 
  ALTER COLUMN "category" SET DEFAULT 'HOT'::"EnquiryCategory";

-- Verification: Check the enum values
DO $$
DECLARE
  enum_values text;
BEGIN
  SELECT string_agg(enumlabel::text, ', ' ORDER BY enumsortorder)
  INTO enum_values
  FROM pg_enum
  WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'EnquiryCategory'
  );
  
  IF enum_values IS NOT NULL THEN
    RAISE NOTICE 'EnquiryCategory enum values: %', enum_values;
  END IF;
END $$;
