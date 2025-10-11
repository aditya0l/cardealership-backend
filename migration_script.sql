-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleName" ADD VALUE 'MANAGER';
ALTER TYPE "RoleName" ADD VALUE 'ADVISOR';

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_manager_id_fkey";

-- DropForeignKey
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_model_id_fkey";

-- DropIndex
DROP INDEX "users_employee_id_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "employee_id",
DROP COLUMN "manager_id";

-- AlterTable
ALTER TABLE "enquiries" DROP COLUMN "ca_remarks",
DROP COLUMN "category",
DROP COLUMN "color",
DROP COLUMN "customer_contact",
DROP COLUMN "customer_email",
DROP COLUMN "customer_name",
DROP COLUMN "dealer_code",
DROP COLUMN "expected_booking_date",
DROP COLUMN "model",
DROP COLUMN "source",
DROP COLUMN "variant",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "admin_remarks",
DROP COLUMN "advisor_remarks",
DROP COLUMN "dealer_code",
DROP COLUMN "general_manager_remarks",
DROP COLUMN "sales_manager_remarks",
DROP COLUMN "team_lead_remarks",
ADD COLUMN     "car_variant_id" TEXT,
ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "vehicle" TEXT NOT NULL,
DROP COLUMN "stock_availability",
ADD COLUMN     "stock_availability" TEXT;

-- AlterTable
ALTER TABLE "vehicles" DROP COLUMN "model_id",
DROP COLUMN "total_stock",
DROP COLUMN "zawl_stock",
ADD COLUMN     "zawl_stock" BOOLEAN,
DROP COLUMN "ras_stock",
ADD COLUMN     "ras_stock" BOOLEAN,
DROP COLUMN "regional_stock",
ADD COLUMN     "regional_stock" BOOLEAN,
DROP COLUMN "plant_stock",
ADD COLUMN     "plant_stock" BOOLEAN;

-- DropTable
DROP TABLE "models";

-- DropEnum
DROP TYPE "EnquiryCategory";

-- DropEnum
DROP TYPE "EnquirySource";

-- DropEnum
DROP TYPE "StockAvailability";

-- CreateTable
CREATE TABLE "stock" (
    "id" TEXT NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_external_id_key" ON "bookings"("external_id" ASC);

