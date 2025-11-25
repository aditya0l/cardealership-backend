# 🏢 MULTI-TENANT DEALERSHIP SYSTEM - UPDATED DESIGN

## 🎯 **NEW REQUIREMENT**

**Goal:** Each admin manages ONE dealership with complete isolation between dealerships.

---

## 📊 **MULTI-TENANT MODEL**

### **Current vs. New Model**

| Feature | Current (Old) | New (Multi-Tenant) |
|---------|---------------|-------------------|
| System Admin | ADMIN sees all dealerships | No system admin |
| Dealership Admin | GM/SM manage dealership | ADMIN owns one dealership |
| Admin can create | Users in any dealership | Only users in their dealership |
| Data visibility | ADMIN sees all, staff sees own | Everyone sees only their dealership |
| Dealership creation | ADMIN creates multiple | Each ADMIN linked to ONE dealership |
| User assignment | Manual dealership assignment | Automatic from creator's dealership |

---

## 🏗️ **NEW ARCHITECTURE**

### **1. Dealership-Admin Relationship**

```typescript
// Each Admin is linked to exactly ONE dealership
User (ADMIN role) {
  dealershipId: required    // Cannot be null for ADMIN
}

// When ADMIN creates users, they inherit dealershipId
User (created by ADMIN) {
  dealershipId: creator.dealershipId  // Auto-assigned
}
```

### **2. Data Scoping Rules**

```typescript
// ALL data is scoped to user's dealership
Booking {
  dealershipId: currentUser.dealershipId  // Auto-assigned
}

Enquiry {
  dealershipId: currentUser.dealershipId  // Auto-assigned
}

VehicleCatalog {
  dealershipId: currentUser.dealershipId  // Dealership-specific
}

Vehicle (Stock) {
  dealershipId: currentUser.dealershipId  // Auto-assigned
}
```

### **3. User Creation Flow**

```
1. ADMIN logs in → dealershipId = "dealership-A"
2. ADMIN creates new user (Advisor)
3. System automatically assigns: advisor.dealershipId = "dealership-A"
4. Advisor can only see data from dealership-A
```

---

## 🔄 **UPDATED IMPLEMENTATION**

### **Schema Changes**

```prisma
model User {
  firebaseUid       String    @id
  name              String
  email             String    @unique
  roleId            String
  dealershipId      String    @map("dealership_id")  // NOW REQUIRED
  
  role              Role      @relation(fields: [roleId], references: [id])
  dealership        Dealership @relation(fields: [dealershipId], references: [id])
  
  // Constraint: ADMIN must have dealershipId
  // All users must have dealershipId
}

model Dealership {
  id                    String   @id @default(cuid())
  name                  String
  code                  String   @unique
  type                  DealershipType
  
  // Each dealership has one or more admins
  users                 User[]
  vehicleCatalogs       VehicleCatalog[]
  bookings              Booking[]
  enquiries             Enquiry[]
  vehicles              Vehicle[]
}
```

### **Middleware Updates**

```typescript
// middleware/dealership.middleware.ts

// Auto-assign dealership to all data
export const autoDealershipScope = async (req, res, next) => {
  const user = req.user;
  
  // ALL users (including ADMIN) are scoped to their dealership
  if (req.body && !req.body.dealershipId) {
    req.body.dealershipId = user.dealershipId;
  }
  
  // Filter queries by dealership
  req.dealershipFilter = {
    dealershipId: user.dealershipId
  };
  
  next();
};

// Prevent cross-dealership access
export const enforceDealershipIsolation = async (req, res, next) => {
  const user = req.user;
  const resourceDealershipId = req.params.dealershipId || req.body.dealershipId;
  
  // Users can ONLY access their own dealership
  if (resourceDealershipId && resourceDealershipId !== user.dealershipId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Cannot access other dealership data'
    });
  }
  
  next();
};
```

### **User Creation Updates**

```typescript
// controllers/auth.controller.ts

export const createUser = async (req, res) => {
  const creator = req.user; // The logged-in ADMIN
  const { name, email, roleId } = req.body;
  
  // Auto-assign creator's dealership to new user
  const newUser = await prisma.user.create({
    data: {
      firebaseUid: firebaseUser.uid,
      name,
      email,
      roleId,
      dealershipId: creator.dealershipId,  // 🆕 AUTO-ASSIGN
      isActive: true
    }
  });
  
  // User automatically belongs to admin's dealership
  return res.json({ success: true, data: { user: newUser } });
};
```

### **Query Filtering**

```typescript
// All queries automatically filtered by dealership

// Bookings
const bookings = await prisma.booking.findMany({
  where: {
    dealershipId: req.user.dealershipId  // Auto-filtered
  }
});

// Enquiries
const enquiries = await prisma.enquiry.findMany({
  where: {
    dealershipId: req.user.dealershipId  // Auto-filtered
  }
});

// Vehicle Catalog (variants)
const catalog = await prisma.vehicleCatalog.findMany({
  where: {
    dealershipId: req.user.dealershipId  // Dealership-specific
  }
});

// Stock
const vehicles = await prisma.vehicle.findMany({
  where: {
    dealershipId: req.user.dealershipId  // Auto-filtered
  }
});
```

---

## 🔐 **ROLES IN MULTI-TENANT SYSTEM**

### **Updated Role Hierarchy**

```
Dealership A                    Dealership B
├── ADMIN (Owner)              ├── ADMIN (Owner)
├── GENERAL_MANAGER            ├── GENERAL_MANAGER
├── SALES_MANAGER              ├── SALES_MANAGER
├── TEAM_LEAD                  ├── TEAM_LEAD
└── CUSTOMER_ADVISOR           └── CUSTOMER_ADVISOR
```

**Key Points:**
- Each dealership has its own ADMIN
- ADMIN cannot see other dealerships
- All users in a dealership only see their own data
- Complete isolation between dealerships

---

## 🚀 **ONBOARDING FLOW**

### **New Dealership Setup**

```
Step 1: Create Dealership
  → Name: "Mumbai Tata Motors"
  → Code: "TATA-MUM-001"
  → Type: "TATA"

Step 2: Create Admin User
  → Email: admin@mumbaitata.com
  → Role: ADMIN
  → dealershipId: <dealership-id>  // Linked to dealership

Step 3: Admin Configures Catalog
  → Add brands: TATA
  → Add models: Nexon, Harrier
  → Add variants with pricing

Step 4: Admin Creates Staff
  → Create GM, SM, TL, Advisors
  → All auto-assigned to Mumbai dealership

Step 5: Staff Manage Data
  → Create bookings, enquiries
  → All scoped to Mumbai dealership
```

---

## 📋 **API CHANGES**

### **1. User Creation** (Auto-scoped)

**Before:**
```typescript
POST /api/auth/users
{
  "name": "John Advisor",
  "email": "john@test.com",
  "roleId": "advisor-role-id",
  "dealershipId": "manual-assignment"  // Manual
}
```

**After:**
```typescript
POST /api/auth/users
{
  "name": "John Advisor",
  "email": "john@test.com",
  "roleId": "advisor-role-id"
  // dealershipId auto-assigned from creator
}
```

### **2. Booking Creation** (Auto-scoped)

**Before:**
```typescript
POST /api/bookings
{
  "customerName": "Alice",
  "dealershipId": "manual-assignment"  // Manual
}
```

**After:**
```typescript
POST /api/bookings
{
  "customerName": "Alice"
  // dealershipId auto-assigned from current user
}
```

### **3. Vehicle Catalog** (Dealership-specific)

```typescript
GET /api/catalog
// Returns only variants for current user's dealership

POST /api/catalog
{
  "brand": "TATA",
  "model": "Nexon",
  "variants": [...]
  // Auto-assigned to current dealership
}
```

---

## 🔄 **MIGRATION STRATEGY**

### **Migration Steps**

```sql
-- Step 1: Make dealershipId required for users
-- (After ensuring all users have dealershipId)
ALTER TABLE users 
  ALTER COLUMN dealership_id SET NOT NULL;

-- Step 2: Add unique constraint for admin per dealership (optional)
-- Ensures only one primary admin per dealership
CREATE UNIQUE INDEX idx_dealership_primary_admin 
  ON users (dealership_id) 
  WHERE role_id = (SELECT id FROM roles WHERE name = 'ADMIN');

-- Step 3: Add dealershipId to all data tables (already done)
-- ✅ bookings.dealership_id
-- ✅ enquiries.dealership_id
-- ✅ vehicles.dealership_id
-- ✅ vehicle_catalogs.dealership_id
```

---

## 🎯 **BENEFITS**

### **1. Complete Data Isolation**
- Each dealership's data is completely isolated
- No risk of cross-dealership data leaks
- ADMIN can't accidentally see other dealerships

### **2. Simplified Management**
- ADMIN focuses only on their dealership
- No system-wide permissions needed
- Clear ownership model

### **3. Scalable Multi-Tenancy**
- Easy to add new dealerships
- Each dealership is independent
- Can have different catalogs, pricing, etc.

### **4. Automatic Scoping**
- No manual dealership assignment needed
- Reduces errors
- Cleaner API

---

## 📱 **EXPO APP CHANGES**

### **User Creation Screen**

```typescript
// No need to select dealership - it's automatic!
const createUser = async (userData) => {
  const response = await fetch(`${API_URL}/auth/users`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      name: userData.name,
      email: userData.email,
      roleId: userData.roleId
      // dealershipId is auto-assigned!
    })
  });
};
```

### **Booking Creation**

```typescript
// No need to specify dealership
const createBooking = async (bookingData) => {
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      customerName: bookingData.customerName,
      // ... other fields
      // dealershipId is auto-assigned!
    })
  });
};
```

### **Dashboard**

```typescript
// Show current dealership info
const Dashboard = () => {
  const { user } = useAuth();
  
  return (
    <View>
      <Text>Dealership: {user.dealership.name}</Text>
      <Text>Code: {user.dealership.code}</Text>
      
      {/* All data automatically filtered */}
      <BookingsList />
      <EnquiriesList />
    </View>
  );
};
```

---

## ⚡ **IMPLEMENTATION CHECKLIST**

- [ ] Update Prisma schema (make dealershipId required)
- [ ] Create migration for required dealershipId
- [ ] Update auth middleware to include dealership
- [ ] Update user creation to auto-assign dealership
- [ ] Update all controllers to auto-scope by dealership
- [ ] Add dealership isolation enforcement
- [ ] Remove system-wide admin permissions
- [ ] Update API documentation
- [ ] Update Expo app integration guide
- [ ] Test multi-tenant isolation
- [ ] Create dealership onboarding flow

---

## 🔍 **COMPARISON**

| Feature | Old System | New Multi-Tenant |
|---------|-----------|------------------|
| Admin scope | System-wide | One dealership |
| User creation | Manual dealership | Auto from creator |
| Data scoping | Manual filtering | Automatic |
| Dealership visibility | ADMIN sees all | Only own dealership |
| Catalog | Shared or manual | Per dealership |
| Isolation | Role-based | Tenant-based |

---

## ✅ **SUMMARY**

**New Multi-Tenant Model:**

1. **One ADMIN = One Dealership**
2. **Auto-scoped Data** - All created data belongs to admin's dealership
3. **Complete Isolation** - No cross-dealership access
4. **Simplified API** - No manual dealership assignment needed
5. **True Multi-Tenancy** - Multiple independent dealerships

**This allows true multi-dealership support where each dealership operates independently!**

---

**Ready to implement this updated design?** 🚀

