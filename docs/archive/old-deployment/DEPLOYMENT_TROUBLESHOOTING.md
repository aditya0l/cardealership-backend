# 🔧 Deployment Troubleshooting Guide

## Database Connection Errors During Deployment

### Error: "Can't reach database server"

**Symptoms:**
```
Error: P1001: Can't reach database server at `dpg-xxxxx:5432`
```

**Causes:**
1. Database service is starting up (takes 1-2 minutes on Render)
2. DATABASE_URL environment variable not set correctly
3. Network connectivity issues
4. Migration script running before database is ready

---

## 🔍 Solution Steps

### Step 1: Check Render Dashboard Configuration

1. Go to your Render dashboard
2. Click on your web service
3. Go to **Settings** tab
4. Check **Build Command** and **Start Command**

**Recommended Start Command:**
```bash
npx prisma migrate deploy && npm start
```

**If you need the migration fix script:**
```bash
node scripts/fix-failed-migration.js || true && npx prisma migrate deploy && npm start
```

**⚠️ Important:** The `|| true` ensures the script failure doesn't stop deployment.

---

### Step 2: Verify Environment Variables

In Render Dashboard → Environment tab, ensure you have:

1. **DATABASE_URL** - Should be automatically set if database is linked
   - Go to Environment → DATABASE_URL
   - Should be set to "Add from Database" → Select your PostgreSQL database

2. **Other Required Variables:**
   - `NODE_ENV=production`
   - `PORT=4000`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY` (full multi-line key)
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_DATABASE_URL`

---

### Step 3: Check Database Status

1. Go to Render Dashboard → Databases
2. Find your PostgreSQL database (`dealership-db`)
3. Ensure it shows **"Available"** status (not "Provisioning")
4. If it's still provisioning, wait 2-3 minutes

---

### Step 4: Manual Database Connection Test

If you have access to a local terminal with Render CLI:

```bash
# Install Render CLI
npm install -g render-cli

# Connect to your database
render db:shell dealership-db
```

Or test connection from your local machine:
```bash
# Get connection string from Render dashboard
export DATABASE_URL="postgresql://..."
npx prisma db execute --stdin
```

---

### Step 5: Simplified Start Command (If Issues Persist)

If migrations keep failing, use this simpler start command:

```bash
npm start
```

Then run migrations manually via Render Shell:
```bash
# In Render Shell
cd /opt/render/project/src
npx prisma migrate deploy
```

Or handle migrations in your application code:
```typescript
// In src/server.ts or app.ts
import prisma from './config/db';

async function runMigrations() {
  try {
    await prisma.$executeRawUnsafe('SELECT 1'); // Test connection
    // Migrations run automatically via startCommand
  } catch (error) {
    console.error('Database not ready:', error.message);
    // Retry after delay
  }
}
```

---

## 🚀 Recommended Deployment Flow

### Option 1: Standard (Recommended)

**render.yaml startCommand:**
```yaml
startCommand: npx prisma migrate deploy && npm start
```

This runs migrations every time the service starts.

**Pros:**
- Simple and reliable
- Migrations always up-to-date

**Cons:**
- Slightly slower startup (runs migrations each time)

---

### Option 2: With Migration Cleanup

**render.yaml startCommand:**
```yaml
startCommand: node scripts/fix-failed-migration.js || true && npx prisma migrate deploy && npm start
```

**Pros:**
- Handles failed migrations automatically

**Cons:**
- More complex
- May fail if database isn't ready

**Note:** The script now handles connection errors gracefully and exits successfully.

---

### Option 3: Skip Migrations on Start (Not Recommended)

**render.yaml startCommand:**
```yaml
startCommand: npm start
```

Run migrations manually or via cron.

---

## 🔄 Retry Deployment

If deployment fails:

1. **Wait 2-3 minutes** (database might be provisioning)
2. Go to Render Dashboard → Your Service → **Manual Deploy**
3. Click **Deploy latest commit**
4. Watch the logs for errors

---

## 📋 Common Issues & Fixes

### Issue 1: Migration Script Fails

**Error:**
```
Can't reach database server at `dpg-xxxxx:5432`
```

**Fix:**
The migration fix script now handles this gracefully. If it still fails:
1. Remove the fix script from startCommand temporarily
2. Use: `npx prisma migrate deploy && npm start`
3. Fix migrations manually after deployment

---

### Issue 2: DATABASE_URL Not Set

**Error:**
```
DATABASE_URL environment variable is missing
```

**Fix:**
1. Go to Render Dashboard → Environment
2. Ensure DATABASE_URL is linked to your database
3. If not, click "Add Environment Variable" → "Add from Database"
4. Select your PostgreSQL database

---

### Issue 3: Migration Already Applied

**Error:**
```
Migration `20251002200510_update_rbac_roles` is already applied
```

**Fix:**
This is normal. The migration cleanup script handles this, but if needed:
1. Connect to database via Render Shell
2. Check `_prisma_migrations` table
3. Remove duplicate entries manually (be careful!)

---

### Issue 4: Connection Timeout

**Error:**
```
Connection timeout after 10000ms
```

**Fix:**
1. Wait for database to finish provisioning (2-3 minutes)
2. Check database status in Render Dashboard
3. Retry deployment
4. If persistent, contact Render support

---

## ✅ Verification Steps

After deployment succeeds:

1. **Check Health Endpoint:**
   ```bash
   curl https://your-app.onrender.com/api/health
   ```

2. **Test Database Connection:**
   ```bash
   curl https://your-app.onrender.com/api/health
   # Should return database status
   ```

3. **Check Logs:**
   - Render Dashboard → Your Service → Logs
   - Should show: "Server running on port 4000"
   - No database connection errors

---

## 🆘 If Nothing Works

1. **Reset Start Command:**
   - Use simplest version: `npm start`
   - Handle migrations separately

2. **Check Database Logs:**
   - Render Dashboard → Database → Logs
   - Look for connection errors

3. **Verify Database Status:**
   - Ensure database is not paused
   - Check if it's on free tier (may have limits)

4. **Contact Render Support:**
   - Render Dashboard → Support
   - Include error logs and deployment ID

---

## 📝 Notes

- Free tier databases on Render can be slower to start
- First deployment always takes longer (3-5 minutes)
- Database provisioning takes 1-2 minutes
- Migration scripts should handle connection errors gracefully
- Always test DATABASE_URL format before deployment

