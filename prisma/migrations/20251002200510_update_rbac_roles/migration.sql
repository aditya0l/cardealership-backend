-- Update RoleName enum to include new role types
-- Split into steps to avoid PostgreSQL enum constraint issues

-- Step 1: Add the new enum values (if not already added)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GENERAL_MANAGER' AND enumtypid = 'RoleName'::regtype) THEN
    ALTER TYPE "RoleName" ADD VALUE 'GENERAL_MANAGER';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SALES_MANAGER' AND enumtypid = 'RoleName'::regtype) THEN
    ALTER TYPE "RoleName" ADD VALUE 'SALES_MANAGER';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CUSTOMER_ADVISOR' AND enumtypid = 'RoleName'::regtype) THEN
    ALTER TYPE "RoleName" ADD VALUE 'CUSTOMER_ADVISOR';
  END IF;
END $$;
