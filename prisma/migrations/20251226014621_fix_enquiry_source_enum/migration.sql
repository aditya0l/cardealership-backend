-- Fix EnquirySource enum by adding missing values
-- This migration adds all enum values from the Prisma schema
-- Values are added idempotently (will skip if already exists)

-- Add missing enum values one at a time
-- PostgreSQL requires enum values to be added in separate transactions

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'WALK_IN';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'PHONE_CALL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'WEBSITE';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'DIGITAL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'SOCIAL_MEDIA';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'REFERRAL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'ADVERTISEMENT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'EMAIL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'SHOWROOM_VISIT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'EVENT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'BTL_ACTIVITY';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'WHATSAPP';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'OUTBOUND_CALL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "EnquirySource" ADD VALUE IF NOT EXISTS 'OTHER';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Verification: Check the enum values
DO $$
DECLARE
  enum_values text;
BEGIN
  SELECT string_agg(enumlabel::text, ', ' ORDER BY enumsortorder)
  INTO enum_values
  FROM pg_enum
  WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'EnquirySource'
  );
  
  IF enum_values IS NOT NULL THEN
    RAISE NOTICE 'EnquirySource enum values: %', enum_values;
  END IF;
END $$;

