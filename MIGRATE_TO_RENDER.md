# 🔄 Migrate Local Database to Render

This guide explains how to transfer your local database data to the Render database.

## 📋 Prerequisites

1. **Local database** is running and has data
2. **Render database** is created and accessible
3. **Render database URL** (Internal or External)

## 🔗 Get Your Render Database URL

1. Go to **Render Dashboard** → Your PostgreSQL Database
2. Scroll to **"Connections"** section
3. Copy the **Internal Database URL** (for same-region) or **External Database URL** (for cross-region/local)

Your URL should look like:
```
postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47
```

## 🚀 Migration Steps

### Step 1: Ensure Render Database Has Schema

First, make sure your Render database has the correct schema (tables structure):

1. **Connect DATABASE_URL to Render** in your web service (see `RENDER_DB_CONNECTION.md`)
2. **Deploy your service** - migrations will run automatically via `wait-for-db-and-deploy.js`
3. **Verify migrations completed** - check deployment logs

OR manually run migrations:

```bash
# Set Render database URL temporarily
export DATABASE_URL="postgresql://dealership_db_9v47_user:...@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47"

# Run migrations
npx prisma migrate deploy
```

### Step 2: Run Migration Script

#### Option A: Using Environment Variable (Recommended)

1. **Add Render database URL to `.env`**:
   ```bash
   # Add this line to your .env file
   RENDER_DATABASE_URL="postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47"
   ```

2. **Run migration script**:
   ```bash
   cd /Users/adityajaif/car-dealership-backend
   npm run migrate:local-to-render
   ```

#### Option B: Using Command Line Argument

```bash
cd /Users/adityajaif/car-dealership-backend
RENDER_DATABASE_URL="postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47" npm run migrate:local-to-render
```

### Step 3: Verify Migration

The script will:
1. ✅ Test connections to both databases
2. ✅ Show current data counts
3. ✅ Migrate data in correct order (Roles → Dealers → Users → Models → Vehicles → Enquiries → Bookings → Remarks)
4. ✅ Show final counts

## 📊 What Gets Migrated

The script migrates all data from these tables:
- ✅ **Roles** (ADMIN, GM, SM, TL, CA)
- ✅ **Dealers** (dealership information)
- ✅ **Users** (all users with their roles and relationships)
- ✅ **Models** (vehicle models)
- ✅ **Vehicles** (vehicle inventory)
- ✅ **Enquiries** (customer enquiries)
- ✅ **Bookings** (vehicle bookings)
- ✅ **Remarks** (enquiry/booking remarks)

## ⚠️ Important Notes

### Data Conflicts

- The script uses `upsert` operations, so:
  - **Existing data** in Render DB will be **updated** if IDs match
  - **New data** will be **created** if IDs don't exist
  - **No data will be deleted** - only added/updated

### Foreign Key Relationships

- Data is migrated in the correct order to respect foreign keys:
  1. Roles (no dependencies)
  2. Dealers (no dependencies)
  3. Users (depends on Roles, Dealers)
  4. Models (no dependencies)
  5. Vehicles (depends on Models, Dealers)
  6. Enquiries (depends on Users, Dealers)
  7. Bookings (depends on Enquiries, Users, Dealers)
  8. Remarks (depends on Enquiries, Bookings, Users)

### Firebase Users

- **Firebase users are NOT migrated** by this script
- You need to create Firebase users separately if needed
- The script only migrates database records

## 🔄 Alternative: Start Fresh on Render

If you want to start with a clean database on Render:

1. **Don't run the migration script**
2. **Run seed script** instead:
   ```bash
   # Set Render database URL
   export DATABASE_URL="postgresql://dealership_db_9v47_user:...@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47"
   
   # Run seed
   npm run seed
   ```

This will create:
- Default roles
- Sample dealers
- Test users (if seed script includes them)

## 🧪 Test After Migration

After migration, test your Render service:

```bash
# Test health endpoint
curl https://your-service.onrender.com/api/health

# Test login (if you migrated users)
curl -X POST https://your-service.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin12345"}'
```

## 🆘 Troubleshooting

### Error: Can't connect to local database

**Solution:**
- Ensure your local PostgreSQL is running
- Check `DATABASE_URL` in `.env` is correct
- Test connection: `npx prisma db execute --stdin` (type `SELECT 1;` and press Enter)

### Error: Can't connect to Render database

**Solution:**
- Verify Render database URL is correct
- Use **External URL** if connecting from local machine
- Use **Internal URL** only if running from Render service
- Check database is in "Available" status on Render

### Error: Foreign key constraint failed

**Solution:**
- Ensure migrations ran successfully on Render database
- Check that Roles and Dealers exist before migrating Users
- Re-run migration script (it's idempotent - safe to run multiple times)

### Migration is slow

**Solution:**
- This is normal for large datasets
- The script processes data sequentially to maintain relationships
- For very large datasets, consider using PostgreSQL `pg_dump` and `pg_restore`

## 📝 Quick Reference

```bash
# Add Render DB URL to .env
echo 'RENDER_DATABASE_URL="postgresql://..."' >> .env

# Run migration
npm run migrate:local-to-render

# Verify (check Render service logs or test API)
curl https://your-service.onrender.com/api/health
```

---

**Last Updated:** After creating migration script

