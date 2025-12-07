-- AlterTable: Add fuel type and quotation import tracking
ALTER TABLE "enquiries" ADD COLUMN "fuel_type" TEXT,
ADD COLUMN "is_imported_from_quotation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "quotation_imported_at" TIMESTAMP(3);

-- AlterTable: Add isEditable field to remarks (Task 4)
ALTER TABLE "remarks" ADD COLUMN "is_editable" BOOLEAN NOT NULL DEFAULT true;

