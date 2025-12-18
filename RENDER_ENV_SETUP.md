# 🔐 Render Environment Variables Setup

## ⚠️ CRITICAL: DATABASE_URL Must Be Set

Your app requires `DATABASE_URL` to connect to the database. This is different from `RENDER_DATABASE_URL` (which is only for the migration script).

## 📋 Required Environment Variables

### 1. DATABASE_URL (REQUIRED - App Connection)

This is what your deployed app uses to connect to the database.

**Your Render Database URL:**
```
postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47
```

**How to Set in Render:**

1. Go to **Render Dashboard** → Your Web Service (`car-dealership-backend`)
2. Click **"Environment"** tab
3. Click **"Add Environment Variable"** (or edit if exists)
4. **Key:** `DATABASE_URL`
5. **Value:** Paste your Render database URL (use **Internal URL** if web service is in same region, **External URL** if different regions)
6. Click **"Save Changes"**

**OR Link from Database:**

1. In Environment tab, find `DATABASE_URL`
2. Click **"Add from Database"** button
3. Select your PostgreSQL database
4. Choose **"Internal Database URL"** (for same region) or **"External Database URL"** (for cross-region)
5. Save

### 2. RENDER_DATABASE_URL (Optional - Migration Only)

This is ONLY for the migration script when running from your local machine.

**Set in your local `.env` file:**
```bash
RENDER_DATABASE_URL="postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a.virginia-postgres.render.com/dealership_db_9v47"
```

**Do NOT set this in Render Dashboard** - it's only for local migration.

### 3. Firebase Variables (REQUIRED)

Set these in Render Dashboard → Environment:

- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Full private key (multi-line)
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `FIREBASE_DATABASE_URL` - Firebase Realtime Database URL

### 4. Other Variables

- `NODE_ENV` = `production`
- `PORT` = `4000` (Render may override this)

## 🚀 Quick Setup Steps

### Step 1: Set DATABASE_URL in Render

1. **Render Dashboard** → Your Web Service → **Environment** tab
2. **Add Environment Variable:**
   - Key: `DATABASE_URL`
   - Value: `postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47`
   - **OR** click "Add from Database" and select your database
3. **Save Changes**

### Step 2: Set Firebase Variables

Add all Firebase variables (see above)

### Step 3: Redeploy

After saving environment variables:
1. Click **"Manual Deploy"** → **"Deploy latest commit"**
2. Watch logs - should see:
   ```
   ✅ Database connection successful
   📦 Running database migrations...
   🚀 Starting application...
   ```

## 🔍 Verify Environment Variables

After setting, verify in Render Dashboard:
- Go to **Environment** tab
- You should see:
  - ✅ `DATABASE_URL` (with your database URL)
  - ✅ `FIREBASE_PROJECT_ID`
  - ✅ `FIREBASE_PRIVATE_KEY`
  - ✅ `FIREBASE_CLIENT_EMAIL`
  - ✅ `FIREBASE_DATABASE_URL`
  - ✅ `NODE_ENV` = `production`

## ⚠️ Common Mistakes

### ❌ Wrong: Setting RENDER_DATABASE_URL in Render
- `RENDER_DATABASE_URL` is only for local migration script
- Your app needs `DATABASE_URL`, not `RENDER_DATABASE_URL`

### ❌ Wrong: Using External URL when services are in same region
- If web service and database are in same region, use **Internal URL**
- Internal URL is faster and doesn't count against connection limits

### ❌ Wrong: Not setting DATABASE_URL at all
- The app **requires** `DATABASE_URL` to function
- Without it, you'll see: "Environment variable not found: DATABASE_URL"

## 📝 Internal vs External URL

**Your Database URLs:**

**Internal (for same-region services):**
```
postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47
```

**External (for cross-region or local):**
```
postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a.virginia-postgres.render.com/dealership_db_9v47
```

**Which to use:**
- **Internal URL**: If your web service is in Virginia (same region as database)
- **External URL**: If your web service is in a different region, or for local connections

---

**Last Updated:** After fixing DATABASE_URL error

