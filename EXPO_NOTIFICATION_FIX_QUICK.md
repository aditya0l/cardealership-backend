# 🚀 Quick Fix: Notification 401 Errors

**Problem:** App calls notification endpoints before login → 401 errors

**Solution:** Add auth check before fetching notifications

---

## ⚡ Quick Fix (5 minutes)

### Step 1: Find where notifications are fetched

**File:** `src/screens/NotificationsScreen.tsx` or `src/services/notification.service.ts`

### Step 2: Add auth check

**Replace this:**
```typescript
useEffect(() => {
  fetchNotifications();
  fetchNotificationStats();
}, []);
```

**With this:**
```typescript
useEffect(() => {
  // ✅ Wait for authentication
  if (!user || !isAuthenticated) {
    return; // Don't fetch if not logged in
  }
  
  fetchNotifications();
  fetchNotificationStats();
}, [user, isAuthenticated]); // Only fetch when authenticated
```

---

## 🔧 Alternative: Global API Interceptor Fix

**File:** `src/api/client.ts`

**Add this to your axios interceptor:**

```typescript
// In request interceptor
api.interceptors.request.use(async (config) => {
  // Skip auth check for login endpoints
  if (config.url?.includes('/auth/login')) {
    return config;
  }

  // ✅ Check if authenticated
  const auth = getAuth();
  if (!auth.currentUser) {
    const token = await AsyncStorage.getItem('firebaseToken');
    if (!token) {
      console.log('⏭️  Skipping request - not authenticated');
      return Promise.reject(new Error('Not authenticated'));
    }
  }
  
  // Your existing token logic...
  return config;
});
```

---

## ✅ Result

- ✅ No more 401 errors on startup
- ✅ Notifications load after login
- ✅ Clean app experience

**See full guide:** `FIX_NOTIFICATION_401_ERRORS.md`

