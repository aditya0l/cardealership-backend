# 🔐 Environment Variables for Render

**Copy these to Render's Environment Variables section**

---

## 📋 **Required Environment Variables**

### 1. Server Configuration
```
NODE_ENV=production
PORT=4000
```

### 2. Database (Auto-filled by Render)
```
DATABASE_URL=<Render provides this when you add PostgreSQL>
```

### 3. Firebase Admin SDK

**Get these from your current `.env` file:**

```bash
# Run this command to see your values:
cat /Users/adityajaif/car-dealership-backend/.env | grep FIREBASE
```

**Then add to Render:**

```
FIREBASE_PROJECT_ID=car-dealership-app-9f2d5

FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@car-dealership-app-9f2d5.iam.gserviceaccount.com

FIREBASE_DATABASE_URL=https://car-dealership-app-9f2d5.firebaseio.com

FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBg...
(copy entire private key from your .env file)
...your private key...
-----END PRIVATE KEY-----
```

### 4. Redis (Optional)
```
REDIS_URL=<Render provides this if you add Redis service>
```

---

## ⚠️ **IMPORTANT: FIREBASE_PRIVATE_KEY**

This key is multi-line. In Render:

1. Click "Add Environment Variable"
2. Key: `FIREBASE_PRIVATE_KEY`
3. Value: Copy ENTIRE key including:
   ```
   -----BEGIN PRIVATE KEY-----
   all the lines in between
   -----END PRIVATE KEY-----
   ```
4. Make sure to preserve the line breaks!

**Render handles multi-line values automatically.**

---

## 📝 **How to Add in Render:**

### After creating Web Service:

1. Go to **Environment** tab
2. Click **"Add Environment Variable"**
3. Add each variable one by one
4. For `DATABASE_URL`: Select **"Add from Database"** → Choose your PostgreSQL database
5. Save
6. Render will auto-redeploy

---

## ✅ **Quick Checklist:**

Before deploying, ensure you have:
- [ ] `NODE_ENV=production`
- [ ] `PORT=4000`
- [ ] `DATABASE_URL` (from Render database)
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_PRIVATE_KEY` (full multi-line key)
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_DATABASE_URL`

---

## 🆘 **If You Need Your Firebase Values:**

Run this in terminal:
```bash
cd /Users/adityajaif/car-dealership-backend
cat .env | grep FIREBASE_
```

Copy each value to Render!

---

**Next: I'll create the complete deployment guide!** 📖

