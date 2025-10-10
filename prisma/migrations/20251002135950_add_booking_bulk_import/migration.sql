-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum  
CREATE TYPE "BookingSource" AS ENUM ('MANUAL', 'BULK_IMPORT', 'API', 'MOBILE');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "BookingStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';
ALTER TYPE "BookingStatus" ADD VALUE 'WAITLISTED';
ALTER TYPE "BookingStatus" ADD VALUE 'RESCHEDULED';

-- CreateTable
CREATE TABLE "dealers" (
    "id" TEXT NOT NULL,
    "dealer_code" TEXT NOT NULL,
    "dealer_name" TEXT NOT NULL,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_imports" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_filename" TEXT,
    "file_size" BIGINT,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "successful_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "import_settings" JSONB,
    "error_summary" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_import_errors" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "raw_row" JSONB NOT NULL,
    "error_message" TEXT NOT NULL,
    "error_type" TEXT,
    "field_errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_audit_logs" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "change_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_audit_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "customer_phone" TEXT,
ADD COLUMN     "customer_email" TEXT,
ADD COLUMN     "car_variant_id" TEXT,
ADD COLUMN     "dealer_id" TEXT,
ADD COLUMN     "advisor_id" TEXT,
ADD COLUMN     "booking_date" TIMESTAMP(3),
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "enquiryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "bookings" RENAME COLUMN "customerName" TO "customer_name";
ALTER TABLE "bookings" RENAME COLUMN "enquiryId" TO "enquiry_id";
ALTER TABLE "bookings" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "bookings" RENAME COLUMN "updatedAt" TO "updated_at";

-- CreateIndex
CREATE UNIQUE INDEX "dealers_dealer_code_key" ON "dealers"("dealer_code");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_external_id_key" ON "bookings"("external_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "users"("firebaseUid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey  
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_imports" ADD CONSTRAINT "booking_imports_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("firebaseUid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_import_errors" ADD CONSTRAINT "booking_import_errors_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "booking_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_audit_logs" ADD CONSTRAINT "booking_audit_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_audit_logs" ADD CONSTRAINT "booking_audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("firebaseUid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey  
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_enquiryId_fkey";

