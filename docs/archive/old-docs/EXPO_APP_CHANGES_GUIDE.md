# 📱 Expo App Changes Guide - Complete Implementation

This guide provides all the changes needed to integrate your Expo app with the car dealership backend API.

---

## 🔗 Backend Configuration

**Base URL (Local Development Only):**
```typescript
// For local development (from mobile device on same network)
const API_URL = 'http://YOUR_LOCAL_IP:4000/api';

// To find your local IP, run this in backend directory:
// npm run local-ip
// OR
// ifconfig | grep "inet " | grep -v 127.0.0.1
```

**To get your local IP:**
```bash
# On Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or use the backend script
npm run local-ip
```

---

## 📦 Step 1: Install Required Packages

```bash
cd your-expo-project
npm install axios @react-native-async-storage/async-storage
npm install firebase
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install date-fns
npm install @react-native-community/datetimepicker
```

---

## 📁 Step 2: Create API Service Structure

### **2.1. API Client (`src/api/client.ts`)**

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this with your local backend URL
// Replace YOUR_LOCAL_IP with your computer's local IP address
// Run 'npm run local-ip' in backend directory to find it
const API_BASE_URL = 'http://YOUR_LOCAL_IP:4000/api';

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
          await AsyncStorage.clear();
          // Navigate to login screen
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

### **2.2. Auth Service (`src/api/auth.ts`)**

```typescript
import apiClient from './client';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

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

export const authAPI = {
  // Login with Firebase
  async login(email: string, password: string) {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Sync user to backend
    const token = await userCredential.user.getIdToken();
    await apiClient.post('/auth/sync', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return userCredential.user;
  },

  // Get user profile from backend
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<{ success: boolean; data: { user: UserProfile } }>('/auth/me');
    return response.data.data.user;
  },

  // Logout
  async logout() {
    const auth = getAuth();
    await signOut(auth);
  },
};
```

---

### **2.3. Enquiry Service (`src/api/enquiries.ts`)**

```typescript
import apiClient from './client';

export type EnquirySource = 
  | 'WALK_IN' | 'PHONE_CALL' | 'WEBSITE' | 'DIGITAL' | 'SOCIAL_MEDIA'
  | 'REFERRAL' | 'ADVERTISEMENT' | 'EMAIL' | 'SHOWROOM_VISIT'
  | 'EVENT' | 'BTL_ACTIVITY' | 'WHATSAPP' | 'OUTBOUND_CALL' | 'OTHER';

export type EnquiryStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type EnquiryCategory = 'HOT' | 'LOST' | 'BOOKED';

export interface Enquiry {
  id: string;
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  model?: string;
  variant?: string;
  color?: string;
  source: EnquirySource;
  status: EnquiryStatus;
  category: EnquiryCategory;
  caRemarks?: string;
  expectedBookingDate?: string;
  lastFollowUpDate?: string;
  followUpCount: number;
  nextFollowUpDate?: string;
  assignedToUserId?: string;
  createdByUserId: string;
  dealerCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnquiryRequest {
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  model?: string;
  variant?: string;
  color?: string;
  source: EnquirySource;
  expectedBookingDate: string; // ISO date string
  caRemarks?: string;
  dealerCode?: string;
  assignedToUserId?: string;
  category?: EnquiryCategory;
  nextFollowUpDate?: string;
}

export const enquiryAPI = {
  // Create enquiry
  async create(data: CreateEnquiryRequest) {
    const response = await apiClient.post<{ success: boolean; data: { enquiry: Enquiry } }>(
      '/enquiries',
      data
    );
    return response.data.data.enquiry;
  },

  // Get enquiries with filters
  async getAll(params?: {
    page?: number;
    limit?: number;
    category?: EnquiryCategory;
    status?: EnquiryStatus;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.get<{
      success: boolean;
      data: {
        enquiries: Enquiry[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/enquiries?${queryParams.toString()}`);
    return response.data.data;
  },

  // Update enquiry (also converts to booking when category = 'BOOKED')
  async update(id: string, data: Partial<CreateEnquiryRequest> & { category?: EnquiryCategory }) {
    const response = await apiClient.put<{
      success: boolean;
      data: {
        enquiry: Enquiry;
        booking?: any; // Booking object if converted
        stockInfo?: any; // Stock validation info
      };
    }>(`/enquiries/${id}`, data);
    return response.data.data;
  },

  // Get enquiry by ID
  async getById(id: string) {
    const response = await apiClient.get<{ success: boolean; data: { enquiry: Enquiry } }>(
      `/enquiries/${id}`
    );
    return response.data.data.enquiry;
  },

  // Get dropdown options
  async getModels() {
    const response = await apiClient.get<{ success: boolean; data: string[] }>('/enquiries/models');
    return response.data.data;
  },

  async getVariants() {
    const response = await apiClient.get<{ success: boolean; data: string[] }>('/enquiries/variants');
    return response.data.data;
  },

  async getColors() {
    const response = await apiClient.get<{ success: boolean; data: string[] }>('/enquiries/colors');
    return response.data.data;
  },

  async getSources() {
    const response = await apiClient.get<{ success: boolean; data: EnquirySource[] }>('/enquiries/sources');
    return response.data.data;
  },
};
```

---

### **2.4. Booking Service (`src/api/bookings.ts`)**

```typescript
import apiClient from './client';

export type BookingStatus = 
  | 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'CONFIRMED' | 'DELIVERED'
  | 'CANCELLED' | 'NO_SHOW' | 'WAITLISTED' | 'RESCHEDULED' | 'BACK_ORDER' | 'APPROVED' | 'REJECTED';

export type TimelineFilter = 'today' | 'delivery_today' | 'pending_update' | 'overdue';

export interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  variant?: string;
  vcCode?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  status: BookingStatus;
  bookingDate?: string;
  expectedDeliveryDate?: string;
  fileLoginDate?: string;
  approvalDate?: string;
  rtoDate?: string;
  financeRequired?: boolean;
  financerName?: string;
  stockAvailability?: 'VNA' | 'VEHICLE_AVAILABLE';
  chassisNumber?: string;
  allocationOrderNumber?: string;
  advisorRemarks?: string;
  teamLeadRemarks?: string;
  salesManagerRemarks?: string;
  generalManagerRemarks?: string;
  adminRemarks?: string;
  advisorId?: string;
  dealerCode: string;
  zone?: string;
  region?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBookingRequest {
  status?: BookingStatus;
  expectedDeliveryDate?: string; // ISO date string
  financeRequired?: boolean;
  financerName?: string;
  fileLoginDate?: string; // ISO date string
  approvalDate?: string; // ISO date string
  rtoDate?: string; // ISO date string
  advisorRemarks?: string;
  stockAvailability?: 'VNA' | 'VEHICLE_AVAILABLE';
  chassisNumber?: string;
  allocationOrderNumber?: string;
}

export const bookingAPI = {
  // Get advisor's bookings with timeline filter
  async getMyBookings(params?: {
    timeline?: TimelineFilter;
    page?: number;
    limit?: number;
    status?: BookingStatus;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.timeline) queryParams.append('timeline', params.timeline);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.get<{
      success: boolean;
      data: {
        bookings: Booking[];
        timeline?: TimelineFilter;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/bookings/advisor/my-bookings?${queryParams.toString()}`);
    return response.data.data;
  },

  // Update booking status and fields
  async updateBooking(id: string, data: UpdateBookingRequest) {
    const response = await apiClient.put<{
      success: boolean;
      data: { booking: Booking };
    }>(`/bookings/${id}/update-status`, data);
    return response.data.data.booking;
  },

  // Get booking by ID
  async getById(id: string) {
    const response = await apiClient.get<{ success: boolean; data: { booking: Booking } }>(
      `/bookings/${id}`
    );
    return response.data.data.booking;
  },
};
```

---

### **2.5. Dashboard Service (`src/api/dashboard.ts`)**

```typescript
import apiClient from './client';

export const dashboardAPI = {
  // Get dashboard stats
  async getStats() {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        totalEmployees: number;
        activeEnquiries: number;
        pendingQuotations: number;
        totalBookings: number;
        stockCount: number;
        revenue: number;
        enquiryStats: {
          total: number;
          byCategory: { HOT: number; LOST: number; BOOKED: number };
          byStatus: { OPEN: number; CLOSED: number };
        };
        quotationStats: {
          total: number;
          byStatus: { [key: string]: number };
        };
      };
    }>('/dashboard/stats');
    return response.data.data;
  },

  // Get today's booking plan
  async getTodaysBookingPlan() {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        date: string;
        enquiriesDueToday: number;
        bookingsDueToday: number;
        enquiries: any[];
        bookings: any[];
      };
    }>('/dashboard/booking-plan/today');
    return response.data.data;
  },
};
```

---

## 🔐 Step 3: Update Auth Context

### **3.1. Auth Context (`src/context/AuthContext.tsx`)**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, UserProfile } from '../api/auth';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user profile from backend (not from Firebase token claims)
        try {
          const token = await firebaseUser.getIdToken(true);
          const profile = await authAPI.getProfile();
          setUser(profile);
          
          // Cache user profile
          await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
        await AsyncStorage.removeItem('userProfile');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await authAPI.login(email, password);
      // User profile will be fetched by onAuthStateChanged
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      await AsyncStorage.clear();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      try {
        const profile = await authAPI.getProfile();
        setUser(profile);
        await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, logout, refreshProfile }}>
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

## 📱 Step 4: Create Key Screens

### **4.1. Bookings Screen with Timeline Tabs**

```typescript
// src/screens/BookingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { bookingAPI, Booking, TimelineFilter } from '../api/bookings';
import { useAuth } from '../context/AuthContext';

const TIMELINE_OPTIONS: { key: TimelineFilter | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '📋' },
  { key: 'today', label: 'Today', emoji: '📅' },
  { key: 'delivery_today', label: 'Delivery', emoji: '🚗' },
  { key: 'pending_update', label: 'Pending', emoji: '⏰' },
  { key: 'overdue', label: 'Overdue', emoji: '🔴' },
];

export const BookingsScreen = () => {
  const { user } = useAuth();
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineFilter | 'all'>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const timeline = selectedTimeline === 'all' ? undefined : selectedTimeline;
      const response = await bookingAPI.getMyBookings({
        timeline,
        limit: 100,
      });
      setBookings(response.bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [selectedTimeline]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity style={styles.bookingCard}>
      <Text style={styles.customerName}>{item.customerName}</Text>
      <Text style={styles.variant}>{item.variant || 'No variant'}</Text>
      <View style={styles.statusRow}>
        <Text style={[styles.statusBadge, styles[`status${item.status}`]]}>
          {item.status}
        </Text>
        {item.expectedDeliveryDate && (
          <Text style={styles.date}>
            Delivery: {new Date(item.expectedDeliveryDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Timeline Tabs */}
      <View style={styles.timelineTabs}>
        <FlatList
          horizontal
          data={TIMELINE_OPTIONS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTimeline === item.key && styles.activeTab,
              ]}
              onPress={() => setSelectedTimeline(item.key)}
            >
              <Text style={styles.tabEmoji}>{item.emoji}</Text>
              <Text style={styles.tabText}>{item.label}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Bookings List */}
      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  timelineTabs: { paddingVertical: 10, backgroundColor: '#f5f5f5' },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    flexDirection: 'row',
  },
  activeTab: { backgroundColor: '#007AFF' },
  tabEmoji: { fontSize: 20, marginRight: 4 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#333' },
  bookingCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  customerName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  variant: { fontSize: 14, color: '#666', marginBottom: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  statusPENDING: { backgroundColor: '#FFF3CD', color: '#856404' },
  statusCONFIRMED: { backgroundColor: '#D1ECF1', color: '#0C5460' },
  statusDELIVERED: { backgroundColor: '#D4EDDA', color: '#155724' },
  date: { fontSize: 12, color: '#666' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
});
```

---

## 🔄 Step 5: Update Existing Files

### **Changes needed in existing files:**

1. **Update `.env` or environment config:**
   ```env
   API_BASE_URL=http://YOUR_LOCAL_IP:4000/api
   # Replace YOUR_LOCAL_IP with your computer's local IP address
   ```

2. **Update Firebase configuration** (if not already done):
   ```typescript
   // Make sure Firebase is initialized in your app
   import { initializeApp } from 'firebase/app';
   import { getAuth } from 'firebase/auth';
   
   const firebaseConfig = {
     // Your Firebase config
   };
   
   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   ```

3. **Update navigation** to include new screens:
   - Bookings screen with timeline tabs
   - Enquiries screen with category tabs
   - Dashboard screen

---

## ✅ Summary of Changes

### **New Files to Create:**
1. `src/api/client.ts` - API client with auth
2. `src/api/auth.ts` - Auth API calls
3. `src/api/enquiries.ts` - Enquiry API calls
4. `src/api/bookings.ts` - Booking API calls
5. `src/api/dashboard.ts` - Dashboard API calls
6. `src/screens/BookingsScreen.tsx` - Bookings with timeline
7. `src/screens/EnquiriesScreen.tsx` - Enquiries with categories

### **Files to Update:**
1. `src/context/AuthContext.tsx` - Fetch profile from backend
2. `package.json` - Add new dependencies
3. Navigation configuration - Add new screens
4. `.env` - Add API base URL

### **Key Features to Implement:**
1. ✅ Authentication with backend sync
2. ✅ Timeline filtering for bookings (Today, Delivery Today, Pending, Overdue)
3. ✅ Category filtering for enquiries (HOT, LOST, BOOKED)
4. ✅ Auto-booking conversion from enquiry
5. ✅ Role-based UI display
6. ✅ Pull-to-refresh on all lists

---

## 🚀 Quick Start

1. **Copy API service files** (from Step 2)
2. **Update Auth Context** (from Step 3)
3. **Create Bookings Screen** (from Step 4)
4. **Update API base URL** in `src/api/client.ts`
5. **Test with local backend** running on `http://YOUR_LOCAL_IP:4000`

All API endpoints are ready and documented in `EXPO_APP_INTEGRATION_PROMPT.md`!

