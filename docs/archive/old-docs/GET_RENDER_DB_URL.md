# 🔗 How to Get Your Render Database URL

## **Step 1: Go to Render Dashboard**

Visit: https://dashboard.render.com/

## **Step 2: Find Your PostgreSQL Database**

1. Click on **"PostgreSQL"** in the left sidebar OR
2. Find your database in the main dashboard

## **Step 3: Copy the Connection String**

1. Click on your PostgreSQL database
2. Scroll down to **"Connections"** section
3. Copy the **"External Database URL"** (not Internal)

It will look like:
```
postgresql://username:password@dpg-xxxxx.oregon-postgres.render.com/database_name
```

## **Step 4: Add to Your .env File**

Open `/Users/adityajaif/car-dealership-backend/.env` and find the line:

```
DEPLOYED_DATABASE_URL=""
```

Paste your database URL inside the quotes:

```
DEPLOYED_DATABASE_URL="postgresql://username:password@dpg-xxxxx.oregon-postgres.render.com/database_name"
```

## **Step 5: Run the Cleanup**

### **Check what's in the deployed database:**
```bash
cd /Users/adityajaif/car-dealership-backend
node cleanup-complete.js deployed
```

### **Clean everything (both databases + Firebase):**
```bash
node cleanup-complete.js all
```

---

## **Quick Reference:**

| Command | What It Does |
|---------|-------------|
| `node cleanup-complete.js local` | Clean local database only |
| `node cleanup-complete.js deployed` | Clean deployed (Render) database only |
| `node cleanup-complete.js firebase` | Clean Firebase only |
| `node cleanup-complete.js all` | Clean everything (both DBs + Firebase) |

---

## **Can't Find Your Database URL?**

### Option 1: Via Render Dashboard
1. Go to https://dashboard.render.com/
2. Click on your web service: **automotive-backend** (or similar)
3. Go to **Environment** tab
4. Look for `DATABASE_URL` - this is your deployed database URL
5. Click "Show" to reveal the full URL

### Option 2: Via Render CLI
```bash
render services env get <your-service-id>
```

---

## ⚠️ **Important Notes**

1. **External vs Internal URL**: Use the **External** URL for connections from your local machine
2. **Internal URL**: Only works from other Render services
3. **Security**: Keep this URL secret - it contains your database password

---

## ✅ **After Adding URL**

Verify it works:
```bash
node cleanup-complete.js deployed
```

This will show you:
- How many users are in the deployed database
- How many bookings, enquiries, etc.
- Ask for confirmation before deleting

---

**Need help?** The database URL should be in your Render dashboard under your PostgreSQL service!

