# 🔧 FIX: Dashboard Timeout & Backend Unavailable Errors

## 🚨 Problem

Your dashboard is getting these errors:
- `timeout of 60000ms exceeded`
- `Backend server is unavailable or starting up`

**Root Cause:** The API client timeout is too long (60s) and there's no proper error handling for network issues.

---

## ✅ Solution: Update Your Dashboard Files

### **Fix 1: Update API Client (`src/api/client.ts`)**

Replace your API client with this improved version:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';

// Backend API Base URL
// IMPORTANT: Make sure this matches your backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

console.log('🔗 API Base URL:', API_BASE_URL); // Debug log

class ApiClient {
  private client: AxiosInstance;
  private currentUser: User | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000, // Reduced from 60000 to 10 seconds - faster failure
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup auth state listener
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });

    // Add request interceptor to attach auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (this.currentUser) {
          try {
            // Get fresh token with timeout protection
            const tokenPromise = this.currentUser.getIdToken(true);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Token refresh timeout')), 5000)
            );
            
            const token = await Promise.race([tokenPromise, timeoutPromise]) as string;
            config.headers.Authorization = `Bearer ${token}`;
          } catch (error) {
            console.error('❌ Error getting auth token:', error);
            // Don't block request, continue without token (backend will return 401)
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Handle timeout errors
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.error('⏱️ Request timeout - Backend may be unavailable');
          throw new Error('Backend server is unavailable or starting up. Please try again in a moment.');
        }

        // Handle network errors
        if (!error.response && error.request) {
          console.error('🌐 Network error - Cannot reach backend');
          throw new Error('Cannot connect to backend server. Please check if the server is running on ' + API_BASE_URL);
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          console.error('🔒 Unauthorized - Logging out');
          const auth = getAuth();
          await signOut(auth);
          window.location.href = '/login';
        }

        // Re-throw other errors
        return Promise.reject(error);
      }
    );
  }

  // Helper method to get fresh token with timeout
  async getAuthToken(): Promise<string | null> {
    if (!this.currentUser) return null;
    
    try {
      const tokenPromise = this.currentUser.getIdToken(true);
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Token timeout')), 5000)
      );
      
      return await Promise.race([tokenPromise, timeoutPromise]);
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  }

  // Test backend connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Public methods
  get = <T = any>(url: string, config?: any) => this.client.get<T>(url, config);
  post = <T = any>(url: string, data?: any, config?: any) => 
    this.client.post<T>(url, data, config);
  put = <T = any>(url: string, data?: any, config?: any) => 
    this.client.put<T>(url, data, config);
  patch = <T = any>(url: string, data?: any, config?: any) => 
    this.client.patch<T>(url, data, config);
  delete = <T = any>(url: string, config?: any) => 
    this.client.delete<T>(url, config);
}

export default new ApiClient();
```

---

### **Fix 2: Update Auth Service (`src/services/auth.service.ts`)**

Update your auth service with better error handling:

```typescript
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import apiClient from '../api/client';

export interface UserProfile {
  firebaseUid: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: 'ADMIN' | 'GENERAL_MANAGER' | 'SALES_MANAGER' | 'TEAM_LEAD' | 'CUSTOMER_ADVISOR';
  };
  dealership?: {
    id: string;
    name: string;
    code: string;
  };
  dealershipId?: string;
  isActive: boolean;
  employeeId?: string;
  createdAt: string;
  updatedAt: string;
}

export const authService = {
  // Login with email and password
  async login(email: string, password: string) {
    try {
      console.log('🔐 Starting login...');
      
      // Step 1: Test backend connection first
      const isBackendAvailable = await apiClient.testConnection();
      if (!isBackendAvailable) {
        throw new Error('Backend server is unavailable. Please make sure the backend is running on http://localhost:4000');
      }

      // Step 2: Authenticate with Firebase
      console.log('🔥 Authenticating with Firebase...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Step 3: Get Firebase ID token (with timeout)
      console.log('🎫 Getting Firebase token...');
      const tokenPromise = userCredential.user.getIdToken(true);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Token fetch timeout')), 5000)
      );
      const token = await Promise.race([tokenPromise, timeoutPromise]) as string;
      
      // Step 4: Sync user to backend database
      console.log('🔄 Syncing user to backend...');
      try {
        await apiClient.post(
          '/auth/sync',
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 5000, // 5 second timeout for sync
          }
        );
      } catch (syncError: any) {
        // Warn but don't fail - sync is optional if user already exists
        if (syncError.response?.status !== 409) { // 409 = user already exists
          console.warn('⚠️ User sync failed (backend may be starting up):', syncError.message);
        }
      }
      
      // Step 5: Get user profile from backend
      console.log('👤 Fetching user profile...');
      const profileResponse = await apiClient.get<{
        success: boolean;
        data: { user: UserProfile };
      }>('/auth/me', {
        timeout: 5000, // 5 second timeout
      });
      
      console.log('✅ Login successful!');
      return {
        firebaseUser: userCredential.user,
        profile: profileResponse.data.data.user,
      };
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Provide helpful error messages
      if (error.message.includes('timeout')) {
        throw new Error('Backend server is unavailable or slow. Please check if the server is running on http://localhost:4000');
      }
      if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Cannot connect to backend server. Please make sure the backend is running.');
      }
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid email or password. Please try again.');
      }
      
      throw error;
    }
  },

  // Get current user profile from backend
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { user: UserProfile };
      }>('/auth/me', {
        timeout: 5000, // 5 second timeout
      });
      return response.data.data.user;
    } catch (error: any) {
      if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
        throw new Error('Backend server is unavailable or starting up. Please try again in a moment.');
      }
      if (!error.response && error.request) {
        throw new Error('Cannot connect to backend server. Please check if the server is running.');
      }
      throw error;
    }
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  },

  // Get current Firebase user
  getCurrentUser() {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: any) => void) {
    return onAuthStateChanged(auth, callback);
  },
};
```

---

### **Fix 3: Update Auth Context (`src/contexts/AuthContext.tsx`)**

Update to handle errors gracefully:

```typescript
// In loadProfile function, update the error handling:

const loadProfile = async (firebaseUser: User) => {
  try {
    const userProfile = await authService.getProfile();
    setProfile(userProfile);
    localStorage.setItem('user', JSON.stringify(userProfile));
  } catch (error: any) {
    console.error('❌ Error loading profile:', error);
    
    // Don't clear profile if it's just a network error
    if (error.message.includes('unavailable') || error.message.includes('Cannot connect')) {
      // Keep existing profile in localStorage if available
      const storedProfile = localStorage.getItem('user');
      if (storedProfile) {
        try {
          setProfile(JSON.parse(storedProfile));
          return; // Use stored profile, don't throw error
        } catch (e) {
          // Invalid stored data, continue to clear
        }
      }
    }
    
    // Clear profile only if it's an auth error (401, 403)
    if (error.response?.status === 401 || error.response?.status === 403) {
      setProfile(null);
      localStorage.removeItem('user');
    }
  }
};
```

---

## 🔍 Check Your Configuration

### **1. Verify Backend is Running**

Open terminal and run:
```bash
curl http://localhost:4000/api/health
```

**Expected response:**
```json
{"status":"ok","message":"Backend running 🚀"}
```

If this doesn't work, your backend isn't running!

### **2. Check Your `.env` File**

Make sure your dashboard `.env` file has:
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

**Important:** 
- Must use `localhost` (not `127.0.0.1`)
- Must include `/api` at the end
- Must not have trailing slash

### **3. Check Browser Console**

After updating the files, check the browser console for:
```
🔗 API Base URL: http://localhost:4000/api
```

If it shows a different URL, your `.env` file isn't being read correctly.

---

## ✅ Testing

After making these changes:

1. **Refresh your dashboard** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. **Check browser console** for the API Base URL log
3. **Try logging in** with:
   - Email: `admin@test.com`
   - Password: `testpassword123`

---

## 🎯 Quick Checklist

- [ ] Backend is running on port 4000
- [ ] `.env` file has `VITE_API_BASE_URL=http://localhost:4000/api`
- [ ] Updated `src/api/client.ts` with shorter timeout (10s)
- [ ] Updated `src/services/auth.service.ts` with better error handling
- [ ] Updated `src/contexts/AuthContext.tsx` to handle errors gracefully
- [ ] Restarted dashboard dev server
- [ ] Hard refreshed browser

---

**After these fixes, your dashboard should connect properly!** 🎉

