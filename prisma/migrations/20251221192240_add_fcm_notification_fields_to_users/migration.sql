-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fcm_token" TEXT,
ADD COLUMN IF NOT EXISTS "device_type" TEXT,
ADD COLUMN IF NOT EXISTS "last_token_updated" TIMESTAMP(3);

