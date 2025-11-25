# 📱 EXPO APP - MULTI-TENANT DEALERSHIP INTEGRATION

## 🎯 **UPDATED MODEL - TRUE MULTI-TENANCY**

**Key Changes from Previous Version:**
- ✅ **Each ADMIN owns ONE dealership** (not system-wide admin)
- ✅ **Auto-scope all data** to user's dealership
- ✅ **No manual dealership assignment** needed
- ✅ **Complete data isolation** between dealerships

---

## 🏗️ **MULTI-TENANT ARCHITECTURE**

### **How It Works**

```
Dealership A                          Dealership B
├── ADMIN@dealershipA.com           ├── ADMIN@dealershipB.com
│   ├── Creates users                 │   ├── Creates users
│   │   → Auto-assigned to A          │   │   → Auto-assigned to B
│   ├── Creates bookings              │   ├── Creates bookings
│   │   → Auto-scoped to A            │   │   → Auto-scoped to B
│   └── Configures catalog            │   └── Configures catalog
│       → Variants for A only         │       → Variants for B only
└── Data completely isolated        └── Data completely isolated
```

### **Key Principles**

1. **One Admin = One Dealership**: Each admin manages exactly one dealership
2. **Auto-Scoping**: All created data automatically belongs to user's dealership
3. **Inheritance**: Users created by admin inherit admin's dealership
4. **Isolation**: No cross-dealership access possible

---

## 🔄 **API CHANGES (SIMPLIFIED)**

### **What Changed**

| Operation | Old (Manual) | New (Auto) |
|-----------|-------------|------------|
| Create User | Must specify `dealershipId` | Auto-assigned from creator |
| Create Booking | Must specify `dealershipId` | Auto-assigned from user |
| Create Enquiry | Must specify `dealershipId` | Auto-assigned from user |
| Add Vehicle | Must specify `dealershipId` | Auto-assigned from user |
| Configure Catalog | Must specify `dealershipId` | Auto-assigned from user |
| View Data | Manual filtering | Automatic filtering |

---

## 📋 **UPDATED API ENDPOINTS**

### **1. User Creation** (Simplified)

**Old Request:**
```typescript
POST /api/auth/users/create-with-credentials
{
  "name": "John Advisor",
  "email": "john@dealership.com",
  "password": "password123",
  "roleName": "CUSTOMER_ADVISOR",
  "dealershipId": "manual-dealership-id" // ❌ Manual assignment
}
```

**New Request:**
```typescript
POST /api/auth/users/create-with-credentials
{
  "name": "John Advisor",
  "email": "john@dealership.com",
  "password": "password123",
  "roleName": "CUSTOMER_ADVISOR"
  // ✅ dealershipId auto-assigned from creator!
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "user": {
      "firebaseUid": "...",
      "name": "John Advisor",
      "email": "john@dealership.com",
      "role": { "name": "CUSTOMER_ADVISOR" },
      "dealershipId": "creator-dealership-id", // Auto-assigned
      "dealership": {
        "id": "...",
        "name": "Mumbai Tata Motors",
        "code": "TATA-MUM-001"
      }
    }
  }
}
```

---

### **2. Booking Creation** (Simplified)

**Old Request:**
```typescript
POST /api/bookings
{
  "customerName": "Alice Smith",
  "customerPhone": "+91-9876543210",
  "variant": "Nexon XZ+",
  "dealershipId": "manual-dealership-id" // ❌ Manual
}
```

**New Request:**
```typescript
POST /api/bookings
{
  "customerName": "Alice Smith",
  "customerPhone": "+91-9876543210",
  "variant": "Nexon XZ+"
  // ✅ dealershipId auto-assigned!
}
```

---

### **3. Vehicle Catalog** (Auto-scoped)

**Add to Catalog:**
```typescript
POST /api/dealerships/:dealershipId/catalog
// :dealershipId MUST match user's dealership (enforced)

{
  "brand": "TATA",
  "model": "Nexon",
  "variants": [
    {
      "name": "XZ+ Lux Petrol AT",
      "vcCode": "NXN-XZ-LUX-P-AT",
      "fuelTypes": ["Petrol"],
      "transmissions": ["Automatic"],
      "colors": [
        {
          "name": "Flame Red",
          "code": "FR",
          "additionalCost": 0,
          "isAvailable": true
        }
      ],
      "exShowroomPrice": 1149000,
      "onRoadPrice": 1294000,
      "isAvailable": true
    }
  ]
}
```

**Get Catalog:**
```typescript
GET /api/dealerships/:dealershipId/catalog
// Returns only current user's dealership catalog
// :dealershipId must match user's dealership
```

---

### **4. List Users** (Auto-filtered)

```typescript
GET /api/auth/users
// Automatically returns only users from YOUR dealership
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "users": [
      // Only users from your dealership
      {
        "email": "admin@yourdealership.com",
        "name": "Dealership Admin",
        "role": { "name": "ADMIN" },
        "dealershipId": "your-dealership-id"
      },
      {
        "email": "advisor@yourdealership.com",
        "name": "John Advisor",
        "role": { "name": "CUSTOMER_ADVISOR" },
        "dealershipId": "your-dealership-id"
      }
      // Users from other dealerships NOT included
    ]
  }
}
```

---

## 🔐 **AUTHENTICATION FLOW**

### **Login & Context**

```typescript
// 1. User logs in with Firebase
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// 2. Backend validates token and loads user + dealership
GET /api/auth/me
Authorization: Bearer {idToken}

// 3. Response includes dealership
{
  "success": true,
  "data": {
    "user": {
      "firebaseUid": "...",
      "email": "admin@mumbaitata.com",
      "name": "Mumbai Admin",
      "role": { "name": "ADMIN" },
      "dealershipId": "dealership-xyz",
      "dealership": {
        "id": "dealership-xyz",
        "name": "Mumbai Tata Motors",
        "code": "TATA-MUM-001",
        "type": "TATA",
        "brands": ["TATA"]
      }
    }
  }
}

// 4. Store user context in app
// All subsequent requests automatically scoped to this dealership
```

---

## 📱 **EXPO APP IMPLEMENTATION**

### **1. Auth Context** (Updated)

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { API_BASE_URL } from '../config';

interface User {
  firebaseUid: string;
  email: string;
  name: string;
  role: {
    name: string;
  };
  dealershipId: string;        // Always present
  dealership: {
    id: string;
    name: string;
    code: string;
    type: string;
    brands: string[];
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          
          if (data.success) {
            setUser(data.data.user);
          }
        } catch (error) {
          console.error('Failed to load user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        isAdmin: user?.role.name === 'ADMIN'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

### **2. Create User Screen** (Simplified)

```typescript
// screens/CreateUserScreen.tsx
import { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { getAuth } from 'firebase/auth';

export const CreateUserScreen = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER_ADVISOR');

  const createUser = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(
        `${API_BASE_URL}/auth/users/create-with-credentials`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            password,
            roleName: role
            // NO dealershipId needed - auto-assigned!
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        alert(`User created successfully in ${user?.dealership.name}`);
        // User automatically assigned to your dealership
      } else {
        alert(`Error: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
    }
  };

  return (
    <View>
      <Text>Create User for: {user?.dealership.name}</Text>
      <Text>Code: {user?.dealership.code}</Text>
      
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      
      <TextInput
        placeholder="Password (min 8 characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Picker selectedValue={role} onValueChange={setRole}>
        <Picker.Item label="Customer Advisor" value="CUSTOMER_ADVISOR" />
        <Picker.Item label="Team Lead" value="TEAM_LEAD" />
        <Picker.Item label="Sales Manager" value="SALES_MANAGER" />
        <Picker.Item label="General Manager" value="GENERAL_MANAGER" />
      </Picker>
      
      <Button title="Create User" onPress={createUser} />
    </View>
  );
};
```

---

### **3. Booking Creation** (Simplified)

```typescript
// screens/CreateBookingScreen.tsx
import { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { getAuth } from 'firebase/auth';

export const CreateBookingScreen = () => {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [variant, setVariant] = useState('');

  const createBooking = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          variant
          // NO dealershipId needed - auto-assigned!
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Booking created successfully');
      } else {
        alert(`Error: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
    }
  };

  return (
    <View>
      <Text>Dealership: {user?.dealership.name}</Text>
      
      <TextInput
        placeholder="Customer Name"
        value={customerName}
        onChangeText={setCustomerName}
      />
      
      <TextInput
        placeholder="Phone"
        value={customerPhone}
        onChangeText={setCustomerPhone}
        keyboardType="phone-pad"
      />
      
      <TextInput
        placeholder="Variant"
        value={variant}
        onChangeText={setVariant}
      />
      
      <Button title="Create Booking" onPress={createBooking} />
    </View>
  );
};
```

---

### **4. Dashboard** (Dealership Info)

```typescript
// screens/DashboardScreen.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export const DashboardScreen = () => {
  const { user, isAdmin } = useAuth();

  return (
    <View style={styles.container}>
      {/* Dealership Banner */}
      <View style={styles.dealershipBanner}>
        <Text style={styles.dealershipName}>
          {user?.dealership.name}
        </Text>
        <Text style={styles.dealershipCode}>
          Code: {user?.dealership.code}
        </Text>
        <Text style={styles.dealershipType}>
          Type: {user?.dealership.type}
        </Text>
        <Text style={styles.dealershipBrands}>
          Brands: {user?.dealership.brands.join(', ')}
        </Text>
      </View>

      {/* Role Info */}
      <View style={styles.roleInfo}>
        <Text style={styles.role}>Role: {user?.role.name}</Text>
        {isAdmin && (
          <Text style={styles.adminBadge}>DEALERSHIP ADMIN</Text>
        )}
      </View>

      {/* Stats - All auto-filtered to this dealership */}
      <View style={styles.stats}>
        <Text>All data shown below is for {user?.dealership.name} only</Text>
        {/* Your booking list, enquiries, etc. */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  dealershipBanner: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  dealershipName: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  dealershipCode: {
    fontSize: 14,
    color: '#666'
  },
  dealershipType: {
    fontSize: 14,
    color: '#666'
  },
  dealershipBrands: {
    fontSize: 14,
    color: '#666'
  },
  roleInfo: {
    marginBottom: 16
  },
  role: {
    fontSize: 16
  },
  adminBadge: {
    fontSize: 12,
    color: 'green',
    fontWeight: 'bold'
  },
  stats: {
    flex: 1
  }
});
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Phase 1: Update Auth Context**
- [ ] Add `dealershipId` and `dealership` to User type
- [ ] Fetch dealership data in `/auth/me` call
- [ ] Store dealership context in app state

### **Phase 2: Update Create User Screen**
- [ ] Remove dealership selector dropdown
- [ ] Show current dealership at top
- [ ] Remove `dealershipId` from API payload

### **Phase 3: Update Booking/Enquiry Screens**
- [ ] Remove dealership assignment fields
- [ ] Show dealership banner
- [ ] Remove `dealershipId` from API payloads

### **Phase 4: Update Dashboard**
- [ ] Add dealership information banner
- [ ] Show dealership name, code, type
- [ ] Display role and admin status

### **Phase 5: Vehicle Catalog**
- [ ] Ensure catalog calls use user's dealershipId
- [ ] Show dealership-specific variants only
- [ ] Filter vehicle lists by dealership

---

## 🚨 **IMPORTANT NOTES**

### **1. No Manual Dealership Assignment**
- ❌ Don't include `dealershipId` in create requests
- ✅ It's automatically assigned from the authenticated user

### **2. Dealership URL Parameters**
- Some endpoints still have `:dealershipId` in URL
- This MUST match the user's dealership (enforced by backend)
- Use `user.dealershipId` from auth context

### **3. Complete Data Isolation**
- Users can ONLY see their dealership's data
- No cross-dealership access possible
- Backend automatically filters all queries

### **4. Role Hierarchy Within Dealership**
```
ADMIN (Dealership Owner)
  └── Can create all users
  └── Can configure catalog
  └── Can view all dealership data

GENERAL_MANAGER
  └── Can manage dealership operations
  └── Can view all dealership data

SALES_MANAGER
  └── Can manage sales team
  └── Can view team data

TEAM_LEAD
  └── Can manage team
  └── Can view team data

CUSTOMER_ADVISOR
  └── Can manage assigned customers
  └── Can view own data
```

---

## 📊 **COMPARISON TABLE**

| Feature | Old System | New Multi-Tenant |
|---------|-----------|------------------|
| Dealership Assignment | Manual in each request | Automatic from user |
| Create User | Need to specify dealershipId | Auto-assigned from creator |
| Data Filtering | Manual in queries | Automatic by backend |
| Admin Scope | System-wide or dealership | One dealership only |
| Cross-dealership Access | Possible for system admin | Impossible for all users |
| API Complexity | Higher (manual scoping) | Lower (auto scoping) |

---

## 🎉 **BENEFITS FOR EXPO APP**

1. **Simpler Code**: No manual dealership assignment needed
2. **Fewer Errors**: Can't accidentally assign to wrong dealership
3. **Better UX**: Users always work in their dealership context
4. **Less API Calls**: Dealership info loaded once with user
5. **Automatic Filtering**: All data pre-filtered by backend

---

## 🔗 **UPDATED API REFERENCE**

**Base URL:** `https://automotive-backend-frqe.onrender.com/api`

### **Core Endpoints (Auto-scoped)**

| Endpoint | Method | Auto-Scoped? | Notes |
|----------|--------|--------------|-------|
| `/auth/me` | GET | ✅ | Returns user + dealership |
| `/auth/users/create-with-credentials` | POST | ✅ | New user gets creator's dealership |
| `/bookings` | GET/POST | ✅ | Auto-filtered/assigned to user's dealership |
| `/enquiries` | GET/POST | ✅ | Auto-filtered/assigned to user's dealership |
| `/quotations` | GET/POST | ✅ | Auto-filtered/assigned to user's dealership |
| `/vehicles` | GET/POST | ✅ | Auto-filtered/assigned to user's dealership |
| `/dealerships/:id/catalog` | GET/POST | ✅ | :id must be user's dealership |

---

**The multi-tenant model makes your Expo app simpler and more secure!** 🚀

