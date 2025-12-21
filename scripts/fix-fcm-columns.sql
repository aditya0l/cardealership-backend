-- Quick SQL fix to add FCM notification columns to users table
-- Run this directly on your Render database if needed

-- Add FCM columns if they don't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fcm_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "device_type" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_token_updated" TIMESTAMP(3);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('fcm_token', 'device_type', 'last_token_updated');

