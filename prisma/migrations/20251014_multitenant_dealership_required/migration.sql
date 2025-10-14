-- ============================================================================
-- MULTI-TENANT DEALERSHIP SYSTEM - Make dealershipId required
-- ============================================================================

-- This migration enforces that ALL users must belong to a dealership
-- In the multi-tenant model: One ADMIN = One Dealership

-- Step 1: Ensure dealerships table exists (should already exist from previous migration)
-- If you haven't run the multi-dealership migration yet, run it first!

-- Step 2: For any users without dealership (shouldn't happen in multi-tenant, but safe check)
-- Create a default dealership for orphaned users if needed
DO $$ 
DECLARE
  default_dealership_id TEXT;
  orphan_count INT;
BEGIN
  -- Check if there are users without dealership
  SELECT COUNT(*) INTO orphan_count FROM users WHERE dealership_id IS NULL;
  
  IF orphan_count > 0 THEN
    -- Check if default dealership exists
    SELECT id INTO default_dealership_id FROM dealerships WHERE code = 'DEFAULT-SYSTEM' LIMIT 1;
    
    -- If no default dealership, create one
    IF default_dealership_id IS NULL THEN
      INSERT INTO dealerships (
        id, name, code, type, email, phone, address, city, state, pincode,
        brands, is_active, onboarding_completed, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        'System Default Dealership',
        'DEFAULT-SYSTEM',
        'UNIVERSAL',
        'system@default.com',
        '+00-0000000000',
        'System Address',
        'System City',
        'System State',
        '000000',
        ARRAY['UNIVERSAL']::TEXT[],
        true,
        true,
        NOW(),
        NOW()
      ) RETURNING id INTO default_dealership_id;
      
      RAISE NOTICE 'Created default dealership for orphaned users: %', default_dealership_id;
    END IF;
    
    -- Assign orphaned users to default dealership
    UPDATE users 
    SET dealership_id = default_dealership_id 
    WHERE dealership_id IS NULL;
    
    RAISE NOTICE 'Assigned % orphaned users to default dealership', orphan_count;
  END IF;
END $$;

-- Step 3: Make dealership_id NOT NULL for users table
-- This enforces that ALL users MUST belong to a dealership
ALTER TABLE users 
  ALTER COLUMN dealership_id SET NOT NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN users.dealership_id IS 'Required. All users (including ADMIN) must belong to exactly one dealership in multi-tenant model.';

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_dealership_id ON users(dealership_id);

-- Step 6: Add check constraint to prevent NULL (belt and suspenders approach)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_dealership_id_not_null'
  ) THEN
    ALTER TABLE users 
      ADD CONSTRAINT users_dealership_id_not_null CHECK (dealership_id IS NOT NULL);
  END IF;
END $$;

RAISE NOTICE '✅ Multi-tenant dealership migration completed successfully!';

