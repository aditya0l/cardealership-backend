# 🗑️ DATA CLEANUP GUIDE

Quick reference for cleaning test data from your system.

---

## ⚡ **QUICK COMMANDS**

### **Complete Cleanup (Recommended)**
```bash
# Clean database
npx ts-node cleanup-all-data.ts

# Clean Firebase
node cleanup-firebase-users.js
```

### **Fast SQL Cleanup (Database Only)**
```bash
psql $DATABASE_URL -f cleanup-database.sql
```

---

## 📋 **AVAILABLE SCRIPTS**

| Script | Purpose | What it Deletes |
|--------|---------|-----------------|
| `cleanup-all-data.ts` | Database cleanup | Users, bookings, enquiries, quotations, vehicles, dealers, dealerships |
| `cleanup-firebase-users.js` | Firebase cleanup | All Firebase Auth users |
| `cleanup-database.sql` | SQL cleanup | Same as cleanup-all-data.ts but faster |

---

## 🔄 **CLEANUP WORKFLOW**

### **Step 1: Clean Database**
```bash
npx ts-node cleanup-all-data.ts
```

**Output:**
```
✅ Deleted X audit log entries
✅ Deleted X import records
✅ Deleted X quotations
✅ Deleted X bookings
✅ Deleted X enquiries
✅ Deleted X vehicles
✅ Deleted X users
✅ Deleted X dealers
```

### **Step 2: Clean Firebase**
```bash
node cleanup-firebase-users.js
```

**Output:**
```
✅ Deleted: admin@test.com
✅ Deleted: advisor@test.com
...
📊 Total users deleted: X
```

### **Step 3: Verify**
```bash
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function verify() {
  const users = await prisma.user.count();
  const bookings = await prisma.booking.count();
  console.log('Users:', users, '- Should be 0');
  console.log('Bookings:', bookings, '- Should be 0');
  await prisma.\$disconnect();
}
verify();
"
```

---

## 🔒 **WHAT'S PRESERVED**

The cleanup scripts preserve:

✅ **Roles table** (ADMIN, GENERAL_MANAGER, etc.)  
✅ **Database schema** (all tables and structure)  
✅ **Migrations** (migration history)  
✅ **Indexes and constraints**

---

## 🚀 **AFTER CLEANUP**

### **Create Fresh Test Data**

```bash
# Option 1: Create test users
node create-firebase-users.js

# Option 2: Seed dealerships
npx ts-node prisma/seed-dealerships.ts

# Option 3: Use admin dashboard
# Go to your dashboard and create users/data manually
```

---

## ⚠️ **SAFETY TIPS**

1. **Double-check environment**: Make sure you're connected to the right database
2. **Backup if needed**: Cleanup is permanent and cannot be undone
3. **Test locally first**: Run on local database before production
4. **Keep roles**: Never delete the roles table

---

## 🔍 **TROUBLESHOOTING**

### **"Table doesn't exist" errors**
This is normal for tables that haven't been created yet (like `dealerships` if migration hasn't run).
The script handles this gracefully.

### **Firebase permission errors**
Ensure your `.env` has valid Firebase credentials:
```
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

### **Database connection errors**
Check your `DATABASE_URL` in `.env`:
```bash
echo $DATABASE_URL
```

---

## 📊 **CHECK COUNTS BEFORE CLEANUP**

```bash
# Quick count check
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function count() {
  console.log('Current counts:');
  console.log('Users:', await prisma.user.count());
  console.log('Bookings:', await prisma.booking.count());
  console.log('Enquiries:', await prisma.enquiry.count());
  await prisma.\$disconnect();
}
count();
"
```

---

## 🎯 **COMMON SCENARIOS**

### **Scenario 1: Fresh Development Start**
```bash
npx ts-node cleanup-all-data.ts
node cleanup-firebase-users.js
node create-firebase-users.js
```

### **Scenario 2: Remove Test Bookings Only**
```bash
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function cleanup() {
  await prisma.booking.deleteMany({});
  console.log('Bookings deleted');
  await prisma.\$disconnect();
}
cleanup();
"
```

### **Scenario 3: Reset to Clean State with Roles**
```bash
psql $DATABASE_URL -f cleanup-database.sql
node cleanup-firebase-users.js
```

---

## 🛠️ **CUSTOM CLEANUP**

### **Delete Specific User**
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
await prisma.user.delete({ where: { email: 'test@test.com' } });
```

### **Delete Old Bookings**
```typescript
await prisma.booking.deleteMany({
  where: {
    createdAt: {
      lt: new Date('2025-01-01')
    }
  }
});
```

---

## 📞 **NEED HELP?**

- Check `CLEANUP_COMPLETE.md` for the last cleanup summary
- Review script files for detailed implementation
- Test on local database first before production

---

**Remember: Cleanup is permanent. Always double-check before running!** ⚠️

