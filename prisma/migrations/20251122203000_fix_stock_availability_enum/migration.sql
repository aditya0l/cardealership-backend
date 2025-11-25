-- ============================================================================
-- FIX StockAvailability ENUM TO MATCH PRISMA SCHEMA AND CSV FORMAT
-- ============================================================================
-- 
-- The database enum currently has: 'ZAWL', 'RAS', 'REGIONAL', 'PLANT', 'NOT_AVAILABLE'
-- But Prisma schema and CSV files use: 'VNA', 'VEHICLE_AVAILABLE'
-- 
-- This migration:
-- 1. Converts existing enum column to TEXT temporarily
-- 2. Drops the old enum type
-- 3. Creates a new enum with correct values: 'VNA', 'VEHICLE_AVAILABLE'
-- 4. Maps old values to new values and converts column back to enum
-- ============================================================================

-- Step 1: Convert enum column to TEXT temporarily to allow dropping the enum
DO $$ 
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'stock_availability'
  ) THEN
    -- Convert enum to text temporarily, mapping old values
    ALTER TABLE "bookings" 
    ALTER COLUMN "stock_availability" TYPE TEXT 
    USING CASE
      WHEN "stock_availability"::TEXT = 'NOT_AVAILABLE' THEN 'VNA'
      WHEN "stock_availability"::TEXT IN ('ZAWL', 'RAS', 'REGIONAL', 'PLANT') THEN 'VEHICLE_AVAILABLE'
      ELSE "stock_availability"::TEXT
    END;
  END IF;
END $$;

-- Step 2: Drop the old enum type (safe now since column is TEXT)
DROP TYPE IF EXISTS "StockAvailability";

-- Step 3: Create the new enum with correct values
CREATE TYPE "StockAvailability" AS ENUM ('VNA', 'VEHICLE_AVAILABLE');

-- Step 4: Convert the column back to the new enum type
DO $$ 
BEGIN
  -- Convert TEXT column back to enum, handling any edge cases
  ALTER TABLE "bookings" 
  ALTER COLUMN "stock_availability" TYPE "StockAvailability" 
  USING CASE
    WHEN "stock_availability" = 'VNA' THEN 'VNA'::"StockAvailability"
    WHEN "stock_availability" = 'VEHICLE_AVAILABLE' THEN 'VEHICLE_AVAILABLE'::"StockAvailability"
    ELSE NULL
  END;
EXCEPTION
  WHEN OTHERS THEN
    -- If conversion fails for any reason, log and set to NULL
    RAISE NOTICE 'Error converting stock_availability: %', SQLERRM;
    ALTER TABLE "bookings" 
    ALTER COLUMN "stock_availability" TYPE "StockAvailability" 
    USING NULL;
END $$;

