# ⚡ Render Deployment - Quick Start Checklist

**Use this checklist to deploy in 15 minutes!**

---

## ✅ **Pre-Deployment Checklist**

- [ ] Code builds successfully (`npm run build` - already tested ✅)
- [ ] `.env` file has Firebase credentials
- [ ] `.gitignore` configured correctly ✅
- [ ] `render.yaml` created ✅

---

## 📋 **Deployment Steps**

### **STEP 1: GitHub** (5 min)
- [ ] Create GitHub repository
- [ ] Push code to GitHub:
  ```bash
  git init
  git add .
  git commit -m "Production ready"
  git remote add origin https://github.com/YOUR_USERNAME/car-dealership-backend.git
  git push -u origin main
  ```

### **STEP 2: Render Account** (2 min)
- [ ] Go to https://render.com/
- [ ] Sign up with GitHub
- [ ] Authorize Render

### **STEP 3: PostgreSQL Database** (2 min)
- [ ] New + → PostgreSQL
- [ ] Name: `dealership-db`
- [ ] Region: Singapore
- [ ] Plan: Free
- [ ] Create Database
- [ ] **Copy Internal Database URL** ← Important!

### **STEP 4: Web Service** (3 min)
- [ ] New + → Web Service
- [ ] Connect GitHub repo: `car-dealership-backend`
- [ ] Settings:
  ```
  Name: car-dealership-backend
  Region: Singapore
  Build Command: npm install && npx prisma generate && npm run build
  Start Command: npx prisma migrate deploy && npm start
  Plan: Free
  ```
- [ ] Click "Create Web Service" (don't deploy yet!)

### **STEP 5: Environment Variables** (3 min)
- [ ] Go to Environment tab
- [ ] Add these variables (see ENVIRONMENT_VARIABLES_FOR_RENDER.md):
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=4000`
  - [ ] `DATABASE_URL` (from database)
  - [ ] `FIREBASE_PROJECT_ID`
  - [ ] `FIREBASE_PRIVATE_KEY` (entire multi-line key!)
  - [ ] `FIREBASE_CLIENT_EMAIL`
  - [ ] `FIREBASE_DATABASE_URL`
- [ ] Save Changes

### **STEP 6: Deploy** (Auto)
- [ ] Render starts building automatically
- [ ] Watch logs for success messages
- [ ] Wait for: "Live" status
- [ ] **Copy your service URL:** `https://car-dealership-backend-xxxx.onrender.com`

### **STEP 7: Test** (1 min)
- [ ] Test health: `https://your-url.onrender.com/api/health`
- [ ] Should return: `{"status": "ok", ...}`
- [ ] ✅ Deployment successful!

### **STEP 8: Update Frontends** (2 min)
- [ ] React Dashboard `.env`:
  ```
  VITE_API_BASE_URL=https://your-url.onrender.com/api
  ```
- [ ] Expo app config:
  ```
  const API_URL = 'https://your-url.onrender.com/api';
  ```
- [ ] Restart dev servers

---

## 🆘 **If Something Goes Wrong**

### Build Fails?
```
Check Render logs for specific error
Common issues:
  ❌ Missing dependencies → Check package.json
  ❌ Prisma error → DATABASE_URL not set
  ❌ Firebase error → FIREBASE_PRIVATE_KEY incomplete
```

### Fix in Render Dashboard:
```
Environment tab → Fix variable → Save
Service will auto-rebuild
```

---

## 🎯 **After Successful Deployment**

### Your URLs:
```
Backend API: https://car-dealership-backend-xxxx.onrender.com/api
Health Check: https://car-dealership-backend-xxxx.onrender.com/api/health
```

### Run One-Time Scripts:
```
Render Dashboard → Shell tab → Run:

npx ts-node scripts/backfill-employee-ids.ts
npx ts-node scripts/seed-sample-data.ts
```

### Share With Team:
```
API Base URL: https://your-url.onrender.com/api

Test Credentials:
Email: advisor@test.com
Password: TestPass123!
```

---

## ⏱️ **Timeline**

- **Step 1-2:** 7 minutes
- **Step 3-5:** 8 minutes  
- **Step 6:** 3 minutes (auto)
- **Step 7-8:** 3 minutes
- **Total: ~20 minutes**

---

## 📞 **Get Help**

**If stuck, share:**
1. Screenshot of Render error logs
2. Which step you're on
3. Error message

I'll help you fix it!

---

## 🎊 **Success Looks Like:**

```
✅ Service status: Live (green)
✅ Health check: Returns 200 OK
✅ URL: https://car-dealership-backend-xxxx.onrender.com
✅ Team can access from anywhere
✅ Always running (or wakes up in 30s on free tier)
```

---

**Ready to deploy? Follow the steps above!** 🚀

**Detailed guide:** See `RENDER_DEPLOYMENT_GUIDE.md`

