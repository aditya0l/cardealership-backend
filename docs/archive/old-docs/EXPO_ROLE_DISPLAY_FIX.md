# 🔧 EXPO APP - ROLE DISPLAY FIX GUIDE

## 🎯 **PROBLEM STATEMENT**

**Issue:** Users are showing incorrect roles (CUSTOMER_ADVISOR) even though the backend database has the correct roles (ADMIN, TEAM_LEAD, SALES_MANAGER, etc.).

**Root Cause:** The Expo app is caching old profile data and not refreshing it when users log in or when roles are updated.

**Verified Backend Status:**
- ✅ Database has correct roles
- ✅ Firebase custom claims have correct roles
- ✅ Backend API returns correct roles when called
- ❌ Expo app shows old cached data

---

## 📊 **CURRENT BACKEND RESPONSE**

When you call `GET /api/auth/me` or `GET /api/auth/profile`, the backend NOW returns:

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "firebaseUid": "GR20mbB1AROvpGToPwDK5zRwy6H3",
      "email": "test3@test.com",
      "name": "test3",
      "role": {
        "id": "cmgkr59of0003vn69ralesvtf",
        "name": "TEAM_LEAD"
      },
      "dealershipId": "cmgphfcpi0005i6n4c6lmitk7",
      "dealership": {
        "id": "cmgphfcpi0005i6n4c6lmitk7",
        "name": "Aditya jaif",
        "code": "TATA001",
        "type": "TATA",
        "email": "aditya@test.com",
        "phone": "+91-1234567890",
        "address": "Test Address",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "brands": ["TATA"],
        "isActive": true,
        "onboardingCompleted": true
      },
      "employeeId": "TL001",
      "isActive": true
    }
  }
}
```

---

## 🔧 **FIX 1: Update AuthContext to Properly Fetch Profile**

### **Problem:**
Your `AuthContext.tsx` might have a fallback that creates a user object without calling the backend, or it's not properly storing the backend response.

### **Solution:**

Update your `contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://automotive-backend-frqe.onrender.com/api';

interface User {
  firebaseUid: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: string;
  };
  dealershipId: string | null;
  dealership: {
    id: string;
    name: string;
    code: string;
    type: string;
    brands: string[];
  } | null;
  employeeId: string | null;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from backend
  const fetchUserProfile = async (firebaseUser: any): Promise<User | null> => {
    try {
      console.log('📡 Fetching profile from backend...');
      
      const token = await firebaseUser.getIdToken(true); // Force refresh
      
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.data?.user) {
        console.log('✅ Profile fetched successfully');
        console.log('   Role:', data.data.user.role.name);
        console.log('   Dealership:', data.data.user.dealership?.name);
        return data.data.user;
      } else {
        console.error('❌ Backend error:', data.error || data.message);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
      return null;
    }
  };

  // Refresh profile manually
  const refreshProfile = async () => {
    const auth = getAuth();
    const firebaseUser = auth.currentUser;
    
    if (firebaseUser) {
      setLoading(true);
      const userData = await fetchUserProfile(firebaseUser);
      setUser(userData);
      setLoading(false);
    }
  };

  // Monitor auth state
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Auth state changed:', firebaseUser?.email || 'No user');
      
      if (firebaseUser) {
        // User logged in - fetch full profile from backend
        const userData = await fetchUserProfile(firebaseUser);
        
        if (userData) {
          setUser(userData);
          
          // Cache for offline access (optional)
          await AsyncStorage.setItem('user', JSON.stringify(userData));
        } else {
          // Profile fetch failed - clear user
          console.error('❌ Could not load user profile');
          setUser(null);
        }
      } else {
        // User logged out
        setUser(null);
        await AsyncStorage.removeItem('user');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    const auth = getAuth();
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch fresh profile from backend
      const userData = await fetchUserProfile(userCredential.user);
      
      if (userData) {
        setUser(userData);
      } else {
        throw new Error('Failed to load user profile from backend');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
    setUser(null);
    await AsyncStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## 🔧 **FIX 2: Add Manual Refresh Button**

Add a refresh button to your profile or settings screen:

```typescript
// screens/ProfileScreen.tsx or SettingsScreen.tsx
import { Button, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export const ProfileScreen = () => {
  const { user, refreshProfile } = useAuth();

  const handleRefresh = async () => {
    try {
      await refreshProfile();
      Alert.alert('Success', 'Profile refreshed!');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh profile');
    }
  };

  return (
    <View>
      <Text>Email: {user?.email}</Text>
      <Text>Role: {user?.role.name}</Text>
      <Text>Dealership: {user?.dealership?.name}</Text>
      
      <Button title="🔄 Refresh Profile" onPress={handleRefresh} />
    </View>
  );
};
```

---

## 🔧 **FIX 3: Clear Cache on Logout**

Ensure logout clears ALL cached data:

```typescript
// In AuthContext or logout function
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signOut } from 'firebase/auth';

const logout = async () => {
  try {
    const auth = getAuth();
    
    // Sign out from Firebase
    await signOut(auth);
    
    // Clear ALL AsyncStorage
    await AsyncStorage.clear();
    
    // Reset user state
    setUser(null);
    
    console.log('✅ Logged out and cleared cache');
    
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

---

## 🔧 **FIX 4: Force Profile Fetch on App Launch**

In your `App.tsx` or root component:

```typescript
import { useAuth } from './contexts/AuthContext';

function App() {
  const { refreshProfile } = useAuth();

  useEffect(() => {
    // Force refresh profile when app opens
    const initialize = async () => {
      const auth = getAuth();
      if (auth.currentUser) {
        console.log('🔄 App launched - refreshing profile...');
        await refreshProfile();
      }
    };
    
    initialize();
  }, []);

  return (
    // Your app components
  );
}
```

---

## 🔧 **FIX 5: Debug Button (Temporary)**

Add this button to help debug what's happening:

```typescript
// Add to any screen for testing
import { Button, Alert } from 'react-native';
import { getAuth } from 'firebase/auth';

const DebugRoleButton = () => {
  const testBackendRole = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'Not logged in');
        return;
      }
      
      console.log('🔍 Testing backend...');
      console.log('   Firebase UID:', user.uid);
      console.log('   Email:', user.email);
      
      // Force get fresh token
      const token = await user.getIdToken(true);
      console.log('   Token refreshed ✅');
      
      // Call backend
      const response = await fetch(
        'https://automotive-backend-frqe.onrender.com/api/auth/me',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      console.log('═══════════════════════════════════');
      console.log('BACKEND RESPONSE:');
      console.log(JSON.stringify(data, null, 2));
      console.log('═══════════════════════════════════');
      
      if (data.success) {
        const backendRole = data.data.user.role.name;
        const backendRoleId = data.data.user.role.id;
        const backendDealership = data.data.user.dealership?.name;
        
        Alert.alert(
          'Backend Test Results',
          `Email: ${data.data.user.email}\n` +
          `Role: ${backendRole}\n` +
          `Role ID: ${backendRoleId}\n` +
          `Dealership: ${backendDealership}`,
          [
            { 
              text: 'Update App State', 
              onPress: () => {
                setUser(data.data.user);
                Alert.alert('Updated!', 'App state updated with backend data');
              }
            },
            { text: 'Cancel' }
          ]
        );
      } else {
        Alert.alert('Error', data.error || data.message);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Error', error.message);
    }
  };
  
  return (
    <Button 
      title="🔍 Test Backend Role" 
      onPress={testBackendRole}
      color="#007AFF"
    />
  );
};

export default DebugRoleButton;
```

**Usage:**
```typescript
import DebugRoleButton from './components/DebugRoleButton';

// In your profile or settings screen
<DebugRoleButton />
```

---

## 🔧 **FIX 6: Remove Fallback User Creation**

**Problem:** Your AuthContext might have fallback logic that creates a user object without calling the backend.

**Find and remove/update this code in AuthContext:**

```typescript
// ❌ BAD - Don't do this:
if (firebaseUser) {
  setUser({
    email: firebaseUser.email,
    name: firebaseUser.displayName,
    role: { name: 'CUSTOMER_ADVISOR' }  // ❌ Hardcoded default!
  });
}

// ✅ GOOD - Always fetch from backend:
if (firebaseUser) {
  const token = await firebaseUser.getIdToken(true);
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  setUser(data.data.user);  // ✅ Use backend data
}
```

---

## 🔧 **FIX 7: Clear AsyncStorage on Role Change**

If you have a user management screen where admins can change roles:

```typescript
// After updating a user's role via API
const updateUserRole = async (userId: string, newRole: string) => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  await fetch(
    `${API_BASE_URL}/auth/users/${userId}/role`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roleName: newRole })
    }
  );
  
  // Clear cache to force fresh fetch
  await AsyncStorage.removeItem('user');
  
  // Show message to user
  Alert.alert(
    'Role Updated',
    'The user must logout and login again to see the role change.',
    [{ text: 'OK' }]
  );
};
```

---

## 🔧 **FIX 8: Add Pull-to-Refresh**

Add swipe-to-refresh on screens that show user data:

```typescript
import { RefreshControl, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export const DashboardScreen = () => {
  const { user, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text>Role: {user?.role.name}</Text>
      <Text>Dealership: {user?.dealership?.name}</Text>
      {/* Your content */}
    </ScrollView>
  );
};
```

---

## 🔧 **FIX 9: Type Definitions**

Update your type definitions to match backend response:

```typescript
// types/user.ts
export interface User {
  firebaseUid: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: 'ADMIN' | 'GENERAL_MANAGER' | 'SALES_MANAGER' | 'TEAM_LEAD' | 'CUSTOMER_ADVISOR';
  };
  dealershipId: string | null;
  dealership: {
    id: string;
    name: string;
    code: string;
    type: 'TATA' | 'UNIVERSAL' | 'MAHINDRA' | 'HYUNDAI' | 'MARUTI' | 'OTHER';
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstNumber: string | null;
    panNumber: string | null;
    brands: string[];
    isActive: boolean;
    onboardingCompleted: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  employeeId: string | null;
  isActive: boolean;
}
```

---

## 🔧 **FIX 10: Complete API Service**

Create or update `services/authApi.ts`:

```typescript
// services/authApi.ts
import { getAuth } from 'firebase/auth';

const API_BASE_URL = 'https://automotive-backend-frqe.onrender.com/api';

export const authApi = {
  /**
   * Get current user profile (with dealership)
   */
  async getProfile() {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const token = await user.getIdToken(true); // Force refresh
    
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || data.message || 'Failed to fetch profile');
    }
    
    return data.data.user;
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Immediately fetch profile
    return await this.getProfile();
  },

  /**
   * Logout
   */
  async logout() {
    const auth = getAuth();
    await signOut(auth);
    await AsyncStorage.removeItem('user');
  }
};
```

---

## 🔧 **COMPLETE IMPLEMENTATION EXAMPLE**

### **Updated AuthContext.tsx (Complete):**

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/authApi';
import type { User } from '../types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = async () => {
    try {
      setError(null);
      const userData = await authApi.getProfile();
      setUser(userData);
      
      // Update cache
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      console.log('✅ Profile refreshed:', userData.role.name);
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Always fetch fresh from backend
          await refreshProfile();
        } catch (err) {
          console.error('Error loading profile:', err);
          setUser(null);
          setError('Failed to load profile. Please try logging in again.');
        }
      } else {
        setUser(null);
        setError(null);
        await AsyncStorage.removeItem('user');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = await authApi.login(email, password);
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## 🧪 **TESTING CHECKLIST**

After implementing the fixes:

- [ ] Add the debug button to a screen
- [ ] Login as test3@test.com
- [ ] Tap the debug button
- [ ] Check console logs for backend response
- [ ] Verify it shows `role: "TEAM_LEAD"`
- [ ] Tap "Update App State" in alert
- [ ] Check if UI now shows TEAM_LEAD
- [ ] Test logout and login again
- [ ] Verify role persists after fresh login

---

## 🚨 **IMMEDIATE WORKAROUND**

If you can't update the code right now, do this:

**For Each User:**
1. Open Expo app
2. Logout
3. Close app completely (swipe away)
4. Uninstall app (if possible)
5. expo start -c (clear cache)
6. Reinstall app
7. Login fresh
8. Should show correct role

---

## 📊 **EXPECTED BEHAVIOR AFTER FIX**

### **Login Flow:**
```
1. User enters email/password
2. Firebase authenticates ✅
3. App calls GET /api/auth/me ✅
4. Backend returns user with:
   - Correct role from database ✅
   - Full dealership object ✅
   - Employee ID ✅
5. App stores in state ✅
6. UI displays correct role ✅
```

### **Role Display:**
```typescript
const { user } = useAuth();

// Will show correct values
<Text>Role: {user.role.name}</Text>  // "TEAM_LEAD"
<Text>ID: {user.employeeId}</Text>   // "TL001"
<Text>Dealership: {user.dealership.name}</Text>  // "Aditya jaif"
```

---

## 🎯 **KEY CHANGES NEEDED**

| Issue | Fix |
|-------|-----|
| Profile not fetched on login | Add `await refreshProfile()` in login function |
| Fallback creates wrong user | Remove fallback, always fetch from backend |
| Cache not cleared on logout | Add `AsyncStorage.clear()` in logout |
| No manual refresh option | Add refresh button with `refreshProfile()` |
| Role changes not reflected | User must logout/login after role change |

---

## ✅ **VERIFICATION**

After implementing fixes, check console logs:

**Should See:**
```
📡 Fetching profile from backend...
✅ Profile fetched successfully
   Role: TEAM_LEAD
   Dealership: Aditya jaif
```

**Should NOT See:**
```
❌ Creating fallback user
❌ Using cached data
❌ Profile fetch failed, using Firebase data
```

---

## 📚 **RELATED DOCUMENTATION**

- `DEALERSHIP_API_COMPLETE_REFERENCE.md` - All API endpoints
- `EXPO_MULTI_TENANT_INTEGRATION.md` - Multi-tenant guide
- `EXPO_VEHICLE_CATALOG_INTEGRATION.md` - Catalog integration
- `USER_CREATION_MULTI_TENANT_UPDATED.md` - User creation guide

---

## 🎉 **SUMMARY**

**The backend is 100% correct!** All roles, employee IDs, and dealership assignments are accurate.

**The issue is in the Expo app:**
- Not properly fetching from backend
- Using cached/fallback data
- Not refreshing when needed

**Solution:**
1. Implement the AuthContext fixes above
2. Add refresh button
3. Test with debug button
4. Force logout/login for all users

**After these changes, roles will display correctly!** ✅

---

**Need help implementing? Start with Fix #1 (AuthContext update) and Fix #5 (Debug button) to see immediate results!** 🚀

