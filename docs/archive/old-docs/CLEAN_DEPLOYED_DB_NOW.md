# 🗑️ CLEAN DEPLOYED DATABASE - QUICK GUIDE

## 🎯 **PROBLEM**

Your dashboard shows old data because it connects to the **deployed database on Render**, which still has test data.

Dashboard URL: `https://automotive-backend-frqe.onrender.com/api`

---

## ✅ **SOLUTION - 2 OPTIONS**

### **OPTION 1: Get Render DB URL & Clean Locally** (Recommended)

#### Step 1: Get Your Render Database URL

1. Go to: https://dashboard.render.com/
2. Find your **PostgreSQL** database
3. Click on it
4. Scroll to **"Connections"** section
5. Copy the **"External Database URL"**

It looks like:
```
postgresql://username:password@dpg-xxxxx.oregon-postgres.render.com/database_name
```

#### Step 2: Add to .env File

Open `/Users/adityajaif/car-dealership-backend/.env` and update this line:

```bash
# Change this:
DEPLOYED_DATABASE_URL=""

# To this (paste your URL):
DEPLOYED_DATABASE_URL="postgresql://username:password@dpg-xxxxx.oregon-postgres.render.com/database_name"
```

#### Step 3: Run Cleanup Script

```bash
cd /Users/adityajaif/car-dealership-backend

# Clean ONLY the deployed database
node cleanup-complete.js deployed

# Or clean everything (deployed DB + Firebase)
node cleanup-complete.js all
```

---

### **OPTION 2: Use Render Dashboard** (Quick but Manual)

#### Step 1: Open Render Database Shell

1. Go to: https://dashboard.render.com/
2. Click on your **PostgreSQL** database
3. Click **"Shell"** tab
4. Wait for shell to connect

#### Step 2: Run SQL Commands

Copy and paste these commands one by one:

```sql
-- Delete all data
DELETE FROM booking_audit_logs;
DELETE FROM booking_import_errors;
DELETE FROM booking_imports;
DELETE FROM quotations;
DELETE FROM bookings;
DELETE FROM enquiries;
DELETE FROM vehicles;
DELETE FROM models;
DELETE FROM users;
DELETE FROM dealers;

-- Verify it's clean
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'enquiries', COUNT(*) FROM enquiries;
```

#### Step 3: Clean Firebase (If not done already)

```bash
cd /Users/adityajaif/car-dealership-backend
node cleanup-firebase-users.js
```

---

## ⚡ **FASTEST METHOD - SQL Script**

If you have the database URL, use SQL directly:

```bash
# Add to .env first, then:
cd /Users/adityajaif/car-dealership-backend

# Get the deployed DB URL from .env
DEPLOYED_DB_URL=$(grep DEPLOYED_DATABASE_URL .env | cut -d '=' -f2 | tr -d '"')

# Run SQL cleanup
psql "$DEPLOYED_DB_URL" -c "
DELETE FROM booking_audit_logs;
DELETE FROM booking_import_errors;
DELETE FROM booking_imports;
DELETE FROM quotations;
DELETE FROM bookings;
DELETE FROM enquiries;
DELETE FROM vehicles;
DELETE FROM models;
DELETE FROM users;
DELETE FROM dealers;
"

# Verify
psql "$DEPLOYED_DB_URL" -c "SELECT COUNT(*) FROM users;"
```

---

## 🔍 **VERIFY CLEANUP**

### Check Dashboard:
1. Refresh your dashboard: http://localhost:5173 (or wherever it runs)
2. Log in
3. Should show 0 bookings, 0 enquiries, etc.

### Check via API:
```bash
# Get a user token (login first)
curl https://automotive-backend-frqe.onrender.com/api/auth/users \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return empty array or error (no users)
```

---

## 📊 **WHAT WILL BE DELETED**

From **Deployed Database (Render)**:
- All users
- All bookings
- All enquiries
- All quotations
- All vehicles
- All dealers
- All audit logs

**Preserved:**
- Roles (ADMIN, GM, SM, TL, CA)
- Database schema
- Migrations

---

## ⚠️ **IMPORTANT**

- This cleans the **DEPLOYED** database (on Render)
- Your local database is already clean
- Firebase users are already clean
- After cleanup, dashboard will show no data
- You can then create fresh users and data

---

## 🚀 **AFTER CLEANUP**

Create fresh users:

```bash
# Option 1: Use your backend API
POST https://automotive-backend-frqe.onrender.com/api/auth/users/create-with-credentials

# Option 2: Use Firebase console
# Go to Firebase → Authentication → Add user

# Option 3: Recreate test users
node create-firebase-users.js
```

---

## 🆘 **NEED HELP?**

Can't find Render database URL?
1. Check Render dashboard → PostgreSQL → Connections
2. OR check Render web service → Environment → DATABASE_URL
3. OR ask someone who has access to Render

---

**Choose Option 1 or 2 above to clean the deployed database!** 🗑️

