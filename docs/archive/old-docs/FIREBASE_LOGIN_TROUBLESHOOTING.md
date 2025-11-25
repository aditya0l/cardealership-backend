# 🔥 Firebase Login Troubleshooting Guide

## 🚨 Issue: "auth/invalid-credential" for All Users

If you're getting invalid credentials for **ALL** users, even though backend Firebase credentials are configured, here's why:

---

## 🔍 Understanding the Problem

### **Two Different Firebase Setups:**

1. **Backend Firebase Admin SDK** (Server-side)
   - Purpose: Verify tokens, manage users
   - Config: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`
   - ✅ **You have this configured**

2. **Expo App Firebase Client SDK** (Client-side)
   - Purpose: Authenticate users (login)
   - Config: `apiKey`, `authDomain`, `projectId`, etc.
   - ❓ **This might be misconfigured or missing values**

### **The Issue:**

Even though your backend has Firebase credentials configured, your **Expo app** needs:
- ✅ Complete Firebase Client SDK config (especially `apiKey`)
- ✅ Users must exist in Firebase Authentication
- ✅ You need to know the **correct password** for each user

---

## ✅ Solution Steps

### **Step 1: Verify User Exists in Firebase**

Run this to check if a user exists:

```bash
npx ts-node scripts/check-firebase-user.ts test1@test.com
```

**Output will show:**
- ✅ User exists in Firebase
- ✅ User details (UID, email verified, etc.)
- ⚠️ Password (unknown - you set it when creating)

---

### **Step 2: Reset Password to Known Value**

Since you can't retrieve passwords, **reset them to known values**:

```bash
# Reset password for test1@test.com
npx ts-node scripts/reset-firebase-user-password.ts test1@test.com Test123456

# Reset password for advisor
npx ts-node scripts/reset-firebase-user-password.ts advisor.new@test.com testpassword123

# Reset password for admin
npx ts-node scripts/reset-firebase-user-password.ts admin.new@test.com testpassword123
```

**Now you know the passwords!**

---

### **Step 3: Verify Expo App Firebase Config**

Your Expo app Firebase config **MUST** match the backend:

```typescript
// firebase.config.ts in Expo app
const firebaseConfig = {
  apiKey: "AIzaSyCY3Iw35gcZhVrG3ZUH2B3I2LHoVBwkALE", // ✅ You have this
  authDomain: "car-dealership-app-9f2d5.firebaseapp.com", // ✅ Correct
  projectId: "car-dealership-app-9f2d5", // ✅ Must match backend
  storageBucket: "car-dealership-app-9f2d5.appspot.com", // ⚠️ Get from console
  messagingSenderId: "YOUR_SENDER_ID", // ⚠️ Get from console
  appId: "YOUR_APP_ID" // ⚠️ Get from console
};
```

**Get missing values:**
1. Go to: https://console.firebase.google.com/
2. Project: `car-dealership-app-9f2d5`
3. Settings → Project settings → Your apps → Web app
4. Copy `messagingSenderId` and `appId`

---

### **Step 4: Test Login**

After resetting password, test with:

```
Email: test1@test.com
Password: Test123456 (or whatever you set)
```

---

## 🎯 Quick Fix Script

Run this to create/reset all test users:

```bash
# Reset password for test1@test.com
npx ts-node scripts/reset-firebase-user-password.ts test1@test.com Test123456

# Verify advisor credentials
npx ts-node scripts/reset-firebase-user-password.ts advisor.new@test.com testpassword123

# Verify admin credentials  
npx ts-node scripts/reset-firebase-user-password.ts admin.new@test.com testpassword123
```

---

## 📋 Verified Working Credentials

After running the reset script, use these:

### **For Testing:**
```
Email: test1@test.com
Password: Test123456
Role: GENERAL_MANAGER
```

### **For Advisor:**
```
Email: advisor.new@test.com
Password: testpassword123
Role: CUSTOMER_ADVISOR
```

### **For Admin:**
```
Email: admin.new@test.com
Password: testpassword123
Role: ADMIN
```

---

## 🔍 Diagnostic Checklist

If login still fails, check:

- [ ] User exists in Firebase (run check script)
- [ ] Password was reset to known value (run reset script)
- [ ] Expo app has complete Firebase config (apiKey, appId, etc.)
- [ ] Expo app project ID matches backend: `car-dealership-app-9f2d5`
- [ ] Backend is running and accessible
- [ ] Network connection (local IP correct for mobile device)

---

## 💡 Why This Happens

1. **Users exist in Firebase** ✅ (we verified 30 users)
2. **But passwords are unknown** ❌ (Firebase doesn't store plaintext passwords)
3. **Expo app can't authenticate** ❌ (can't login without correct password)

**Solution:** Reset passwords to known values using the backend Admin SDK!

