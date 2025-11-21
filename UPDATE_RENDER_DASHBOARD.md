# 🔧 Update Render Dashboard Start Command

## ⚠️ Important: Manual Update Required

Render is currently using a manually configured start command from the Dashboard that is overriding the `render.yaml` file.

## 📋 Current Command (Failing)

Render Dashboard is using:
```bash
node scripts/fix-failed-migration.js && npx prisma migrate resolve --rolled-back 20251002200510_update_rbac_roles || true && npx prisma migrate deploy && npm start
```

**Problem:** This command doesn't wait for the database to be ready, causing connection errors.

## ✅ Solution: Update to New Command

### **Option 1: Use New Retry Script (Recommended)**

**New Start Command:**
```bash
node scripts/wait-for-db-and-deploy.js
```

This script:
- ✅ Waits for database with automatic retries (up to 60 seconds)
- ✅ Runs migration fix (non-blocking)
- ✅ Resolves rolled-back migrations
- ✅ Runs migrations automatically
- ✅ Starts the application

---

## 🚀 How to Update in Render Dashboard

### Step 1: Go to Render Dashboard
1. Open https://dashboard.render.com
2. Click on your web service: `car-dealership-backend`

### Step 2: Navigate to Settings
1. Click on **"Settings"** tab (left sidebar)
2. Scroll down to **"Start Command"**

### Step 3: Update Start Command
1. **Delete** the current start command:
   ```
   node scripts/fix-failed-migration.js && npx prisma migrate resolve --rolled-back 20251002200510_update_rbac_roles || true && npx prisma migrate deploy && npm start
   ```

2. **Enter** the new start command:
   ```
   node scripts/wait-for-db-and-deploy.js
   ```

3. Click **"Save Changes"**

### Step 4: Manual Deploy
1. After saving, click **"Manual Deploy"** (top right)
2. Select **"Deploy latest commit"**
3. Watch the logs - you should see:
   ```
   🚀 Starting deployment with database connection retry...
   ⏳ Waiting for database connection...
   ⏳ Attempt 1/30: Database not ready yet, waiting 2s...
   ✅ Database connection successful on attempt X!
   📦 Running database migrations...
   🚀 Starting application...
   ```

---

## 📊 What Changed

### **Old Command:**
```bash
node scripts/fix-failed-migration.js && \
npx prisma migrate resolve --rolled-back 20251002200510_update_rbac_roles || true && \
npx prisma migrate deploy && \
npm start
```

**Issues:**
- ❌ No retry logic for database connection
- ❌ Fails immediately if database not ready
- ❌ Complex command with multiple `&&` operators
- ❌ Hard to debug if one step fails

### **New Command:**
```bash
node scripts/wait-for-db-and-deploy.js
```

**Benefits:**
- ✅ Intelligent retry logic (30 attempts, 2s delay)
- ✅ Waits up to 60 seconds for database
- ✅ Clear error messages
- ✅ Handles all steps in one script
- ✅ Better logging

---

## 🔄 Alternative: Use render.yaml (If Supported)

If your Render account supports `render.yaml` file:

1. The `render.yaml` file is already updated with:
   ```yaml
   startCommand: node scripts/wait-for-db-and-deploy.js
   ```

2. Render should automatically detect and use it on next deploy

3. **Check:** Go to Settings → "Use render.yaml for configuration" (if available)

---

## ✅ Verification

After updating, verify the deployment:

1. **Check Logs:**
   - Go to your service → "Logs" tab
   - You should see database retry messages
   - Should see "✅ Database connection successful"

2. **Check Health:**
   - Visit: `https://your-app.onrender.com/api/health`
   - Should return 200 OK

3. **Check Application:**
   - Application should start successfully
   - No database connection errors

---

## 🆘 Troubleshooting

### Issue: Script not found
**Solution:** Make sure you've pushed the latest code with `scripts/wait-for-db-and-deploy.js`

### Issue: Still getting connection errors
**Solution:** 
1. Wait 2-3 minutes (database might be provisioning)
2. Check database status in Render Dashboard → Databases
3. Verify DATABASE_URL environment variable is set correctly

### Issue: Script permissions error
**Solution:** The script is already executable, but if needed:
```bash
chmod +x scripts/wait-for-db-and-deploy.js
```

---

## 📝 Summary

**Action Required:** Update the Start Command in Render Dashboard from:
```
node scripts/fix-failed-migration.js && npx prisma migrate resolve --rolled-back 20251002200510_update_rbac_roles || true && npx prisma migrate deploy && npm start
```

**To:**
```
node scripts/wait-for-db-and-deploy.js
```

**Then:** Save and manually deploy to test.

This will fix all database connection issues automatically! 🎉

