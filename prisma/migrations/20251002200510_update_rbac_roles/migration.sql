-- Update RoleName enum to include new role types and migrate existing data

-- First, add the new enum values
ALTER TYPE "RoleName" ADD VALUE 'GENERAL_MANAGER';
ALTER TYPE "RoleName" ADD VALUE 'SALES_MANAGER';
ALTER TYPE "RoleName" ADD VALUE 'CUSTOMER_ADVISOR';

-- Update existing data to map old roles to new roles
UPDATE "roles" SET "name" = 'GENERAL_MANAGER' WHERE "name" = 'MANAGER';
UPDATE "roles" SET "name" = 'CUSTOMER_ADVISOR' WHERE "name" = 'ADVISOR';

-- Insert any missing roles that don't exist yet
INSERT INTO "roles" ("id", "name") 
SELECT 'role_' || generate_random_uuid()::text, 'GENERAL_MANAGER'::RoleName
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'GENERAL_MANAGER');

INSERT INTO "roles" ("id", "name") 
SELECT 'role_' || generate_random_uuid()::text, 'SALES_MANAGER'::RoleName
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'SALES_MANAGER');

INSERT INTO "roles" ("id", "name") 
SELECT 'role_' || generate_random_uuid()::text, 'CUSTOMER_ADVISOR'::RoleName
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'CUSTOMER_ADVISOR');

INSERT INTO "roles" ("id", "name") 
SELECT 'role_' || generate_random_uuid()::text, 'TEAM_LEAD'::RoleName
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'TEAM_LEAD');

INSERT INTO "roles" ("id", "name") 
SELECT 'role_' || generate_random_uuid()::text, 'ADMIN'::RoleName
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'ADMIN');

-- Note: After this migration runs, you should manually remove the old enum values
-- This requires a separate migration due to PostgreSQL enum constraints
-- Run these commands in a separate migration:
-- ALTER TYPE "RoleName" DROP VALUE 'MANAGER';
-- ALTER TYPE "RoleName" DROP VALUE 'ADVISOR';
