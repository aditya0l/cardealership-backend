-- This script should be run manually in Render's PostgreSQL console
-- Go to: Render Dashboard > Your Database > Connect > PSQL

-- Mark the failed migration as rolled back
DELETE FROM "_prisma_migrations" WHERE migration_name = '20251011_add_employee_hierarchy_stock_and_models';

