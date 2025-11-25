# 📱 EXPO APP - MULTI-DEALERSHIP INTEGRATION GUIDE

## 🎯 **OVERVIEW**

The backend has been updated with a complete **multi-dealership system**. This guide provides everything you need to integrate these features into your Expo mobile app.

---

## 🔑 **KEY CONCEPTS**

### **1. Data Isolation**
- **System Admin (ADMIN role):** Can see ALL dealerships and ALL data
- **Dealership Staff (GM, SM, TL, Advisor):** Can ONLY see their own dealership's data
- All data (bookings, enquiries, quotations, vehicles) is automatically filtered by `dealershipId`

### **2. Dealership Types**
```typescript
type DealershipType = 
  | 'TATA' 
  | 'UNIVERSAL' 
  | 'MAHINDRA' 
  | 'HYUNDAI' 
  | 'MARUTI' 
  | 'OTHER';
```

### **3. User Assignment**
- Every user (except ADMIN) must be assigned to a dealership
- Users can only access data from their assigned dealership
- `dealershipId` is now part of the authenticated user object

---

## 📊 **DATA STRUCTURES**

### **Dealership Object**
```typescript
interface Dealership {
  id: string;                    // UUID
  name: string;                  // e.g., "Mumbai Tata Motors"
  code: string;                  // Unique code e.g., "TATA-MUM-001"
  type: DealershipType;         // TATA, UNIVERSAL, etc.
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string;           // Optional
  panNumber?: string;           // Optional
  brands: string[];             // e.g., ["TATA", "MAHINDRA"]
  isActive: boolean;
  onboardingCompleted: boolean;
  createdAt: string;            // ISO 8601
  updatedAt: string;            // ISO 8601
  
  // Related data (when included)
  _count?: {
    employees?: number;
    bookings?: number;
    enquiries?: number;
  };
}
```

### **Vehicle Catalog Object**
```typescript
interface VehicleCatalog {
  id: string;
  dealershipId: string;
  brand: string;               // e.g., "TATA"
  model: string;               // e.g., "Nexon"
  isActive: boolean;
  variants: VehicleVariant[];
  createdAt: string;
  updatedAt: string;
}

interface VehicleVariant {
  name: string;                // e.g., "XZ+ Lux Petrol AT"
  vcCode: string;              // Variant code e.g., "NXN-XZ-LUX-P-AT"
  fuelTypes: string[];         // ["Petrol", "Diesel", "Electric"]
  transmissions: string[];     // ["Manual", "Automatic"]
  colors: ColorOption[];
  exShowroomPrice: number;     // Base price
  rtoCharges: number;
  insurance: number;
  accessories: number;
  onRoadPrice: number;         // Total price
  isAvailable: boolean;
}

interface ColorOption {
  name: string;                // e.g., "Flame Red"
  code: string;                // e.g., "FR"
  additionalCost: number;      // Extra cost for this color
  isAvailable: boolean;
}
```

### **Updated User Object**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  dealershipId?: string;       // 🆕 NEW FIELD
  
  // Related data (when included)
  dealership?: Dealership;     // 🆕 Populated dealership
}
```

### **Updated Booking/Enquiry/Quotation Objects**
All these models now include:
```typescript
interface Booking {
  // ... existing fields
  dealershipId?: string;       // 🆕 NEW FIELD
  
  // Related data (when included)
  dealership?: Dealership;     // 🆕 Populated dealership
}
```

---

## 🌐 **API ENDPOINTS**

**Base URL:** `https://automotive-backend-frqe.onrender.com/api`

### **Authentication Required**
All endpoints require the Firebase ID token in the Authorization header:
```typescript
headers: {
  'Authorization': `Bearer ${firebaseIdToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📍 **DEALERSHIP MANAGEMENT ENDPOINTS**

### **1. List All Dealerships**
```typescript
GET /api/dealerships
```

**Query Parameters:**
```typescript
interface QueryParams {
  page?: number;           // Default: 1
  limit?: number;          // Default: 20, Max: 100
  type?: DealershipType;   // Filter by dealership type
  search?: string;         // Search by name, code, or email
  isActive?: boolean;      // Filter by active status
  includeCount?: boolean;  // Include employee/booking counts
}
```

**Example Request:**
```typescript
const response = await fetch(
  'https://automotive-backend-frqe.onrender.com/api/dealerships?page=1&limit=10&isActive=true',
  {
    headers: {
      'Authorization': `Bearer ${firebaseIdToken}`,
    }
  }
);
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "dealerships": Dealership[],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

### **2. Get Dealership by ID**
```typescript
GET /api/dealerships/:id
```

**Example Request:**
```typescript
const response = await fetch(
  `https://automotive-backend-frqe.onrender.com/api/dealerships/${dealershipId}`,
  {
    headers: {
      'Authorization': `Bearer ${firebaseIdToken}`,
    }
  }
);
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "dealership": Dealership
  }
}
```

---

### **3. Create Dealership (Admin Only)**
```typescript
POST /api/dealerships
```

**Request Body:**
```typescript
interface CreateDealershipRequest {
  name: string;             // Required
  code: string;             // Required, must be unique
  type: DealershipType;     // Required
  email: string;            // Required
  phone: string;            // Required
  address: string;          // Required
  city: string;             // Required
  state: string;            // Required
  pincode: string;          // Required
  gstNumber?: string;       // Optional
  panNumber?: string;       // Optional
  brands: string[];         // Required, e.g., ["TATA"]
}
```

**Example Request:**
```typescript
const response = await fetch(
  'https://automotive-backend-frqe.onrender.com/api/dealerships',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseIdToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: "Mumbai Tata Motors",
      code: "TATA-MUM-001",
      type: "TATA",
      email: "contact@mumbaitata.com",
      phone: "+91-22-12345678",
      address: "123 Mumbai Highway",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      gstNumber: "27AABCT1234A1Z5",
      panNumber: "AABCT1234A",
      brands: ["TATA"]
    })
  }
);
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "dealership": Dealership
  }
}
```

---

### **4. Update Dealership**
```typescript
PATCH /api/dealerships/:id
```

**Permissions:**
- ADMIN: Can update any dealership
- GM/SM: Can only update their own dealership

**Request Body:** (All fields optional)
```typescript
interface UpdateDealershipRequest {
  name?: string;
  type?: DealershipType;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  panNumber?: string;
  brands?: string[];
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "dealership": Dealership
  }
}
```

---

### **5. Activate Dealership (Admin Only)**
```typescript
POST /api/dealerships/:id/activate
```

**Response:**
```typescript
{
  "success": true,
  "message": "Dealership activated successfully",
  "data": {
    "dealership": Dealership
  }
}
```

---

### **6. Deactivate Dealership (Admin Only)**
```typescript
POST /api/dealerships/:id/deactivate
```

**Response:**
```typescript
{
  "success": true,
  "message": "Dealership deactivated successfully",
  "data": {
    "dealership": Dealership
  }
}
```

---

### **7. Complete Onboarding (Admin Only)**
```typescript
POST /api/dealerships/:id/complete-onboarding
```

**Response:**
```typescript
{
  "success": true,
  "message": "Dealership onboarding completed successfully",
  "data": {
    "dealership": Dealership
  }
}
```

---

## 🚗 **VEHICLE CATALOG ENDPOINTS**

### **8. Get Dealership Catalog**
```typescript
GET /api/dealerships/:id/catalog
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "catalog": VehicleCatalog[]
  }
}
```

---

### **9. Get Complete Catalog (Structured)**
```typescript
GET /api/dealerships/:dealershipId/catalog/complete
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "brands": [
      {
        "brand": "TATA",
        "models": [
          {
            "model": "Nexon",
            "catalogId": "...",
            "variants": VehicleVariant[]
          }
        ]
      }
    ]
  }
}
```

---

### **10. Add Vehicle to Catalog**
```typescript
POST /api/dealerships/:dealershipId/catalog
```

**Permissions:** ADMIN, GM, SM

**Request Body:**
```typescript
interface AddCatalogRequest {
  brand: string;            // e.g., "TATA"
  model: string;            // e.g., "Nexon"
  variants: {
    name: string;
    vcCode: string;
    fuelTypes: string[];
    transmissions: string[];
    colors: {
      name: string;
      code: string;
      additionalCost: number;
      isAvailable: boolean;
    }[];
    exShowroomPrice: number;
    rtoCharges: number;
    insurance: number;
    accessories: number;
    onRoadPrice: number;
    isAvailable: boolean;
  }[];
}
```

**Example Request:**
```typescript
const response = await fetch(
  `https://automotive-backend-frqe.onrender.com/api/dealerships/${dealershipId}/catalog`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseIdToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      brand: "TATA",
      model: "Nexon",
      variants: [
        {
          name: "XZ+ Lux Petrol AT",
          vcCode: "NXN-XZ-LUX-P-AT",
          fuelTypes: ["Petrol"],
          transmissions: ["Automatic"],
          colors: [
            {
              name: "Flame Red",
              code: "FR",
              additionalCost: 0,
              isAvailable: true
            }
          ],
          exShowroomPrice: 1149000,
          rtoCharges: 85000,
          insurance: 45000,
          accessories: 15000,
          onRoadPrice: 1294000,
          isAvailable: true
        }
      ]
    })
  }
);
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "catalog": VehicleCatalog
  }
}
```

---

### **11. Get Available Brands**
```typescript
GET /api/dealerships/:dealershipId/catalog/brands
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "brands": ["TATA", "MAHINDRA"]
  }
}
```

---

### **12. Get Models by Brand**
```typescript
GET /api/dealerships/:dealershipId/catalog/models?brand=TATA
```

**Query Parameters:**
- `brand` (required): The brand name

**Response:**
```typescript
{
  "success": true,
  "data": {
    "models": [
      {
        "model": "Nexon",
        "catalogId": "...",
        "isActive": true
      },
      {
        "model": "Harrier",
        "catalogId": "...",
        "isActive": true
      }
    ]
  }
}
```

---

### **13. Get Model Variants**
```typescript
GET /api/dealerships/:dealershipId/catalog/:catalogId/variants
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "brand": "TATA",
    "model": "Nexon",
    "variants": VehicleVariant[]
  }
}
```

---

### **14. Update Catalog Entry**
```typescript
PATCH /api/dealerships/:dealershipId/catalog/:catalogId
```

**Permissions:** ADMIN, GM, SM

**Request Body:** (All fields optional)
```typescript
interface UpdateCatalogRequest {
  isActive?: boolean;
  variants?: VehicleVariant[];
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "catalog": VehicleCatalog
  }
}
```

---

### **15. Delete Catalog Entry**
```typescript
DELETE /api/dealerships/:dealershipId/catalog/:catalogId
```

**Permissions:** ADMIN, GM only

**Response:**
```typescript
{
  "success": true,
  "message": "Catalog entry deleted successfully"
}
```

---

## 👤 **USER MANAGEMENT UPDATES**

### **Get Current User (Now includes dealershipId)**
```typescript
GET /api/auth/me
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "CUSTOMER_ADVISOR",
      "dealershipId": "...",        // 🆕 NEW
      "dealership": {               // 🆕 NEW (populated)
        "id": "...",
        "name": "Mumbai Tata Motors",
        "code": "TATA-MUM-001",
        // ... other dealership fields
      }
    }
  }
}
```

---

### **Assign User to Dealership (Admin Only)**
```typescript
PATCH /api/auth/users/:userId
```

**Request Body:**
```typescript
{
  "dealershipId": "dealership-id-here"
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "user": User  // User object with updated dealershipId
  }
}
```

---

## 📋 **EXISTING ENDPOINTS - AUTOMATIC FILTERING**

All existing endpoints now automatically filter by dealershipId (except for ADMIN users):

### **Bookings**
```typescript
GET /api/bookings
POST /api/bookings
GET /api/bookings/:id
PATCH /api/bookings/:id
DELETE /api/bookings/:id
```

**New Behavior:**
- Non-admin users only see bookings from their dealership
- Admin users see all bookings from all dealerships
- Creating a booking automatically assigns current user's dealershipId

---

### **Enquiries**
```typescript
GET /api/enquiries
POST /api/enquiries
GET /api/enquiries/:id
PATCH /api/enquiries/:id
DELETE /api/enquiries/:id
```

**New Behavior:**
- Non-admin users only see enquiries from their dealership
- Admin users see all enquiries from all dealerships
- Creating an enquiry automatically assigns current user's dealershipId

---

### **Quotations**
```typescript
GET /api/quotations
POST /api/quotations
GET /api/quotations/:id
PATCH /api/quotations/:id
DELETE /api/quotations/:id
```

**New Behavior:**
- Non-admin users only see quotations from their dealership
- Admin users see all quotations from all dealerships
- Creating a quotation automatically assigns current user's dealershipId

---

### **Employees**
```typescript
GET /api/employees
POST /api/employees
GET /api/employees/:id
PATCH /api/employees/:id
```

**New Behavior:**
- Non-admin users only see employees from their dealership
- Admin users see all employees from all dealerships

---

### **Vehicles/Stock**
```typescript
GET /api/vehicles
POST /api/vehicles
GET /api/vehicles/:id
PATCH /api/vehicles/:id
DELETE /api/vehicles/:id
```

**New Behavior:**
- Non-admin users only see vehicles from their dealership
- Admin users see all vehicles from all dealerships
- Creating a vehicle automatically assigns current user's dealershipId

---

## 🎨 **IMPLEMENTATION GUIDE FOR EXPO APP**

### **Step 1: Update Type Definitions**

Create or update `types/dealership.ts`:

```typescript
// types/dealership.ts
export type DealershipType = 
  | 'TATA' 
  | 'UNIVERSAL' 
  | 'MAHINDRA' 
  | 'HYUNDRA' 
  | 'MARUTI' 
  | 'OTHER';

export interface Dealership {
  id: string;
  name: string;
  code: string;
  type: DealershipType;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string;
  panNumber?: string;
  brands: string[];
  isActive: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    employees?: number;
    bookings?: number;
    enquiries?: number;
  };
}

export interface ColorOption {
  name: string;
  code: string;
  additionalCost: number;
  isAvailable: boolean;
}

export interface VehicleVariant {
  name: string;
  vcCode: string;
  fuelTypes: string[];
  transmissions: string[];
  colors: ColorOption[];
  exShowroomPrice: number;
  rtoCharges: number;
  insurance: number;
  accessories: number;
  onRoadPrice: number;
  isAvailable: boolean;
}

export interface VehicleCatalog {
  id: string;
  dealershipId: string;
  brand: string;
  model: string;
  isActive: boolean;
  variants: VehicleVariant[];
  createdAt: string;
  updatedAt: string;
}
```

Update `types/user.ts`:
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  dealershipId?: string;        // 🆕 ADD THIS
  dealership?: Dealership;      // 🆕 ADD THIS
}
```

---

### **Step 2: Create Dealership API Service**

Create `services/dealershipApi.ts`:

```typescript
// services/dealershipApi.ts
import { API_BASE_URL } from '../config';
import { getAuth } from 'firebase/auth';

const getAuthHeader = async () => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const dealershipApi = {
  // List all dealerships
  async getAllDealerships(params?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
    isActive?: boolean;
    includeCount?: boolean;
  }) {
    const headers = await getAuthHeader();
    const queryString = new URLSearchParams(
      Object.entries(params || {}).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    const response = await fetch(
      `${API_BASE_URL}/dealerships${queryString ? `?${queryString}` : ''}`,
      { headers }
    );
    return response.json();
  },

  // Get single dealership
  async getDealership(id: string) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${id}`,
      { headers }
    );
    return response.json();
  },

  // Create dealership (Admin only)
  async createDealership(data: {
    name: string;
    code: string;
    type: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstNumber?: string;
    panNumber?: string;
    brands: string[];
  }) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/dealerships`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Update dealership
  async updateDealership(id: string, data: Partial<{
    name: string;
    type: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstNumber: string;
    panNumber: string;
    brands: string[];
  }>) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/dealerships/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Activate dealership
  async activateDealership(id: string) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${id}/activate`,
      { method: 'POST', headers }
    );
    return response.json();
  },

  // Deactivate dealership
  async deactivateDealership(id: string) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${id}/deactivate`,
      { method: 'POST', headers }
    );
    return response.json();
  },

  // Get dealership catalog
  async getCatalog(dealershipId: string) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog`,
      { headers }
    );
    return response.json();
  },

  // Get complete catalog (structured by brand/model)
  async getCompleteCatalog(dealershipId: string) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/complete`,
      { headers }
    );
    return response.json();
  },

  // Add vehicle to catalog
  async addVehicleToCatalog(dealershipId: string, data: {
    brand: string;
    model: string;
    variants: Array<{
      name: string;
      vcCode: string;
      fuelTypes: string[];
      transmissions: string[];
      colors: Array<{
        name: string;
        code: string;
        additionalCost: number;
        isAvailable: boolean;
      }>;
      exShowroomPrice: number;
      rtoCharges: number;
      insurance: number;
      accessories: number;
      onRoadPrice: number;
      isAvailable: boolean;
    }>;
  }) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );
    return response.json();
  },

  // Get available brands
  async getBrands(dealershipId: string) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/brands`,
      { headers }
    );
    return response.json();
  },

  // Get models by brand
  async getModelsByBrand(dealershipId: string, brand: string) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/models?brand=${brand}`,
      { headers }
    );
    return response.json();
  },

  // Get model variants
  async getModelVariants(dealershipId: string, catalogId: string) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/${catalogId}/variants`,
      { headers }
    );
    return response.json();
  },

  // Update catalog entry
  async updateCatalog(dealershipId: string, catalogId: string, data: {
    isActive?: boolean;
    variants?: any[];
  }) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/${catalogId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      }
    );
    return response.json();
  },

  // Delete catalog entry
  async deleteCatalog(dealershipId: string, catalogId: string) {
    const headers = await getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/dealerships/${dealershipId}/catalog/${catalogId}`,
      { method: 'DELETE', headers }
    );
    return response.json();
  },
};
```

---

### **Step 3: Update User Context**

Update your `AuthContext` or user context to include dealership data:

```typescript
// contexts/UserContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { User, Dealership } from '../types';

interface UserContextType {
  user: User | null;
  dealership: Dealership | null;
  isAdmin: boolean;
  isDealershipStaff: boolean;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from backend
        const token = await firebaseUser.getIdToken();
        const response = await fetch(
          'https://automotive-backend-frqe.onrender.com/api/auth/me',
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        const data = await response.json();
        setUser(data.data.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    dealership: user?.dealership || null,
    isAdmin: user?.role === 'ADMIN',
    isDealershipStaff: user?.dealershipId !== null,
    loading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
```

---

### **Step 4: Create UI Components**

#### **Dealership Selector (For Admin)**

```typescript
// components/DealershipSelector.tsx
import React, { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { dealershipApi } from '../services/dealershipApi';
import { Dealership } from '../types';

export const DealershipSelector = ({ 
  value, 
  onChange 
}: {
  value: string | null;
  onChange: (dealershipId: string) => void;
}) => {
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDealerships();
  }, []);

  const loadDealerships = async () => {
    try {
      const response = await dealershipApi.getAllDealerships({
        isActive: true,
        limit: 100
      });
      setDealerships(response.data.dealerships);
    } catch (error) {
      console.error('Failed to load dealerships:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Text>Loading dealerships...</Text>;

  return (
    <Picker
      selectedValue={value}
      onValueChange={onChange}
    >
      <Picker.Item label="Select Dealership" value="" />
      {dealerships.map(d => (
        <Picker.Item 
          key={d.id} 
          label={`${d.name} (${d.code})`} 
          value={d.id} 
        />
      ))}
    </Picker>
  );
};
```

---

#### **Vehicle Catalog Browser**

```typescript
// components/CatalogBrowser.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { dealershipApi } from '../services/dealershipApi';
import { useUser } from '../contexts/UserContext';

export const CatalogBrowser = () => {
  const { dealership } = useUser();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dealership?.id) {
      loadCatalog();
    }
  }, [dealership]);

  const loadCatalog = async () => {
    try {
      const response = await dealershipApi.getCompleteCatalog(dealership!.id);
      setCatalog(response.data.brands);
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Text>Loading catalog...</Text>;

  return (
    <FlatList
      data={catalog}
      keyExtractor={(item) => item.brand}
      renderItem={({ item: brandData }) => (
        <View>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            {brandData.brand}
          </Text>
          {brandData.models.map((modelData) => (
            <View key={modelData.catalogId}>
              <Text style={{ fontSize: 16, marginLeft: 10 }}>
                {modelData.model}
              </Text>
              {modelData.variants.map((variant, idx) => (
                <View key={idx} style={{ marginLeft: 20 }}>
                  <Text>{variant.name}</Text>
                  <Text>₹{variant.onRoadPrice.toLocaleString()}</Text>
                  <Text>
                    {variant.fuelTypes.join(', ')} | {variant.transmissions.join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    />
  );
};
```

---

### **Step 5: Update Booking/Enquiry Forms**

When creating bookings or enquiries, the `dealershipId` is automatically assigned based on the authenticated user's dealership. **No changes needed in the request body.**

However, to display dealership info in forms:

```typescript
// screens/CreateBookingScreen.tsx
import { useUser } from '../contexts/UserContext';

export const CreateBookingScreen = () => {
  const { user, dealership } = useUser();

  // Show dealership info at top of form
  return (
    <View>
      {dealership && (
        <View style={styles.dealershipBanner}>
          <Text>Dealership: {dealership.name}</Text>
          <Text>Code: {dealership.code}</Text>
        </View>
      )}
      
      {/* Rest of your booking form */}
    </View>
  );
};
```

---

### **Step 6: Handle Admin vs Staff Views**

```typescript
// screens/DashboardScreen.tsx
import { useUser } from '../contexts/UserContext';

export const DashboardScreen = () => {
  const { isAdmin, dealership } = useUser();

  return (
    <View>
      {isAdmin ? (
        <>
          <Text>System Admin Dashboard</Text>
          <Text>View all dealerships</Text>
          {/* Show dealership selector */}
          {/* Show aggregated data from all dealerships */}
        </>
      ) : (
        <>
          <Text>{dealership?.name} Dashboard</Text>
          <Text>Code: {dealership?.code}</Text>
          {/* Show dealership-specific data */}
        </>
      )}
    </View>
  );
};
```

---

## 🔐 **AUTHENTICATION & PERMISSIONS**

### **Role-Based Access Control**

```typescript
// utils/permissions.ts
export const canManageDealership = (user: User) => {
  return ['ADMIN', 'GENERAL_MANAGER', 'SALES_MANAGER'].includes(user.role);
};

export const canViewCatalog = (user: User) => {
  // All authenticated users can view catalog
  return true;
};

export const canEditCatalog = (user: User) => {
  return ['ADMIN', 'GENERAL_MANAGER', 'SALES_MANAGER'].includes(user.role);
};

export const canDeleteCatalog = (user: User) => {
  return ['ADMIN', 'GENERAL_MANAGER'].includes(user.role);
};

export const canCreateDealership = (user: User) => {
  return user.role === 'ADMIN';
};

export const canViewAllDealerships = (user: User) => {
  return user.role === 'ADMIN';
};
```

---

## 🎯 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Core Setup**
- [ ] Add dealership types and interfaces
- [ ] Update User type with `dealershipId` and `dealership` fields
- [ ] Create `dealershipApi.ts` service
- [ ] Update AuthContext to fetch dealership data

### **Phase 2: Admin Features (if user is ADMIN)**
- [ ] Create Dealership Management screen
- [ ] Add Create Dealership form
- [ ] Add Edit Dealership form
- [ ] Add Dealership list with search/filter
- [ ] Add Activate/Deactivate buttons
- [ ] Add Onboarding completion flow

### **Phase 3: Catalog Management**
- [ ] Create Catalog Browser component
- [ ] Add "Add to Catalog" form (GM/SM/Admin)
- [ ] Add Brand/Model/Variant selectors
- [ ] Add Price configuration UI
- [ ] Add Color options UI
- [ ] Show catalog in vehicle selection dropdowns

### **Phase 4: Update Existing Screens**
- [ ] Show dealership info in Dashboard
- [ ] Update Booking form to show dealership
- [ ] Update Enquiry form to show dealership
- [ ] Update Quotation form to use catalog variants
- [ ] Filter all lists by dealership (automatic via backend)

### **Phase 5: Testing**
- [ ] Test as ADMIN (should see all dealerships)
- [ ] Test as GM (should see only own dealership)
- [ ] Test as Advisor (should see only own dealership)
- [ ] Test catalog browsing
- [ ] Test vehicle variant selection
- [ ] Test booking creation with dealership assignment

---

## 🚨 **IMPORTANT NOTES**

### **1. Automatic Filtering**
- All existing endpoints (bookings, enquiries, quotations, vehicles) now automatically filter by dealershipId
- You don't need to pass `dealershipId` in request bodies - it's extracted from the authenticated user
- Admin users see ALL data; other users see only their dealership's data

### **2. Migration of Existing Data**
- Existing records may have `dealershipId = null`
- The backend handles this gracefully
- Admin users can assign dealerships to existing records

### **3. Catalog vs Stock**
- **Vehicle Catalog:** Template vehicles with pricing (managed by GM/SM)
- **Stock/Vehicles:** Actual inventory items (managed by all staff)
- When creating stock, you can select from catalog variants

### **4. Error Handling**
All endpoints return errors in this format:
```typescript
{
  "success": false,
  "error": "Error message here"
}
```

Always check `response.success` before accessing `response.data`.

---

## 📱 **UI/UX RECOMMENDATIONS**

### **1. Dealership Banner**
Show current dealership at the top of all screens (except for admin):
```
┌─────────────────────────────┐
│ Mumbai Tata Motors          │
│ Code: TATA-MUM-001          │
└─────────────────────────────┘
```

### **2. Admin Dealership Switcher**
For admin users, add a dealership selector in header:
```
┌─────────────────────────────┐
│ View as: [All Dealerships ▼]│
└─────────────────────────────┘
```

### **3. Catalog Vehicle Picker**
When selecting vehicles for booking/quotation:
```
Brand: [TATA ▼]
Model: [Nexon ▼]
Variant: [XZ+ Lux Petrol AT ▼]
Color: [Flame Red ▼]
Price: ₹12,94,000
```

### **4. Dealership Dashboard Cards**
```
┌──────────────┐ ┌──────────────┐
│ 45 Employees │ │ 120 Bookings │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│ 89 Enquiries │ │ 234 Vehicles │
└──────────────┘ └──────────────┘
```

---

## 🔗 **QUICK REFERENCE**

### **Base URL**
```
https://automotive-backend-frqe.onrender.com/api
```

### **Common Headers**
```typescript
{
  'Authorization': `Bearer ${firebaseIdToken}`,
  'Content-Type': 'application/json'
}
```

### **Main Endpoints**
- Dealerships: `/dealerships`
- Catalog: `/dealerships/:id/catalog`
- User with dealership: `/auth/me`

### **Dealership Types**
```
TATA | UNIVERSAL | MAHINDRA | HYUNDAI | MARUTI | OTHER
```

---

## ✅ **SUMMARY**

**What Changed:**
1. ✅ Multi-dealership support added to backend
2. ✅ All data now scoped to dealerships
3. ✅ Complete vehicle catalog system
4. ✅ Automatic data isolation based on user's dealership
5. ✅ 15 new API endpoints for dealership management

**What You Need to Do in Expo:**
1. Add dealership types and update User interface
2. Create dealership API service
3. Update AuthContext to include dealership
4. Build dealership management UI (for admin)
5. Build catalog browser and selection UI
6. Show dealership info in existing screens
7. Use catalog data when creating bookings/quotations

**The system is fully backward compatible** - existing features will continue to work, but now with proper dealership-level isolation! 🎉

---

**Need help with implementation? Refer to the code examples above or check the backend documentation!**

