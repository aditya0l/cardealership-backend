# 🖥️ DASHBOARD COMPLETE CONFIGURATION

Complete configuration for your React Dashboard to connect with the backend, just like the Expo app.

---

## 📦 Step 1: Install Required Packages

```bash
cd your-dashboard-directory
npm install axios firebase
```

---

## 🔧 Step 2: Create API Client Configuration

### **File: `src/api/client.ts`**

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// Backend API Base URL
// For web dashboard, use localhost (runs on same machine)
// For production, use your deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

class ApiClient {
  private client: AxiosInstance;
  private currentUser: User | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
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
            const token = await this.currentUser.getIdToken(true);
            config.headers.Authorization = `Bearer ${token}`;
          } catch (error) {
            console.error('Error getting auth token:', error);
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
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          const auth = getAuth();
          await signOut(auth);
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Helper method to get fresh token
  async getAuthToken(): Promise<string | null> {
    if (this.currentUser) {
      try {
        return await this.currentUser.getIdToken(true);
      } catch (error) {
        return null;
      }
    }
    return null;
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

## 🔥 Step 3: Firebase Configuration

### **File: `src/config/firebase.ts`**

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration
// Get these values from Firebase Console: https://console.firebase.google.com/
// Project: car-dealership-app-9f2d5
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCY3Iw35gcZhVrG3ZUH2B3I2LHoVBwkALE",
  authDomain: "car-dealership-app-9f2d5.firebaseapp.com",
  projectId: "car-dealership-app-9f2d5",
  storageBucket: "car-dealership-app-9f2d5.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and get a reference to the service
export const auth = getAuth(app);

export default app;
```

---

## 🔐 Step 4: Environment Variables

### **File: `.env`** (or `.env.local`)

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:4000/api

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyCY3Iw35gcZhVrG3ZUH2B3I2LHoVBwkALE
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

**To get missing Firebase values:**
1. Go to: https://console.firebase.google.com/
2. Select project: **car-dealership-app-9f2d5**
3. Settings ⚙️ → Project settings
4. Scroll down to "Your apps" → Web app
5. Copy `messagingSenderId` and `appId`

---

## 📡 Step 5: Authentication Service

### **File: `src/services/auth.service.ts`**

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
      // Step 1: Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Step 2: Get Firebase ID token
      const token = await userCredential.user.getIdToken();
      
      // Step 3: Sync user to backend database
      await apiClient.post(
        '/auth/sync',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Step 4: Get user profile from backend
      const profileResponse = await apiClient.get<{
        success: boolean;
        data: { user: UserProfile };
      }>('/auth/me');
      
      return {
        firebaseUser: userCredential.user,
        profile: profileResponse.data.data.user,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Get current user profile from backend
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<{
      success: boolean;
      data: { user: UserProfile };
    }>('/auth/me');
    return response.data.data.user;
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      // Clear any local storage
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

## 🎯 Step 6: Auth Context (React Context for Auth State)

### **File: `src/contexts/AuthContext.tsx`**

```typescript
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { authService, UserProfile } from '../services/auth.service';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile from backend
  const loadProfile = async (firebaseUser: User) => {
    try {
      const userProfile = await authService.getProfile();
      setProfile(userProfile);
      
      // Store in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(userProfile));
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadProfile(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    // Check for existing session
    const storedUser = localStorage.getItem('user');
    if (storedUser && auth.currentUser) {
      try {
        setProfile(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
      }
    }

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      setUser(result.firebaseUser);
      setProfile(result.profile);
      localStorage.setItem('user', JSON.stringify(result.profile));
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setProfile(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

## 🔑 Step 7: Login Component Example

### **File: `src/pages/LoginPage.tsx`**

```typescript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard'); // Redirect to dashboard after login
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Admin Login</h2>
        
        {error && <div className="error">{error}</div>}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
```

---

## 📋 Step 8: Test Credentials

```typescript
// Use these credentials to login:

// Admin
Email: admin@test.com
Password: testpassword123
Role: ADMIN

// Customer Advisor
Email: advisor@test.com
Password: testpassword123
Role: CUSTOMER_ADVISOR

// General Manager
Email: gm@test.com
Password: testpassword123
Role: GENERAL_MANAGER
```

---

## ✅ Step 9: Wrap Your App with AuthProvider

### **File: `src/main.tsx` or `src/App.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

---

## 🚀 Step 10: Usage Example

### **Protected Route Component:**

```typescript
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};
```

### **Using Auth in Components:**

```typescript
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { profile, logout } = useAuth();

  return (
    <div>
      <h1>Welcome, {profile?.name}</h1>
      <p>Role: {profile?.role.name}</p>
      <p>Employee ID: {profile?.employeeId}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

---

## 🔧 Configuration Summary

1. ✅ **API Base URL:** `http://localhost:4000/api` (web dashboard uses localhost)
2. ✅ **Firebase Config:** Configured in `src/config/firebase.ts`
3. ✅ **API Client:** Auto-attaches Firebase tokens to requests
4. ✅ **Auth Service:** Handles login, logout, profile fetching
5. ✅ **Auth Context:** React context for global auth state
6. ✅ **Auto-sync:** User syncs to backend after Firebase login

---

## ✅ That's It!

Your dashboard is now configured exactly like the Expo app. You can:

- ✅ Login with Firebase credentials
- ✅ Auto-sync users to backend
- ✅ Make authenticated API calls
- ✅ Access user profile with role information
- ✅ Auto-logout on 401 errors

**Start your dashboard and try logging in with:**
- Email: `admin@test.com`
- Password: `testpassword123`

🎉 **Everything should work now!**

