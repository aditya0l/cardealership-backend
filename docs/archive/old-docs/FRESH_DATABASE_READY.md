# ✅ FRESH DATABASE READY - LOGIN CREDENTIALS

## 🎉 Database Cleared and Fresh Users Created!

**Date:** November 22, 2025  
**Status:** ✅ All users created successfully in both Firebase and Database

---

## 🔐 LOGIN CREDENTIALS

### **📱 For Expo Mobile App (Customer Advisor):**

```
Email: advisor@test.com
Password: testpassword123
Role: CUSTOMER_ADVISOR
Employee ID: ADV001
```

### **💻 For Web Admin Dashboard:**

```
Email: admin@test.com
Password: testpassword123
Role: ADMIN
Employee ID: ADM001
```

### **👔 For Testing (General Manager):**

```
Email: gm@test.com
Password: testpassword123
Role: GENERAL_MANAGER
Employee ID: GM001
```

### **📊 For Testing (Sales Manager):**

```
Email: sm@test.com
Password: testpassword123
Role: SALES_MANAGER
Employee ID: SM001
```

### **👥 For Testing (Team Lead):**

```
Email: tl@test.com
Password: testpassword123
Role: TEAM_LEAD
Employee ID: TL001
```

---

## ✅ What Was Done

1. **Database Cleared**
   - ✅ All data deleted from all tables
   - ✅ Schema preserved (all tables intact)

2. **Roles Created**
   - ✅ ADMIN
   - ✅ GENERAL_MANAGER
   - ✅ SALES_MANAGER
   - ✅ TEAM_LEAD
   - ✅ CUSTOMER_ADVISOR

3. **Default Dealership Created**
   - ✅ Name: Default Dealership
   - ✅ Code: DEFAULT
   - ✅ Type: TATA
   - ✅ All users assigned to this dealership

4. **Users Created**
   - ✅ Created in Firebase Authentication with password: `testpassword123`
   - ✅ Created in Database with all required fields
   - ✅ Custom claims set in Firebase (role, roleId, employeeId)
   - ✅ All users linked to default dealership

---

## 🚀 How to Login

### In Expo App:
1. Enter email: `advisor@test.com`
2. Enter password: `testpassword123`
3. Click Login

### In Admin Dashboard:
1. Enter email: `admin@test.com`
2. Enter password: `testpassword123`
3. Click Login

---

## 🔧 If Login Still Fails

If you still get "invalid credentials" error, check:

1. **Firebase Config in Expo App:**
   - ✅ `apiKey` - Must be correct
   - ✅ `authDomain` - Must be `car-dealership-app-9f2d5.firebaseapp.com`
   - ✅ `projectId` - Must be `car-dealership-app-9f2d5`
   - ✅ `storageBucket` - Get from Firebase Console
   - ✅ `messagingSenderId` - Get from Firebase Console
   - ✅ `appId` - Get from Firebase Console

2. **Backend is Running:**
   - ✅ Check if backend server is running on port 4000
   - ✅ Test: `curl http://localhost:4000/api/health`

3. **Network Connection:**
   - ✅ Expo app can reach backend
   - ✅ Check if using correct IP address (not `localhost` for mobile)

---

## 📝 Quick Reference

All users have the **same password**: `testpassword123`

**Recommended for testing:**
- Customer Advisor: `advisor@test.com`
- Admin: `admin@test.com`

---

## 🎯 Next Steps

1. Try logging in with `advisor@test.com` / `testpassword123`
2. If it works, you're all set! ✅
3. If it doesn't, check Firebase config in your Expo app

---

**Script Used:** `scripts/clear-and-seed-database.ts`  
**To run again:** `npx ts-node scripts/clear-and-seed-database.ts`

