# 🔗 Render Database Connection Guide

## Your Database Details

**Database Name:** `dealership_db_9v47`  
**Region:** Virginia  
**Internal URL:** `postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47`  
**External URL:** `postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a.virginia-postgres.render.com/dealership_db_9v47`

## ✅ How to Connect Database to Web Service

### Method 1: Link Database (Recommended)

1. **Go to Render Dashboard**
   - Navigate to: https://dashboard.render.com
   - Click on your **Web Service** (`car-dealership-backend`)

2. **Open Environment Tab**
   - Click **"Environment"** in the left sidebar

3. **Add/Link DATABASE_URL**
   - If `DATABASE_URL` doesn't exist, click **"Add Environment Variable"**
   - If it exists, click **"Edit"** on `DATABASE_URL`
   - Click **"Add from Database"** button
   - Select your database from the dropdown
   - Choose **"Internal Database URL"** (not External)
   - Click **"Save Changes"**

### Method 2: Manual Entry (If linking doesn't work)

1. **Go to Environment Tab** (same as above)

2. **Add DATABASE_URL Manually**
   - Click **"Add Environment Variable"**
   - **Key:** `DATABASE_URL`
   - **Value:** Paste the **Internal URL**:
     ```
     postgresql://dealership_db_9v47_user:A9V6pcVXVeK9ywU4OyTMdSL1XLmX58Yq@dpg-d51qvqv6s9ss73et0o3g-a/dealership_db_9v47
     ```
   - Click **"Save Changes"**

## ⚠️ Important Notes

### Internal vs External URL

- **Use Internal URL** for:
  - Web services in the same region (faster, no connection limits)
  - Services on Render platform
  
- **Use External URL** for:
  - Local development connections
  - Connections from outside Render platform

### Region Mismatch

Your database is in **Virginia** region, but your `render.yaml` specifies **Singapore**. This is fine, but:
- If your web service is in Singapore, use the **External URL** (slower but works)
- If your web service is in Virginia, use the **Internal URL** (faster)
- Consider moving the web service to Virginia for better performance

## 🔄 After Connecting

Once `DATABASE_URL` is set:

1. **Save Changes** in Render Dashboard
2. **Manual Deploy** (if needed):
   - Click **"Manual Deploy"** → **"Deploy latest commit"**
3. **Watch Logs** - You should see:
   ```
   ✅ Database connection successful
   📦 Running database migrations...
   ✅ Migration deployment completed
   🚀 Starting application...
   ```

## 🧪 Test Connection

After deployment, test the connection:

```bash
curl https://your-service.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Backend running 🚀",
  "timestamp": "...",
  "environment": "production"
}
```

## 🆘 Troubleshooting

### Database Connection Fails

1. **Check Database Status**
   - Go to Render Dashboard → Databases
   - Ensure database shows **"Available"** (not "Provisioning")
   - Wait 2-3 minutes if still provisioning

2. **Verify DATABASE_URL**
   - Go to Environment tab
   - Check `DATABASE_URL` is set correctly
   - Ensure it's the **Internal URL** (for same-region services)

3. **Check Region**
   - If web service and database are in different regions, use **External URL**
   - Or move them to the same region for better performance

### Migration Errors

If migrations fail:
- Check database has proper permissions
- Verify `DATABASE_URL` is correct
- Check logs for specific error messages

---

**Last Updated:** After database creation

