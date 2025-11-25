# 🚀 Render.com Deployment Guide
**Complete Step-by-Step Instructions**

---

## ⏱️ **Total Time: 15-20 minutes**

---

## 📋 **STEP 1: Prepare Your Code (5 minutes)**

### 1.1 Initialize Git (if not already done)

```bash
cd /Users/adityajaif/car-dealership-backend

# Check if git is initialized
git status

# If not initialized, run:
git init
git add .
git commit -m "Production ready - all features implemented"
```

### 1.2 Create GitHub Repository

**Go to:** https://github.com/new

**Settings:**
- Repository name: `car-dealership-backend`
- Privacy: Private (recommended) or Public
- Don't initialize with README (you already have code)

**Copy the repository URL** (looks like: `https://github.com/YOUR_USERNAME/car-dealership-backend.git`)

### 1.3 Push Code to GitHub

```bash
# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/car-dealership-backend.git

# Push code
git branch -M main
git push -u origin main
```

✅ **Your code is now on GitHub!**

---

## 🌐 **STEP 2: Create Render Account (2 minutes)**

1. **Go to:** https://render.com/
2. **Click:** "Get Started for Free"
3. **Sign up with:** GitHub account (easiest)
4. **Authorize:** Render to access your GitHub repos

✅ **Account created!**

---

## 🗄️ **STEP 3: Create PostgreSQL Database (2 minutes)**

1. In Render Dashboard, click **"New +"**
2. Select **"PostgreSQL"**
3. **Settings:**
   - Name: `dealership-db`
   - Database: `dealership_db`
   - User: `dealership_user`
   - Region: **Singapore** (closest to you)
   - Plan: **Free**
4. Click **"Create Database"**
5. **Wait 30-60 seconds** for database to provision

✅ **Database created!**

**Copy these values** (you'll need them):
- Internal Database URL (starts with `postgresql://`)
- External Database URL (for local testing)

---

## 🖥️ **STEP 4: Create Web Service (3 minutes)**

1. In Render Dashboard, click **"New +"**
2. Select **"Web Service"**
3. **Connect Repository:**
   - Click "Connect account" if needed
   - Find: `car-dealership-backend`
   - Click **"Connect"**

4. **Configure Service:**
   ```
   Name: car-dealership-backend
   Region: Singapore
   Branch: main
   Root Directory: (leave empty)
   Environment: Node
   Build Command: npm install && npx prisma generate && npm run build
   Start Command: npx prisma migrate deploy && npm start
   Plan: Free
   ```

5. **Click "Create Web Service"** (DON'T deploy yet!)

---

## 🔐 **STEP 5: Add Environment Variables (5 minutes)**

In your web service, go to **"Environment"** tab:

### Add These Variables:

#### 5.1 Server Config
```
NODE_ENV=production
PORT=4000
```

#### 5.2 Database (Link to PostgreSQL)
```
DATABASE_URL
  → Click "Add from Database"
  → Select: dealership-db
  → Property: Internal Database URL
```

#### 5.3 Firebase Configuration

**Get your Firebase values by running:**
```bash
cat /Users/adityajaif/car-dealership-backend/.env | grep FIREBASE_
```

**Then add each one:**

**FIREBASE_PROJECT_ID:**
```
Key: FIREBASE_PROJECT_ID
Value: car-dealership-app-9f2d5
```

**FIREBASE_CLIENT_EMAIL:**
```
Key: FIREBASE_CLIENT_EMAIL
Value: firebase-adminsdk-fbsvc@car-dealership-app-9f2d5.iam.gserviceaccount.com
```

**FIREBASE_DATABASE_URL:**
```
Key: FIREBASE_DATABASE_URL
Value: https://car-dealership-app-9f2d5.firebaseio.com
```

**FIREBASE_PRIVATE_KEY:** (IMPORTANT!)
```
Key: FIREBASE_PRIVATE_KEY
Value: (copy ENTIRE private key from your .env including -----BEGIN and -----END lines)

CRITICAL: 
- Click "Add Environment Variable"
- Paste the COMPLETE multi-line key
- Render will handle the newlines automatically
- Do NOT modify the key format
```

### 5.4 Save
Click **"Save Changes"** at the top

---

## 🚀 **STEP 6: Deploy! (3 minutes)**

### Automatic Deployment Starts:

1. Render will automatically start building
2. **Watch the logs** (Logs tab)
3. Look for these messages:
   ```
   ✅ Installing dependencies...
   ✅ Generating Prisma client...
   ✅ Building TypeScript...
   ✅ Running migrations...
   ✅ Starting server...
   ```

4. **Deployment complete when you see:**
   ```
   🚀 Car Dealership Backend Server Started
   📡 Server running on port: 4000
   ```

### Get Your URL:

At the top of the page, you'll see your service URL:
```
https://car-dealership-backend-xxxx.onrender.com
```

**This is your production backend URL!**

---

## ✅ **STEP 7: Test Your Deployment (2 minutes)**

### Test Health Endpoint:
```bash
curl https://car-dealership-backend-xxxx.onrender.com/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "Backend running 🚀",
  "timestamp": "2025-10-10T...",
  "environment": "production",
  "version": "1.0.0"
}
```

✅ **If you see this, deployment successful!**

### Test Full API:
```bash
# This won't work without auth, but should return 401 (not error)
curl https://car-dealership-backend-xxxx.onrender.com/api/bookings
```

**Expected:**
```json
{
  "success": false,
  "message": "Firebase ID token required"
}
```

✅ **This is correct! Backend is working!**

---

## 🔄 **STEP 8: Update Your Frontends**

### React Dashboard:

**File:** `/Users/adityajaif/Desktop/automotiveDashboard/.env`

```env
# Change from:
VITE_API_BASE_URL=http://localhost:4000/api

# To:
VITE_API_BASE_URL=https://car-dealership-backend-xxxx.onrender.com/api
```

**Restart dev server:**
```bash
npm run dev
```

### Expo Mobile App:

**File:** `api/client.ts` (or wherever you have API_URL)

```typescript
// Change from:
const API_URL = 'http://10.69.245.247:4000/api';

// To:
const API_URL = 'https://car-dealership-backend-xxxx.onrender.com/api';
```

---

## 🎯 **Post-Deployment Tasks**

### 1. Update CORS with Your Frontend URLs

Once you deploy your React Dashboard (e.g., on Vercel/Netlify):

1. Go to Render Dashboard → Your Service
2. Go to Shell tab
3. Or update `src/app.ts` and push to GitHub (auto-redeploys)

Add your frontend URL to CORS allowed origins.

### 2. Run Backfill Scripts (One-time)

In Render Shell:
```bash
# Generate employee IDs for users
npx ts-node scripts/backfill-employee-ids.ts

# Update stock totals
npx ts-node scripts/backfill-total-stock.ts

# Seed sample data (models)
npx ts-node scripts/seed-sample-data.ts
```

### 3. Create Admin User

In Render Shell:
```bash
npx ts-node create-test-admin.ts
# Or use Postman to call: POST /api/auth/users/create-with-credentials
```

---

## 📊 **Render Free Tier Limits**

**What you get FREE:**
- ✅ 750 hours/month (enough for 1 service)
- ✅ 512 MB RAM
- ✅ Shared CPU
- ✅ PostgreSQL database (90 days, then $7/month)
- ✅ Automatic HTTPS
- ✅ Auto-deploy from GitHub

**Limitations:**
- ⚠️ Service sleeps after 15 min inactivity
- ⚠️ Takes ~30 seconds to wake up on first request
- ⚠️ Database limited to 1GB

**For production (always-on):**
- Upgrade to **Starter plan: $7/month**
- No sleep, instant responses
- Better for real users

---

## 🔍 **Troubleshooting**

### Build Fails?

**Check Render Logs for:**
```
❌ "Module not found" → npm install failed
   Solution: Check package.json is committed

❌ "Prisma error" → Database not connected
   Solution: Check DATABASE_URL is set

❌ "Firebase error" → Wrong Firebase config
   Solution: Verify FIREBASE_PRIVATE_KEY is complete
```

### Deployment Successful but API Returns 500?

**Check:**
1. Environment variables are set correctly
2. Database migrations ran: `npx prisma migrate deploy`
3. Prisma client generated: `npx prisma generate`

**Run in Render Shell:**
```bash
npx prisma migrate deploy
npx prisma generate
```

Then restart service.

---

## 🎉 **Success Checklist**

After deployment, you should have:

- ✅ Backend URL: `https://car-dealership-backend-xxxx.onrender.com`
- ✅ Health check working: `/api/health` returns 200
- ✅ Database connected and migrated
- ✅ Firebase authentication working
- ✅ All API endpoints accessible
- ✅ Frontend can connect to backend
- ✅ Users can login and use system

---

## 📱 **Next: Deploy Frontends**

### React Dashboard → Vercel (5 minutes)
```
1. Go to vercel.com
2. Import from GitHub
3. Set VITE_API_BASE_URL=https://your-backend.onrender.com/api
4. Deploy!
5. Get URL: https://your-dashboard.vercel.app
```

### Expo Mobile App → EAS Build
```
1. expo build:android/ios
2. Or publish to Expo Go
3. Update API_URL to production backend
```

---

## 🔄 **Auto-Deploy Setup**

**Good news:** Render auto-deploys when you push to GitHub!

```bash
# Make changes to code
git add .
git commit -m "Update feature X"
git push

# Render automatically:
# 1. Detects new commit
# 2. Rebuilds your app
# 3. Runs migrations
# 4. Deploys new version
# 5. No downtime!
```

---

## 💰 **Cost Breakdown**

### Free Option:
```
Backend: $0 (with sleep)
Database: $0 (90 days, then $7/month)
Redis: $0 (if using Render Redis)
Total: FREE for 90 days
```

### Paid Option (Recommended):
```
Backend: $7/month (always-on)
Database: $7/month (persistent)
Redis: $0 (free tier) or $10/month
Total: ~$14/month for professional setup
```

---

## 🎊 **You're Ready!**

**All files created:**
- ✅ `render.yaml` - Render configuration
- ✅ `ENVIRONMENT_VARIABLES_FOR_RENDER.md` - This guide
- ✅ Backend code ready
- ✅ Database schema ready
- ✅ Scripts ready

**Follow the steps above and you'll have your backend live in ~15 minutes!**

---

**Need help with any step? Just ask!** 🚀

