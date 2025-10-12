# 🚨 DASHBOARD LOGIN FIX - COMPLETE GUIDE

## 🔍 **PROBLEM IDENTIFIED**

```javascript
localStorage.getItem('user') === null  // ❌ User data is NOT being saved!
```

**What's Happening:**
1. ✅ Firebase authentication succeeds (`admin.new@test.com` detected)
2. ❌ Backend API call to get user details **FAILS**
3. ❌ localStorage is never populated
4. ❌ AuthContext times out and logs you out

**Console shows:**
```
⏰ [AUTH INIT] Auth state check timeout - forcing loading to false
```

---

## 🎯 **ROOT CAUSE**

The dashboard's `AuthContext.tsx` is:
1. Detecting Firebase auth state change
2. Trying to fetch user details from backend (`GET /api/auth/profile`)
3. **The API call is FAILING** (401, 404, or network error)
4. Timeout triggers and logs you out

---

## 🔧 **FIXES NEEDED IN DASHBOARD**

### **Fix 1: Check Network Tab for Failed API Calls**

After clicking "Login as Admin":
1. Open DevTools → **Network** tab
2. Look for **RED/failed** requests to:
   - `/api/auth/profile`
   - `/api/auth/login`
   - `/api/auth/me`

**If you see 401 Unauthorized:**
- The Firebase token is invalid or not being sent
- Check the Authorization header

**If you see 404 Not Found:**
- The endpoint URL is wrong
- Check the `baseURL` in your axios config

---

### **Fix 2: Update AuthContext.tsx**

Find the file: `/Users/adityajaif/Desktop/automotiveDashboard/src/contexts/AuthContext.tsx`

**Look for this pattern around line 46-90:**

```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
    if (firebaseUser) {
      // Try to get user from backend
      try {
        const idToken = await firebaseUser.getIdToken();
        const response = await axios.get('/api/auth/profile', {  // ← This is failing!
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        const userData = response.data.user;  // ← Never reaches here
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to fetch user profile:', error);  // ← Check console!
        await firebaseAuth.signOut();  // ← This is why you're being logged out
      }
    }
  });
}, []);
```

---

### **Fix 3: Add Better Error Handling**

**Replace the try/catch block with this:**

```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
    console.log('🔐 [AUTH] Firebase user:', firebaseUser?.email);
    
    if (firebaseUser) {
      try {
        // Get fresh ID token
        const idToken = await firebaseUser.getIdToken(true);  // ← Force refresh
        console.log('🎫 [AUTH] Got ID token:', idToken.substring(0, 20) + '...');
        
        // Get user details from backend
        console.log('📡 [AUTH] Calling /api/auth/profile...');
        const response = await axios.get('/api/auth/profile', {
          headers: { 
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ [AUTH] Backend response:', response.data);
        
        const userData = {
          email: response.data.user.email,
          name: response.data.user.name,
          firebaseUid: response.data.user.firebaseUid,
          role: response.data.user.role.name,  // ← Extract role.name correctly
        };
        
        console.log('💾 [AUTH] Saving user to localStorage:', userData);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
      } catch (error: any) {
        console.error('❌ [AUTH] Error:', error);
        console.error('❌ [AUTH] Error response:', error.response?.data);
        console.error('❌ [AUTH] Error status:', error.response?.status);
        
        // Don't log out immediately - give user a chance
        alert(`Authentication failed: ${error.response?.data?.message || error.message}`);
      }
    } else {
      console.log('🚪 [AUTH] No Firebase user - clearing localStorage');
      setUser(null);
      localStorage.removeItem('user');
    }
    
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

---

### **Fix 4: Check API Base URL**

Find: `/Users/adityajaif/Desktop/automotiveDashboard/src/services/api.ts` or `axios.ts`

**Make sure baseURL is correct:**

```typescript
// BAD:
const api = axios.create({
  baseURL: 'http://localhost:4000/api'  // ❌ Wrong for deployed backend!
});

// GOOD:
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://automotive-backend-frqe.onrender.com/api'
});
```

**Check `.env` file:**
```bash
VITE_API_BASE_URL=https://automotive-backend-frqe.onrender.com/api
```

---

### **Fix 5: Demo Login Buttons**

Find: `/Users/adityajaif/Desktop/automotiveDashboard/src/pages/LoginPage.tsx`

**Make sure demo buttons don't bypass the API:**

```typescript
// BAD:
const loginAsAdmin = () => {
  setUser({
    email: 'admin.new@test.com',
    role: 'CUSTOMER_ADVISOR'  // ❌ Hardcoded!
  });
};

// GOOD:
const loginAsAdmin = async () => {
  setLoading(true);
  try {
    // Use Firebase signInWithEmailAndPassword
    await signInWithEmailAndPassword(firebaseAuth, 'admin.new@test.com', 'testpassword123');
    // Let the AuthContext handle the rest
  } catch (error) {
    console.error('Login failed:', error);
    alert('Login failed: ' + error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 📋 **STEP-BY-STEP FIX PROCEDURE**

### **Step 1: Check What's Failing**

1. Open dashboard in incognito
2. Open DevTools (F12)
3. Go to **Console** tab (keep it open)
4. Go to **Network** tab (keep it open)
5. Click "Login as Admin"
6. **Watch both tabs**

**Look for:**
- ❌ Red/failed requests in Network tab
- ❌ Error logs in Console tab

**Share with me:**
- Screenshot of failed request (if any)
- Console error messages

---

### **Step 2: Test Backend Directly**

Open a new browser tab and test:

```javascript
// 1. Get Firebase ID token
// In dashboard console after Firebase login:
firebase.auth().currentUser.getIdToken().then(token => {
  console.log('Token:', token);
  
  // 2. Test backend profile endpoint
  fetch('https://automotive-backend-frqe.onrender.com/api/auth/profile', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
  .then(r => r.json())
  .then(data => console.log('Profile response:', data))
  .catch(err => console.error('Profile error:', err));
});
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "email": "admin.new@test.com",
      "name": "Test Admin",
      "firebaseUid": "p9BTaIFDPgSlYLavxN6VZEEQme23",
      "role": {
        "id": "...",
        "name": "ADMIN"  // ← Should be ADMIN!
      }
    }
  }
}
```

---

### **Step 3: Apply Quick Fix**

If the backend works but frontend doesn't save the data, add this **temporary workaround** in `AuthContext.tsx`:

```typescript
// After Firebase auth succeeds, manually call the backend
useEffect(() => {
  const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const idToken = await firebaseUser.getIdToken(true);
        
        // TEMPORARY: Use test-user bypass if token fails
        const response = await axios.get('/api/auth/profile', {
          headers: { 
            Authorization: `Bearer test-user`  // ← Temporary bypass
          }
        }).catch(async () => {
          // If test-user fails, try with real token
          return await axios.get('/api/auth/profile', {
            headers: { Authorization: `Bearer ${idToken}` }
          });
        });
        
        const userData = {
          email: response.data.user.email,
          name: response.data.user.name,
          firebaseUid: response.data.user.firebaseUid,
          role: response.data.user.role.name
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
      } catch (error) {
        console.error('Auth error:', error);
      }
    }
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

---

## 🚀 **QUICKEST TEST**

**Add this to AuthContext.tsx temporarily:**

After the Firebase auth succeeds, add:

```typescript
if (firebaseUser) {
  // TEMPORARY HARDCODED FIX FOR TESTING
  const tempUser = {
    email: firebaseUser.email,
    name: firebaseUser.displayName || 'Test Admin',
    firebaseUid: firebaseUser.uid,
    role: 'ADMIN'  // ← Hardcode for now
  };
  setUser(tempUser);
  localStorage.setItem('user', JSON.stringify(tempUser));
  setLoading(false);
  return;
}
```

**This will:**
1. ✅ Save user to localStorage
2. ✅ Show ADMIN role
3. ✅ Let you access the dashboard

**Then we can debug the backend API call separately.**

---

## 📞 **NEXT STEP**

**Run this in the dashboard console after "logging in":**

```javascript
// Check if Firebase user exists
console.log('Firebase user:', firebase.auth().currentUser?.email);

// Check if token is valid
firebase.auth().currentUser?.getIdToken().then(token => {
  console.log('Token (first 50 chars):', token.substring(0, 50));
  
  // Test backend
  fetch('https://automotive-backend-frqe.onrender.com/api/auth/profile', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(r => r.json())
  .then(d => console.log('✅ Backend response:', d))
  .catch(e => console.error('❌ Backend error:', e));
});
```

**Share the output!** 🎯

