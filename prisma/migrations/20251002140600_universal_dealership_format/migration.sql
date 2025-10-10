-- Update BookingStatus enum with new values
ALTER TYPE "BookingStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "BookingStatus" ADD VALUE 'BACK_ORDER';
ALTER TYPE "BookingStatus" ADD VALUE 'APPROVED';
ALTER TYPE "BookingStatus" ADD VALUE 'REJECTED';

-- Add new columns to bookings table for universal dealer format
ALTER TABLE "bookings" ADD COLUMN "zone" TEXT;
ALTER TABLE "bookings" ADD COLUMN "region" TEXT;
ALTER TABLE "bookings" ADD COLUMN "opty_id" TEXT UNIQUE; -- Opportunity ID
ALTER TABLE "bookings" ADD COLUMN "variant" TEXT; -- Variant/PL
ALTER TABLE "bookings" ADD COLUMN "vc_code" TEXT; -- Vehicle Configuration Code
ALTER TABLE "bookings" ADD COLUMN "color" TEXT;
ALTER TABLE "bookings" ADD COLUMN "fuel_type" TEXT;
ALTER TABLE "bookings" ADD COLUMN "transmission" TEXT; -- AMT/MT/DCA
ALTER TABLE "bookings" ADD COLUMN "expected_delivery_date" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "division" TEXT;
ALTER TABLE "bookings" ADD COLUMN "emp_name" TEXT;
ALTER TABLE "bookings" ADD COLUMN "employee_login" TEXT;
ALTER TABLE "bookings" ADD COLUMN "finance_required" BOOLEAN;
ALTER TABLE "bookings" ADD COLUMN "financer_name" TEXT;
ALTER TABLE "bookings" ADD COLUMN "file_login_date" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "approval_date" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "stock_availability" TEXT; -- VNA/Vehicle Available
ALTER TABLE "bookings" ADD COLUMN "back_order_status" BOOLEAN;
ALTER TABLE "bookings" ADD COLUMN "rto_date" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "remarks" TEXT;

-- Add new columns to dealers table
ALTER TABLE "dealers" ADD COLUMN "zone" TEXT;
ALTER TABLE "dealers" ADD COLUMN "region" TEXT;
ALTER TABLE "dealers" ADD COLUMN "dealer_type" TEXT; -- Tata, Maruti, Hyundai, etc.

-- Create vehicles table for inventory/pricing
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "active_vc" TEXT UNIQUE,
    "vc_code" TEXT,
    "variant" TEXT,
    "trim" TEXT,
    "color" TEXT,
    "fuel_type" TEXT,
    "transmission" TEXT,
    "zawl_stock" BOOLEAN,
    "ras_stock" BOOLEAN,
    "regional_stock" BOOLEAN,
    "plant_stock" BOOLEAN,
    "ppl" TEXT,
    "dealer_id" TEXT,
    "dealer_type" TEXT,
    "ex_showroom_price" DOUBLE PRECISION,
    "consumer_discount" DOUBLE PRECISION,
    "green_bonus" DOUBLE PRECISION,
    "existing_ice_discount" DOUBLE PRECISION,
    "existing_ev_discount" DOUBLE PRECISION,
    "intervention" DOUBLE PRECISION,
    "exchange_scrappage" DOUBLE PRECISION,
    "corporate_discount" DOUBLE PRECISION,
    "rural_govt_discount" DOUBLE PRECISION,
    "additional_discount" DOUBLE PRECISION,
    "final_billing_price" DOUBLE PRECISION,
    "insurance_75" DOUBLE PRECISION,
    "by_dealer" DOUBLE PRECISION,
    "self_cost" DOUBLE PRECISION,
    "normal_rto" DOUBLE PRECISION,
    "trc" DOUBLE PRECISION,
    "bh" DOUBLE PRECISION,
    "tcs_1_percent" DOUBLE PRECISION,
    "fastag" DOUBLE PRECISION,
    "on_road_price" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
