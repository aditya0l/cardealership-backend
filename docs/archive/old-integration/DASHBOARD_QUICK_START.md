# 🚀 DASHBOARD QUICK START - Configuration Values

Quick reference for configuring your React Dashboard to work with the backend.

---

## ⚡ Quick Configuration

### **1. API Base URL** (in your dashboard `.env` file)

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

**For production:**
```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
```

---

### **2. Firebase Configuration** (in `src/config/firebase.ts`)

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyCY3Iw35gcZhVrG3ZUH2B3I2LHoVBwkALE",
  authDomain: "car-dealership-app-9f2d5.firebaseapp.com",
  projectId: "car-dealership-app-9f2d5",
  storageBucket: "car-dealership-app-9f2d5.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // Get from Firebase Console
  appId: "YOUR_APP_ID",                            // Get from Firebase Console
};
```

**To get missing values:**
1. Go to: https://console.firebase.google.com/
2. Project: **car-dealership-app-9f2d5**
3. Settings ⚙️ → Project settings
4. Scroll to "Your apps" → Web app
5. Copy `messagingSenderId` and `appId`

---

### **3. Test Credentials**

```
Email: admin@test.com
Password: testpassword123
Role: ADMIN
```

**Other test users:**
- `advisor@test.com` / `testpassword123` - CUSTOMER_ADVISOR
- `gm@test.com` / `testpassword123` - GENERAL_MANAGER

---

## 📁 Files You Need to Create

1. ✅ `src/api/client.ts` - API client with axios
2. ✅ `src/config/firebase.ts` - Firebase configuration
3. ✅ `src/services/auth.service.ts` - Authentication service
4. ✅ `src/contexts/AuthContext.tsx` - React context for auth
5. ✅ `.env` - Environment variables

---

## 🔗 Key Differences from Expo

| Feature | Expo App | Dashboard |
|---------|----------|-----------|
| **API URL** | `http://YOUR_IP:4000/api` | `http://localhost:4000/api` |
| **Storage** | AsyncStorage | localStorage |
| **Platform** | Mobile | Web Browser |
| **Navigation** | React Navigation | React Router |

---

## ✅ Complete Guide

For the complete implementation guide with all code, see:
📄 **`DASHBOARD_COMPLETE_CONFIG.md`**

That file has:
- Full API client code
- Complete auth service
- Auth context implementation
- Login component example
- All the code you need!

---

## 🎯 Quick Checklist

- [ ] Install packages: `npm install axios firebase`
- [ ] Create `.env` with `VITE_API_BASE_URL=http://localhost:4000/api`
- [ ] Create `src/config/firebase.ts` with Firebase config
- [ ] Create `src/api/client.ts` (see complete guide)
- [ ] Create `src/services/auth.service.ts` (see complete guide)
- [ ] Create `src/contexts/AuthContext.tsx` (see complete guide)
- [ ] Wrap your app with `<AuthProvider>`
- [ ] Test login with `admin@test.com` / `testpassword123`

---

## 🚀 That's It!

Follow the complete guide in `DASHBOARD_COMPLETE_CONFIG.md` for all the code!

