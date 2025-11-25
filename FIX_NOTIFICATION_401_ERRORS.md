# 🔧 Fix Notification 401 Errors in Expo App

**Date:** January 2025  
**Issue:** Notification endpoints return 401 because they're called before authentication

---

## 🐛 Problem

The app calls notification endpoints (`/api/notifications/stats` and `/api/notifications/history`) on startup **before** the user is authenticated. This causes:
- ❌ 401 errors on app load
- ❌ "Firebase ID token required" errors
- ❌ Poor user experience

---

## ✅ Solution

Wait for authentication before fetching notifications. Only call notification endpoints **after** the user is logged in and has a valid token.

---

## 🔧 Frontend Fix (Expo App)

### Option 1: Check Auth Before Fetching (Recommended)

**File:** `src/services/notification.service.ts` or wherever notifications are fetched

**Current Code (Problematic):**
```typescript
// ❌ BAD: Fetches immediately on app load
useEffect(() => {
  fetchNotifications();
  fetchNotificationStats();
}, []);
```

**Fixed Code:**
```typescript
// ✅ GOOD: Only fetch after authentication
useEffect(() => {
  // Wait for user to be authenticated
  if (!user || !firebaseToken) {
    return; // Don't fetch if not authenticated
  }
  
  fetchNotifications();
  fetchNotificationStats();
}, [user, firebaseToken]); // Only run when user/token changes
```

---

### Option 2: Add Auth Guard in Service

**File:** `src/services/notification.service.ts`

**Add this check:**
```typescript
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function ensureAuthenticated(): Promise<boolean> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      // Check AsyncStorage for stored token
      const token = await AsyncStorage.getItem('firebaseToken');
      if (!token) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

export const fetchNotifications = async () => {
  // ✅ Check auth first
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    console.log('⏭️  Skipping notification fetch - not authenticated');
    return { data: [], total: 0 };
  }

  // Rest of your fetch logic...
  const response = await api.get('/notifications/history', {
    params: { page: 1, limit: 50 }
  });
  
  return response.data;
};

export const fetchNotificationStats = async () => {
  // ✅ Check auth first
  const isAuthenticated = await ensureAuthenticated();
  if (!isAuthenticated) {
    console.log('⏭️  Skipping stats fetch - not authenticated');
    return null;
  }

  // Rest of your fetch logic...
  const response = await api.get('/notifications/stats');
  return response.data;
};
```

---

### Option 3: Use Auth Context/Hook

**File:** `src/screens/NotificationsScreen.tsx` or wherever notifications are loaded

**Implementation:**
```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Your auth context

const NotificationsScreen = () => {
  const { user, isAuthenticated, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ✅ Only fetch when authenticated
    if (!isAuthenticated || !user || !token) {
      console.log('⏭️  Waiting for authentication...');
      return;
    }

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const [notificationsData, statsData] = await Promise.all([
          fetchNotifications(),
          fetchNotificationStats()
        ]);
        
        setNotifications(notificationsData.data || []);
        setStats(statsData.data || null);
      } catch (error: any) {
        // ✅ Handle 401 gracefully
        if (error.response?.status === 401) {
          console.log('⚠️  Not authenticated, waiting for login...');
          // Don't show error - just wait for auth
        } else {
          console.error('Error loading notifications:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [isAuthenticated, user, token]); // Re-fetch when auth state changes

  // ... rest of component
};
```

---

### Option 4: Improve API Interceptor (Global Fix)

**File:** `src/api/client.ts` or `src/services/api.ts`

**Update your axios interceptor:**
```typescript
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://10.48.9.247:4000/api',
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // ✅ Skip auth check for public endpoints
    const publicEndpoints = ['/auth/login', '/auth/sync', '/health'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );

    if (isPublicEndpoint) {
      return config;
    }

    // ✅ Check if user is authenticated before making request
    const auth = getAuth();
    const firebaseUser = auth.currentUser;
    
    if (!firebaseUser) {
      // Try to get token from storage
      const token = await AsyncStorage.getItem('firebaseToken');
      if (!token) {
        // ✅ Cancel request if not authenticated (except public endpoints)
        console.log('⚠️  Skipping request - not authenticated:', config.url);
        return Promise.reject(new Error('Not authenticated'));
      }
    }

    // Get token and add to headers (your existing logic)
    const token = firebaseUser 
      ? await firebaseUser.getIdToken()
      : await AsyncStorage.getItem('firebaseToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 gracefully
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // ✅ Handle 401 gracefully
    if (error.response?.status === 401) {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        // Not logged in - this is expected
        console.log('⚠️  401 - User not authenticated');
        // Don't show error - just return empty/null
        return Promise.resolve({
          data: { success: false, message: 'Not authenticated' },
          status: 401
        });
      }
      
      // Token expired - try to refresh
      try {
        const newToken = await user.getIdToken(true); // Force refresh
        // Retry the request with new token
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed - clear auth
        console.log('⚠️  Token refresh failed');
        return Promise.resolve({
          data: { success: false, message: 'Session expired' },
          status: 401
        });
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

## 📋 Quick Fix Checklist

Choose one of these approaches:

- [ ] **Option 1:** Add auth check in `useEffect` dependencies
- [ ] **Option 2:** Add `ensureAuthenticated()` guard in service
- [ ] **Option 3:** Use auth context/hook before fetching
- [ ] **Option 4:** Improve API interceptor (recommended - fixes all endpoints)

---

## 🎯 Recommended Approach

**Option 4 (API Interceptor)** is the best because it:
- ✅ Fixes all endpoints at once
- ✅ Prevents unnecessary API calls
- ✅ Handles 401s gracefully globally
- ✅ Reduces code duplication

---

## 🧪 Testing

After implementing the fix:

1. **Restart the app**
2. **Check logs** - Should see:
   ```
   ⏭️  Skipping request - not authenticated: /notifications/stats
   ⚠️  Waiting for authentication...
   ```
3. **Login** - Notifications should load automatically after login
4. **No more 401 errors** on app startup

---

## 📝 Example: Complete Service with Auth Guard

```typescript
// src/services/notification.service.ts
import api from '../api/client';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function isAuthenticated(): Promise<boolean> {
  try {
    const auth = getAuth();
    if (auth.currentUser) return true;
    
    const token = await AsyncStorage.getItem('firebaseToken');
    return !!token;
  } catch {
    return false;
  }
}

export const fetchNotifications = async (page = 1, limit = 50) => {
  if (!await isAuthenticated()) {
    console.log('⏭️  Skipping notifications - not authenticated');
    return { data: { notifications: [], total: 0 }, success: true };
  }

  try {
    const response = await api.get('/notifications/history', {
      params: { page, limit }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('⚠️  401 - User not authenticated');
      return { data: { notifications: [], total: 0 }, success: true };
    }
    throw error;
  }
};

export const fetchNotificationStats = async () => {
  if (!await isAuthenticated()) {
    console.log('⏭️  Skipping stats - not authenticated');
    return { data: { total: 0, unread: 0 }, success: true };
  }

  try {
    const response = await api.get('/notifications/stats');
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('⚠️  401 - User not authenticated');
      return { data: { total: 0, unread: 0 }, success: true };
    }
    throw error;
  }
};
```

---

## ✅ Expected Behavior After Fix

1. **App Startup:**
   - ✅ No notification API calls until authenticated
   - ✅ No 401 errors in logs
   - ✅ Clean startup experience

2. **After Login:**
   - ✅ Notifications load automatically
   - ✅ Stats load automatically
   - ✅ Everything works smoothly

3. **Token Expiry:**
   - ✅ Graceful handling
   - ✅ Auto-retry with refresh
   - ✅ No error popups

---

**Last Updated:** January 2025

