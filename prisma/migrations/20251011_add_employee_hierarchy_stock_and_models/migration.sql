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
    ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" 
    FOREIGN KEY ("manager_id") REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
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
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "stock_availability";
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "stock_availability" "StockAvailability";

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
ALTER TABLE "vehicles" 
  DROP COLUMN IF EXISTS "zawl_stock",
  ADD COLUMN IF NOT EXISTS "zawl_stock" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "vehicles" 
  DROP COLUMN IF EXISTS "ras_stock",
  ADD COLUMN IF NOT EXISTS "ras_stock" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "vehicles" 
  DROP COLUMN IF EXISTS "regional_stock",
  ADD COLUMN IF NOT EXISTS "regional_stock" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "vehicles" 
  DROP COLUMN IF EXISTS "plant_stock",
  ADD COLUMN IF NOT EXISTS "plant_stock" INTEGER NOT NULL DEFAULT 0;

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

