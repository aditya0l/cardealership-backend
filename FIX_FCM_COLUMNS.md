# 🔧 Fix: Missing FCM Columns Error

## 🚨 Problem

You're getting this error:
```
The column `users.fcm_token` does not exist in the current database.
```

This happens because the FCM notification columns haven't been added to your Render database.

---

## ✅ Solution Options

### Option 1: Automatic Fix (Recommended)

The fix script is now integrated into the deployment process. **Just redeploy your Render service** and it will automatically add the missing columns.

1. Go to your Render Dashboard
2. Click on your backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment to complete

The fix script will run automatically before migrations.

---

### Option 2: Manual SQL Fix (Immediate)

If you need to fix it immediately without redeploying:

1. **Connect to your Render database:**
   - Go to Render Dashboard → Your PostgreSQL service
   - Click "Connect" → Copy the "External Connection String"

2. **Run the SQL fix:**
   ```bash
   # Using psql (if you have it installed)
   psql "YOUR_DATABASE_URL" -f scripts/fix-fcm-columns.sql
   
   # OR connect directly and run:
   psql "YOUR_DATABASE_URL"
   ```

3. **Then run these SQL commands:**
   ```sql
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fcm_token" TEXT;
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "device_type" TEXT;
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_token_updated" TIMESTAMP(3);
   ```

4. **Verify columns were added:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'users' 
   AND column_name IN ('fcm_token', 'device_type', 'last_token_updated');
   ```

---

### Option 3: Run Fix Script Manually

If you have access to run Node scripts on Render:

1. SSH into your Render service (if available)
2. Run:
   ```bash
   node scripts/fix-fcm-columns.js
   ```

---

## 🔍 What This Fixes

The script adds three columns to the `users` table:
- `fcm_token` (TEXT) - Firebase Cloud Messaging token for push notifications
- `device_type` (TEXT) - Device type ('android' or 'ios')
- `last_token_updated` (TIMESTAMP) - When the FCM token was last updated

These columns are required for the notification system to work.

---

## ✅ Verification

After applying the fix, test your login:

```bash
curl -X POST https://cardealership-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"advisor@test.com","password":"advisor12345"}'
```

You should get a successful response instead of a 401 error.

---

## 📝 Notes

- The fix script uses `ADD COLUMN IF NOT EXISTS`, so it's safe to run multiple times
- The columns are nullable, so existing users won't be affected
- This fix is now integrated into the deployment process, so future deployments will handle this automatically

---

**Last Updated:** After FCM columns fix implementation

