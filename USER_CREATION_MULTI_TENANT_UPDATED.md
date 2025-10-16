# 👥 User Creation and Role Assignment - MULTI-TENANT UPDATED

## 🎯 **MULTI-TENANT MODEL CHANGES**

**Key Updates:**
- ✅ Users automatically assigned to creator's dealership
- ✅ No manual `dealershipId` assignment needed
- ✅ Role and employee ID always stay in sync
- ✅ One admin per dealership enforced

---

## 🔧 **MAIN API ENDPOINT**

### **CREATE USER WITH ROLE**

**Endpoint:**
```
POST /api/auth/users/create-with-credentials
```

**🆕 MULTI-TENANT BEHAVIOR:**
- User automatically assigned to **creator's dealership**
- Employee ID auto-generated based on role
- Firebase custom claims auto-set

**Request Headers:**
```
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Request Body:** (✅ Simplified - no dealershipId needed!)
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "roleName": "CUSTOMER_ADVISOR"
}
```

**🆕 Response (Success - 201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "firebaseUid": "abc123xyz456...",
      "employeeId": "ADV002",
      "name": "John Doe",
      "email": "john@example.com",
      "role": {
        "id": "role-id-123",
        "name": "CUSTOMER_ADVISOR"
      },
      "dealershipId": "cmgphfcpi0005i6n4c6lmitk7",
      "dealership": {
        "id": "cmgphfcpi0005i6n4c6lmitk7",
        "name": "Aditya jaif",
        "code": "TATA001",
        "type": "TATA"
      },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 📊 **Available Roles**

| Role Name | Enum Value | Employee ID | Permissions |
|-----------|-----------|-------------|-------------|
| **Admin** | `ADMIN` | ADM001, ADM002... | ⭐ Full dealership access |
| **General Manager** | `GENERAL_MANAGER` | GM001, GM002... | 👔 Manage stocks, employees |
| **Sales Manager** | `SALES_MANAGER` | SM001, SM002... | 📊 Manage team, bookings |
| **Team Lead** | `TEAM_LEAD` | TL001, TL002... | 👥 Manage bookings, team |
| **Customer Advisor** | `CUSTOMER_ADVISOR` | ADV001, ADV002... | 👤 Handle customers |

**🆕 Employee ID Format:**
- Auto-generated based on role
- Sequential numbering per role type
- Always matches role (enforced)

---

## 🔄 **UPDATE USER ROLE**

**Endpoint:**
```
PUT /api/auth/users/{firebaseUid}/role
```

**Request Body:**
```json
{
  "roleName": "SALES_MANAGER"
}
```

**🆕 AUTO-UPDATES:**
When you update a role, the system automatically:
1. ✅ Updates `roleId` in database
2. ✅ Generates new `employeeId` (e.g., SM003)
3. ✅ Updates Firebase custom claims
4. ✅ Keeps everything in sync

**Response:**
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "user": {
      "firebaseUid": "abc123...",
      "name": "John Doe",
      "email": "john@example.com",
      "employeeId": "SM003",
      "role": {
        "name": "SALES_MANAGER"
      },
      "dealershipId": "cmgphfcpi0005i6n4c6lmitk7"
    }
  }
}
```

⚠️ **Important:** User must logout and login again to see role change in app!

---

## 🏢 **MULTI-TENANT DEALERSHIP**

### **Get Current User Profile**

**Endpoint:**
```
GET /api/auth/me
```
or
```
GET /api/auth/profile
```

**🆕 Response Includes Dealership:**
```json
{
  "success": true,
  "data": {
    "user": {
      "firebaseUid": "abc123...",
      "email": "john@example.com",
      "name": "John Doe",
      "role": {
        "id": "role-id",
        "name": "CUSTOMER_ADVISOR"
      },
      "dealershipId": "cmgphfcpi0005i6n4c6lmitk7",
      "dealership": {
        "id": "cmgphfcpi0005i6n4c6lmitk7",
        "name": "Aditya jaif",
        "code": "TATA001",
        "type": "TATA",
        "email": "contact@dealership.com",
        "phone": "+91-1234567890",
        "brands": ["TATA"],
        "isActive": true
      },
      "employeeId": "ADV002",
      "isActive": true
    }
  }
}
```

---

## 🚨 **COMMON ISSUES & FIXES**

### **Issue 1: Role Shows Wrong in App**

**Symptoms:**
- Created user with TEAM_LEAD
- App shows CUSTOMER_ADVISOR

**Root Causes:**
1. ✅ **FIXED:** Auto-create was overwriting roles (now disabled)
2. ✅ **FIXED:** Employee ID not updated when role changed
3. ⚠️ **App caching:** Token/state cached in app

**Solution:**
```
1. Verify database role is correct
2. Verify Firebase claims match database
3. User must LOGOUT and LOGIN to refresh
4. Check AuthContext properly fetches from backend
```

---

### **Issue 2: Firebase Claims vs Database Mismatch**

**Symptoms:**
- Firebase claims say TEAM_LEAD
- Database says CUSTOMER_ADVISOR
- App shows CUSTOMER_ADVISOR (uses database)

**Solution:**
Update database to match Firebase claims:
```sql
UPDATE users 
SET "roleId" = (SELECT id FROM roles WHERE name = 'TEAM_LEAD')
WHERE email = 'user@example.com';
```

Then user must logout/login to see change.

---

### **Issue 3: Employee ID Doesn't Match Role**

**Symptoms:**
- User has TL001 (Team Lead ID)
- But role is CUSTOMER_ADVISOR

**Root Cause:**
Role was changed but employee ID wasn't updated.

**🆕 FIXED:**
Backend now auto-updates employee ID when role changes!

---

## 📱 **EXPO APP INTEGRATION**

### **User Creation in Expo:**

```typescript
// Simplified - no dealershipId needed!
const createUser = async (userData) => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch(
    'https://automotive-backend-frqe.onrender.com/api/auth/users/create-with-credentials',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        roleName: userData.roleName
        // dealershipId auto-assigned! ✅
      })
    }
  );
  
  const data = await response.json();
  return data.data.user;
};
```

### **Profile Fetch:**

```typescript
// Get user with dealership
const fetchProfile = async () => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken(true);
  
  const response = await fetch(
    'https://automotive-backend-frqe.onrender.com/api/auth/me',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  
  // Now includes dealership!
  console.log('Role:', data.data.user.role.name);
  console.log('Dealership:', data.data.user.dealership.name);
  console.log('Employee ID:', data.data.user.employeeId);
  
  return data.data.user;
};
```

---

## ✅ **SUMMARY**

**What Changed in Multi-Tenant:**
- ✅ Auto-assign dealership from creator
- ✅ Auto-generate employee ID from role
- ✅ Auto-update employee ID on role change
- ✅ Auto-set Firebase custom claims
- ✅ Profile includes full dealership object
- ✅ Disabled auto-user-create (security)

**Breaking Changes:**
- ⚠️ Users must exist in database before login (no auto-create)
- ⚠️ Users must logout/login after role changes
- ⚠️ All users must have dealership assigned

**New Features:**
- ✅ GET /api/auth/me (alias for /profile)
- ✅ Dealership in profile response
- ✅ Employee ID management
- ✅ Role-Employee ID sync

---

**Base URL:** `https://automotive-backend-frqe.onrender.com/api`  
**Last Updated:** October 14, 2025  
**API Version:** v2 (Multi-Tenant)

