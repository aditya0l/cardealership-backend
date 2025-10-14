# 🚀 DEPLOYMENT INSTRUCTIONS - MULTI-DEALERSHIP SYSTEM

## ✅ **CURRENT STATUS**

- ✅ **Code:** All files created and committed locally
- ✅ **Build:** TypeScript compilation successful
- ✅ **Migration:** SQL script ready
- ✅ **Seed Data:** Sample dealership and catalog ready
- ⏳ **Git Push:** Waiting for authentication fix

---

## 🔧 **IMMEDIATE ACTION REQUIRED**

### **Fix Git Authentication & Push**

The commit is ready but couldn't push due to authentication error:
```
remote: Permission to aditya0l/cardealership-backend.git denied to adityarove.
```

**Solution - Use one of these methods:**

---

### **Method 1: GitHub Personal Access Token (Recommended)**

1. **Generate Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Classic"
   - Select scopes: `repo` (full control)
   - Click "Generate token"
   - **Copy the token** (starts with `ghp_`)

2. **Push with Token:**
   ```bash
   cd /Users/adityajaif/car-dealership-backend
   git push https://aditya0l:ghp_YOUR_TOKEN@github.com/aditya0l/cardealership-backend.git main
   ```

   **OR set it as remote:**
   ```bash
   git remote set-url origin https://aditya0l:ghp_YOUR_TOKEN@github.com/aditya0l/cardealership-backend.git
   git push origin main
   ```

---

### **Method 2: GitHub CLI (Easiest)**

```bash
# Install GitHub CLI if not installed
brew install gh

# Login
gh auth login
# Select: GitHub.com
# Select: HTTPS
# Authenticate with browser

# Push
cd /Users/adityajaif/car-dealership-backend
git push origin main
```

---

### **Method 3: SSH Key**

```bash
# Add SSH key to GitHub (if you have one)
git remote set-url origin git@github.com:aditya0l/cardealership-backend.git
git push origin main
```

---

## 📋 **AFTER SUCCESSFUL PUSH**

### **1. Monitor Render Deployment**

- Go to: https://dashboard.render.com/web/srv-ctajsg68ii6s73bk0qg0
- Click **"Events"** tab
- Wait for "Deploy succeeded" (3-5 minutes)

### **2. Check Deployment Logs**

Click **"Logs"** tab and look for:
```
✔ Generated Prisma Client
✔ Compilation successful
Running migration: 20251013_add_multi_dealership_system
✔ Migration applied successfully
Server listening on port 4000
```

### **3. Verify Migration**

Test if new tables exist:
```bash
curl https://automotive-backend-frqe.onrender.com/api/dealerships \
  -H "Authorization: Bearer test-user"
```

**Expected:** Empty array or existing dealerships

---

## 🧪 **POST-DEPLOYMENT TESTING**

### **Test 1: Create Dealership**

```bash
curl -X POST https://automotive-backend-frqe.onrender.com/api/dealerships \
  -H "Authorization: Bearer test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mumbai Tata Motors",
    "code": "TATA-MUM-001",
    "type": "TATA",
    "email": "mumbai@tata.com",
    "phone": "+91-22-12345678",
    "address": "Mumbai Highway",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "brands": ["TATA"]
  }'
```

### **Test 2: List Dealerships**

```bash
curl https://automotive-backend-frqe.onrender.com/api/dealerships \
  -H "Authorization: Bearer test-user"
```

### **Test 3: Add Vehicle to Catalog**

```bash
# Replace {dealershipId} with ID from Test 1
curl -X POST "https://automotive-backend-frqe.onrender.com/api/dealerships/{dealershipId}/catalog" \
  -H "Authorization: Bearer test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "TATA",
    "model": "Nexon",
    "variants": [{
      "name": "XZ+ Lux",
      "vcCode": "NXN-XZ",
      "fuelTypes": ["Petrol"],
      "transmissions": ["Automatic"],
      "colors": [{"name": "Red", "code": "R", "additionalCost": 0, "isAvailable": true}],
      "exShowroomPrice": 1149000,
      "rtoCharges": 85000,
      "insurance": 45000,
      "accessories": 15000,
      "onRoadPrice": 1294000,
      "isAvailable": true
    }]
  }'
```

### **Test 4: Get Catalog**

```bash
curl "https://automotive-backend-frqe.onrender.com/api/dealerships/{dealershipId}/catalog" \
  -H "Authorization: Bearer test-user"
```

---

## 📊 **COMMIT SUMMARY**

```
Commit: ddf3329
Message: Implement multi-dealership system

Files Changed: 9
- Created: 6 new files
- Modified: 3 existing files

New Features:
- Dealership management (8 endpoints)
- Vehicle catalog management (7 endpoints)
- Data isolation by dealership
- Dealership context middleware
- Multi-dealership database schema
```

---

## 🔍 **TROUBLESHOOTING**

### **If Push Fails:**

**Error:** "Permission denied"
- **Fix:** Use GitHub token (Method 1 above)

**Error:** "Authentication failed"
- **Fix:** Use GitHub CLI (Method 2 above)

**Error:** "Repository not found"
- **Fix:** Check repository name and your access

### **If Migration Fails:**

Check Render logs for specific error. Common issues:
- Enum type already exists → Add `IF NOT EXISTS` (already handled)
- Table already exists → Add `IF NOT EXISTS` (already handled)
- Foreign key constraint fails → Check if referenced table exists

### **If Endpoints Return 404:**

- Check if routes are registered in `src/app.ts`
- Verify `dealershipRoutes` is imported
- Check `/api/dealerships` is mounted correctly

---

## ✅ **SUCCESS CRITERIA**

After deployment, these should all work:

- ✅ `GET /api/dealerships` returns 200
- ✅ `POST /api/dealerships` creates new dealership
- ✅ `POST /api/dealerships/{id}/catalog` adds vehicle
- ✅ All existing endpoints still work (backwards compatible)
- ✅ Data isolation prevents cross-dealership access

---

## 🎯 **READY TO DEPLOY!**

**Just push the code and Render will handle the rest.**

Use the GitHub token method (Method 1) - it's the most reliable!

---

## 📞 **HELP**

If you need a GitHub token:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name: "Car Dealership Backend"
4. Select scope: **repo** (check the box)
5. Click "Generate token" at bottom
6. **Copy the token** (you won't see it again!)
7. Use it as password when pushing

**The token starts with `ghp_` and is about 40 characters long.**

---

**Once you push, the deployment is automatic!** 🚀

