-- Update RoleName enum to include new role types
-- Simplified migration that just adds values, ignoring duplicates

-- Add GENERAL_MANAGER if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GENERAL_MANAGER') THEN
    EXECUTE 'ALTER TYPE "RoleName" ADD VALUE ''GENERAL_MANAGER''';
  END IF;
END $$;

-- Add SALES_MANAGER if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SALES_MANAGER') THEN
    EXECUTE 'ALTER TYPE "RoleName" ADD VALUE ''SALES_MANAGER''';
  END IF;
END $$;

-- Add CUSTOMER_ADVISOR if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CUSTOMER_ADVISOR') THEN
    EXECUTE 'ALTER TYPE "RoleName" ADD VALUE ''CUSTOMER_ADVISOR''';
  END IF;
END $$;
