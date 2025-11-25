# 🗑️ CLEANUP INSTRUCTIONS

## 📍 **Current Status**

✅ **Local Database**: CLEANED (23 users deleted)  
✅ **Firebase Auth**: CLEANED (26 users deleted)  
❓ **Deployed Database**: NOT YET CLEANED (if users still exist, they're here)

---

## 🎯 **To Clean the Deployed Database (Render)**

### **Step 1: Get Your Render Database URL**

1. Go to: https://dashboard.render.com/
2. Click on your **PostgreSQL** database
3. Copy the **External Database URL**
4. It looks like: `postgresql://user:pass@dpg-xxx.oregon-postgres.render.com/db_name`

### **Step 2: Add URL to .env File**

Open `.env` and update this line:
```bash
DEPLOYED_DATABASE_URL="paste-your-render-database-url-here"
```

### **Step 3: Run Cleanup**

```bash
# Clean deployed database only
node cleanup-complete.js deployed

# Or clean everything (local + deployed + Firebase)
node cleanup-complete.js all
```

---

## 🚀 **Quick Commands**

```bash
# Show usage
node cleanup-complete.js

# Clean local database
node cleanup-complete.js local

# Clean deployed (Render) database  
node cleanup-complete.js deployed

# Clean Firebase only
node cleanup-complete.js firebase

# Clean EVERYTHING (both databases + Firebase)
node cleanup-complete.js all
```

---

## ✅ **What We've Already Cleaned**

### Local Database (localhost:5432)
```
✅ 23 users deleted
✅ 0 bookings
✅ 0 enquiries
✅ 0 quotations
✅ 0 vehicles
```

### Firebase Authentication
```
✅ 26 users deleted including:
   - admin@test.com
   - advisor@test.com
   - manager@test.com
   - All test accounts
```

---

## 🔍 **Check What's in Deployed Database**

If you want to just CHECK (not delete) what's in the deployed database:

1. Add `DEPLOYED_DATABASE_URL` to `.env` (as shown above)
2. Run:
```bash
npx ts-node check-deployed-users.ts
```

This will show you:
- Number of users
- Number of bookings
- Number of enquiries
- List of all user emails

---

## ⚠️ **If You Don't Have the Deployed Database URL**

The deployed database is on Render. If you don't have access or URL:

1. Check Render Dashboard: https://dashboard.render.com/
2. Or check your Render service's Environment variables
3. Or ask for the database connection string from Render

**Without this URL, we can only clean the local database (which is already done!)**

---

## 📝 **Summary**

| Database | Status | Records Deleted |
|----------|--------|-----------------|
| Local (localhost) | ✅ CLEANED | 23 users |
| Firebase Auth | ✅ CLEANED | 26 users |
| Deployed (Render) | ⏳ PENDING | Need URL |

---

## 🆘 **Need Help?**

1. **Can't find Render DB URL?** → See `GET_RENDER_DB_URL.md`
2. **Want to use SQL instead?** → Use `cleanup-database.sql`
3. **Only want to clean specific tables?** → Edit `cleanup-complete.js`

---

## 🎯 **Next Steps After Cleanup**

Once all databases are clean:

```bash
# Create fresh test users
node create-firebase-users.js

# Or seed sample dealerships
npx ts-node prisma/seed-dealerships.ts

# Or start using your app fresh!
```

---

**The local database and Firebase are already clean. If you're seeing users, they're in the deployed database!** 🔍

