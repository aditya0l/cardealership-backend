-- cleanup-database.sql
-- Direct SQL cleanup script

-- Disable foreign key checks temporarily (PostgreSQL)
BEGIN;

-- Delete all data in order (respecting foreign keys)
TRUNCATE TABLE "booking_audit_logs" CASCADE;
TRUNCATE TABLE "booking_import_errors" CASCADE;
TRUNCATE TABLE "booking_imports" CASCADE;
TRUNCATE TABLE "quotations" CASCADE;
TRUNCATE TABLE "bookings" CASCADE;
TRUNCATE TABLE "enquiries" CASCADE;
TRUNCATE TABLE "vehicles" CASCADE;
TRUNCATE TABLE "models" CASCADE;

-- Delete multi-dealership tables if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_catalogs') THEN
        TRUNCATE TABLE "vehicle_catalogs" CASCADE;
    END IF;
END $$;

TRUNCATE TABLE "users" CASCADE;
TRUNCATE TABLE "dealers" CASCADE;

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dealerships') THEN
        TRUNCATE TABLE "dealerships" CASCADE;
    END IF;
END $$;

-- Keep roles table (system data)
-- TRUNCATE TABLE "roles" CASCADE;  -- Commented out

COMMIT;

-- Verify cleanup
SELECT 'booking_audit_logs' as table_name, COUNT(*) as count FROM "booking_audit_logs"
UNION ALL
SELECT 'booking_import_errors', COUNT(*) FROM "booking_import_errors"
UNION ALL
SELECT 'booking_imports', COUNT(*) FROM "booking_imports"
UNION ALL
SELECT 'quotations', COUNT(*) FROM "quotations"
UNION ALL
SELECT 'bookings', COUNT(*) FROM "bookings"
UNION ALL
SELECT 'enquiries', COUNT(*) FROM "enquiries"
UNION ALL
SELECT 'vehicles', COUNT(*) FROM "vehicles"
UNION ALL
SELECT 'models', COUNT(*) FROM "models"
UNION ALL
SELECT 'users', COUNT(*) FROM "users"
UNION ALL
SELECT 'dealers', COUNT(*) FROM "dealers"
UNION ALL
SELECT 'roles', COUNT(*) FROM "roles";

