-- ============================================================================
-- MULTI-DEALERSHIP SYSTEM MIGRATION
-- ============================================================================

-- Create DealershipType enum
DO $$ BEGIN
  CREATE TYPE "DealershipType" AS ENUM ('TATA', 'UNIVERSAL', 'MAHINDRA', 'HYUNDAI', 'MARUTI', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Dealerships table
CREATE TABLE IF NOT EXISTS "dealerships" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "type" "DealershipType" NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "gst_number" TEXT,
  "pan_number" TEXT,
  "brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Create VehicleCatalogs table
CREATE TABLE IF NOT EXISTS "vehicle_catalogs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dealership_id" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "variants" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicle_catalogs_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "vehicle_catalogs_dealership_id_brand_model_key" UNIQUE ("dealership_id", "brand", "model")
);

-- Add dealership_id to existing tables
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dealership_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dealership_id" TEXT;
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "dealership_id" TEXT;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "dealership_id" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "dealership_id" TEXT;

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_dealership_id_fkey" 
    FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dealership_id_fkey" 
    FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_dealership_id_fkey" 
    FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "quotations" ADD CONSTRAINT "quotations_dealership_id_fkey" 
    FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_dealership_id_fkey" 
    FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "dealerships_code_idx" ON "dealerships"("code");
CREATE INDEX IF NOT EXISTS "dealerships_type_idx" ON "dealerships"("type");
CREATE INDEX IF NOT EXISTS "dealerships_is_active_idx" ON "dealerships"("is_active");
CREATE INDEX IF NOT EXISTS "vehicle_catalogs_dealership_id_idx" ON "vehicle_catalogs"("dealership_id");
CREATE INDEX IF NOT EXISTS "vehicle_catalogs_brand_idx" ON "vehicle_catalogs"("brand");
CREATE INDEX IF NOT EXISTS "users_dealership_id_idx" ON "users"("dealership_id");
CREATE INDEX IF NOT EXISTS "bookings_dealership_id_idx" ON "bookings"("dealership_id");
CREATE INDEX IF NOT EXISTS "enquiries_dealership_id_idx" ON "enquiries"("dealership_id");
CREATE INDEX IF NOT EXISTS "quotations_dealership_id_idx" ON "quotations"("dealership_id");
CREATE INDEX IF NOT EXISTS "vehicles_dealership_id_idx" ON "vehicles"("dealership_id");

