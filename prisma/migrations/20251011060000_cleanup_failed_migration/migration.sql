-- Clean up the failed migration from _prisma_migrations table
DELETE FROM "_prisma_migrations" WHERE migration_name = '20251011_add_employee_hierarchy_stock_and_models';

-- Now apply the actual schema changes
-- Add employee_id and manager_id to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "manager_id" TEXT;

-- Create unique index on employee_id
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_employee_id_key') THEN
    CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");
  END IF;
END $$;

-- Add foreign key for manager_id (self-referencing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_manager_id_fkey'
  ) THEN
    -- Check if the primary key column is firebase_uid or firebaseUid
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'firebase_uid'
    ) THEN
      ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" 
      FOREIGN KEY ("manager_id") REFERENCES "users"("firebase_uid") 
      ON DELETE SET NULL ON UPDATE CASCADE;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'firebaseUid'
    ) THEN
      ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" 
      FOREIGN KEY ("manager_id") REFERENCES "users"("firebaseUid") 
      ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

-- Create EnquiryCategory enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "EnquiryCategory" AS ENUM ('SALES', 'SERVICE', 'PARTS', 'GENERAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create EnquirySource enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "EnquirySource" AS ENUM ('WALK_IN', 'PHONE', 'WEBSITE', 'REFERRAL', 'EMAIL', 'SOCIAL_MEDIA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create StockAvailability enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "StockAvailability" AS ENUM ('ZAWL', 'RAS', 'REGIONAL', 'PLANT', 'NOT_AVAILABLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update enquiries table with new columns
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "customer_name" TEXT;
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "customer_email" TEXT;
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "customer_contact" TEXT;
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "variant" TEXT;
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "expected_booking_date" TIMESTAMP(3);
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "category" "EnquiryCategory";
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "source" "EnquirySource";
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "dealer_code" TEXT;
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "ca_remarks" TEXT;

-- Drop old enquiries columns if they exist
ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "title";
ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "description";

-- Update bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dealer_code" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "advisor_remarks" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "sales_manager_remarks" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "general_manager_remarks" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "team_lead_remarks" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "admin_remarks" TEXT;

-- Update stock_availability column type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'stock_availability'
  ) THEN
    ALTER TABLE "bookings" DROP COLUMN "stock_availability";
  END IF;
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "stock_availability" "StockAvailability";
END $$;

-- Drop old bookings columns if they exist
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "car_variant_id";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "external_id";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "vehicle";

-- Create models table if it doesn't exist
CREATE TABLE IF NOT EXISTS "models" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "segment" TEXT,
    "description" TEXT,
    "base_price" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- Create unique index on brand and model_name
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'models_brand_model_name_key') THEN
    CREATE UNIQUE INDEX "models_brand_model_name_key" ON "models"("brand", "model_name");
  END IF;
END $$;

-- Update vehicles table for stock quantities
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "model_id" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "total_stock" INTEGER NOT NULL DEFAULT 0;

-- Change stock columns from boolean to integer
DO $$
BEGIN
  -- Drop and recreate zawl_stock
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'zawl_stock' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE "vehicles" DROP COLUMN "zawl_stock";
  END IF;
  ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "zawl_stock" INTEGER NOT NULL DEFAULT 0;

  -- Drop and recreate ras_stock
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'ras_stock' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE "vehicles" DROP COLUMN "ras_stock";
  END IF;
  ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "ras_stock" INTEGER NOT NULL DEFAULT 0;

  -- Drop and recreate regional_stock
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'regional_stock' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE "vehicles" DROP COLUMN "regional_stock";
  END IF;
  ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "regional_stock" INTEGER NOT NULL DEFAULT 0;

  -- Drop and recreate plant_stock
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'plant_stock' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE "vehicles" DROP COLUMN "plant_stock";
  END IF;
  ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "plant_stock" INTEGER NOT NULL DEFAULT 0;
END $$;

-- Add foreign key for model_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vehicles_model_id_fkey'
  ) THEN
    ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_model_id_fkey" 
    FOREIGN KEY ("model_id") REFERENCES "models"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Drop stock table if it exists (old table)
DROP TABLE IF EXISTS "stock";

