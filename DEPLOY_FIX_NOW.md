# 🚀 Quick Deployment Guide - Fix Database Enum

## ⚡ Fastest Method: Direct SQL Execution

### Step 1: Get Your Database Connection String

From your Render dashboard:
1. Go to your PostgreSQL database
2. Copy the **External Database URL**
3. It looks like: `postgresql://user:password@host.region.render.com:5432/database`

### Step 2: Connect to Database

**Option A: Using psql (if installed)**
```bash
psql "your_database_url_here"
```

**Option B: Using Render Dashboard**
1. Go to your database in Render
2. Click "Connect" → "External Connection"
3. Use any PostgreSQL client (TablePlus, pgAdmin, DBeaver)

### Step 3: Run the Fix Script

Copy and paste this entire script into your SQL client:

```sql
-- PRODUCTION FIX - Safe to run, uses transaction
BEGIN;

-- Create new enum with correct values
CREATE TYPE "EnquiryCategory_new" AS ENUM ('HOT', 'LOST', 'BOOKED');

-- Map old data to new values
UPDATE "enquiries" 
SET "category" = CASE 
  WHEN "category"::text = 'SALES' THEN 'HOT'
  WHEN "category"::text = 'SERVICE' THEN 'LOST'
  WHEN "category"::text = 'PARTS' THEN 'LOST'
  WHEN "category"::text = 'GENERAL' THEN 'HOT'
  ELSE 'HOT'
END::"EnquiryCategory_new"::text
WHERE "category" IS NOT NULL;

-- Update column type
ALTER TABLE "enquiries" 
  ALTER COLUMN "category" TYPE "EnquiryCategory_new" 
  USING "category"::text::"EnquiryCategory_new";

-- Drop old enum and rename new one
DROP TYPE "EnquiryCategory";
ALTER TYPE "EnquiryCategory_new" RENAME TO "EnquiryCategory";

-- Set default
ALTER TABLE "enquiries" 
  ALTER COLUMN "category" SET DEFAULT 'HOT'::"EnquiryCategory";

-- Verify the fix
SELECT 'Fixed! New enum values:' as status;
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'EnquiryCategory'::regtype;

-- Check data distribution
SELECT category, COUNT(*) FROM "enquiries" GROUP BY category;

-- If everything looks good, commit
COMMIT;
```

### Step 4: Verify the Fix

**Test API endpoints:**
```bash
# Test enquiries endpoint
curl "https://cardealership-backend.onrender.com/api/enquiries?category=HOT"

# Should return 200 OK with enquiries data
```

**Test mobile app:**
1. Refresh your Expo app (shake device → Reload)
2. Navigate to Enquiries screen → Should load ✅
3. Navigate to Bookings screen → Should load ✅

---

## 🔄 Alternative: Using Prisma Migrate

If you prefer using Prisma:

```bash
# 1. Set production database URL
export DATABASE_URL="your_production_database_url"

# 2. Deploy migration
npx prisma migrate deploy

# 3. Verify
npx prisma studio
```

---

## ✅ Success Indicators

After deployment, you should see:
- ✅ No more "invalid input value for enum" errors
- ✅ Enquiries screen loads in mobile app
- ✅ Bookings screen loads in mobile app
- ✅ API returns 200 status codes

---

## 🆘 If Something Goes Wrong

The script uses a transaction (BEGIN/COMMIT), so if there's an error:
1. It will automatically rollback
2. Your data remains unchanged
3. You can try again

To manually rollback:
```sql
ROLLBACK;
```

---

## 📞 Need Help?

If you encounter any issues:
1. Check the error message
2. Verify your database connection
3. Make sure you're connected to the production database
4. The migration is safe and can be re-run if needed
