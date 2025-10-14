# User Role Assignment Logic

## Overview
This document explains how roles are assigned to users in the system based on their creation method.

---

## 🎯 Role Assignment Rules

### Rule 1: Firebase Auto-Created Users → ADMIN (Default)
**When:** User authenticates with Firebase but doesn't exist in database  
**Action:** Auto-create user with ADMIN role  
**Code:** `src/middlewares/auth.middleware.ts:135`

```typescript
// Default to ADMIN for auto-created users
let roleName: RoleName = RoleName.ADMIN;
if (decodedToken.customClaims?.role) {
  roleName = decodedToken.customClaims.role as RoleName;
}
```

**Example:**
```
1. User exists in Firebase: user@example.com
2. User logs into system for first time
3. System doesn't find user in database
4. Auto-creates user with ADMIN role
5. User has full system access
```

### Rule 2: Dashboard-Created Users → Explicit Role Required
**When:** Admin creates user through dashboard/API  
**Action:** Must explicitly specify role  
**Code:** `src/controllers/auth.controller.ts:126-128`

```typescript
// Role is REQUIRED field - cannot create without it
if (!name || !email || !password || !roleName) {
  throw createError('Name, email, password, and role are required', 400);
}
```

**Example:**
```
1. Admin goes to user management dashboard
2. Clicks "Create New User"
3. Fills form:
   - Name: John Doe
   - Email: john@example.com
   - Password: SecurePass123!
   - Role: SALES_MANAGER ← Must select
4. System creates user with selected role
5. User has SALES_MANAGER permissions
```

### Rule 3: Firebase with Custom Claims → Use Custom Claims
**When:** Firebase user has custom claims set  
**Action:** Use role from custom claims  
**Code:** `src/middlewares/auth.middleware.ts:136-138`

```typescript
if (decodedToken.customClaims?.role) {
  roleName = decodedToken.customClaims.role as RoleName;
}
```

**Example:**
```
1. Firebase user created with custom claims:
   admin.auth().setCustomUserClaims(uid, { role: 'CUSTOMER_ADVISOR' })
2. User logs in
3. System reads custom claims
4. Auto-creates user with CUSTOMER_ADVISOR role
5. User has CUSTOMER_ADVISOR permissions
```

---

## 📊 Role Assignment Flow Chart

```
User Login Attempt
    ↓
Check if user exists in database
    ↓
┌─────────────────────────┐
│ User exists?            │
└─────────────────────────┘
    ↓                    ↓
   YES                  NO
    │                    │
    │              ┌─────────────────────┐
    │              │ Check custom claims │
    │              └─────────────────────┘
    │                    ↓
    │              ┌─────────────────────┐
    │              │ Has role claim?     │
    │              └─────────────────────┘
    │                    ↓           ↓
    │                   YES         NO
    │                    │           │
    │              ┌─────────┐  ┌─────────┐
    │              │ Use     │  │ Default │
    │              │ claim   │  │ ADMIN   │
    │              │ role    │  │ role    │
    │              └─────────┘  └─────────┘
    │                    │           │
    │                    └─────┬─────┘
    │                          ↓
    │                  ┌─────────────┐
    │                  │ Auto-create │
    │                  │ user with   │
    │                  │ role        │
    │                  └─────────────┘
    │                          │
    └────────┬─────────────────┘
             ↓
    ┌─────────────────┐
    │ Continue with   │
    │ user's role     │
    │ permissions     │
    └─────────────────┘
```

---

## 🔐 Role Permissions Summary

| Role | Create | Read | Update | Delete | Special Permissions |
|------|--------|------|--------|--------|-------------------|
| **ADMIN** | ✅ All | ✅ All | ✅ All | ✅ All | Full system access |
| **GENERAL_MANAGER** | ❌ | ✅ All | ✅ Own remarks | ❌ | Read-only mostly |
| **SALES_MANAGER** | ❌ | ✅ All | ✅ Own remarks | ❌ | Read-only mostly |
| **TEAM_LEAD** | ❌ | ✅ All | ✅ Own remarks | ❌ | Read-only mostly |
| **CUSTOMER_ADVISOR** | ✅ Enquiries | ✅ Limited | ✅ Limited fields | ❌ | Booking updates only |

---

## 📝 User Creation Methods Comparison

### Method 1: Firebase Auto-Creation (Login)

**Trigger:** User logs in with Firebase credentials  
**Requirements:** 
- Valid Firebase account
- User doesn't exist in database

**Process:**
1. Firebase authenticates user ✅
2. Backend verifies token ✅
3. Checks if user exists in database
4. User not found → Auto-create
5. Assigns ADMIN role (or custom claim role)
6. User can access system

**Code Flow:**
```
auth.middleware.ts:authenticate()
  → verifyIdToken()
  → Check database
  → Auto-create if not found
  → Assign ADMIN role
```

**Result:** User with ADMIN role (default)

---

### Method 2: Dashboard Creation (Admin Action)

**Trigger:** Admin creates user via dashboard/API  
**Requirements:**
- User must be ADMIN
- Must provide all required fields including role

**Endpoint:** `POST /api/auth/users/create-with-credentials`

**Process:**
1. Admin submits user creation form
2. Backend validates all fields (including role) ✅
3. Creates Firebase user
4. Creates database user with specified role
5. Sets custom claims in Firebase
6. Returns success

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "roleName": "SALES_MANAGER"  // ✅ Required
}
```

**Code Flow:**
```
auth.controller.ts:createUserWithCredentials()
  → Validate role is provided
  → Create Firebase user
  → Create database user with role
  → Set custom claims
```

**Result:** User with explicitly assigned role

---

## 🛠️ How to Set Custom Claims (Optional)

If you want Firebase users to have specific roles instead of ADMIN default:

### Using Firebase Admin SDK

```javascript
const admin = require('firebase-admin');

// Set custom claims BEFORE user logs in
await admin.auth().setCustomUserClaims(firebaseUid, {
  role: 'CUSTOMER_ADVISOR'  // or any valid role
});
```

### Using Cloud Functions (Automated)

```javascript
// Trigger when new Firebase user created
exports.setDefaultRole = functions.auth.user().onCreate(async (user) => {
  await admin.auth().setCustomUserClaims(user.uid, {
    role: 'CUSTOMER_ADVISOR'  // Default for Firebase-created users
  });
});
```

### Using Script

```bash
# Run this script to set custom claims for existing Firebase users
npx ts-node scripts/set-firebase-custom-claims.ts
```

---

## 🎯 Best Practices

### 1. Production Security
**Recommendation:** Change default from ADMIN to less permissive role

```typescript
// Edit src/middlewares/auth.middleware.ts:135
// Change from:
let roleName: RoleName = RoleName.ADMIN;

// To:
let roleName: RoleName = RoleName.CUSTOMER_ADVISOR;
```

### 2. Dashboard User Creation
**Recommendation:** Always use dashboard for controlled user creation
- Explicit role selection
- Better audit trail
- Consistent user data

### 3. Firebase Custom Claims
**Recommendation:** Set custom claims for all Firebase users
- Prevents default ADMIN assignment
- Better security control
- Role visibility in Firebase

---

## 🔍 Debugging Role Assignment

### Check User's Role

**Database Query:**
```sql
SELECT u.email, u.name, r.name as role, u.is_active
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'user@example.com';
```

**API Request:**
```bash
curl https://your-backend.com/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Auto-Create Logs

**Backend logs to watch for:**
```
🔧 Auto-creating user for Firebase UID: xyz123, Email: user@example.com
✅ Auto-created user: user@example.com with role ADMIN
```

### Verify Custom Claims

**Using Firebase Admin SDK:**
```javascript
const user = await admin.auth().getUser(firebaseUid);
console.log('Custom claims:', user.customClaims);
// Expected: { role: 'ADMIN', roleId: '...' }
```

---

## 📋 Summary

| Creation Method | Role Source | Default Role | Requires Admin? |
|----------------|-------------|--------------|-----------------|
| **Firebase Login (auto)** | Custom claims OR default | **ADMIN** | ❌ No |
| **Dashboard Creation** | Explicit selection | **N/A (required)** | ✅ Yes |
| **API Creation** | Request body | **N/A (required)** | ✅ Yes |

### Key Points:
✅ Firebase auto-created users → ADMIN by default  
✅ Dashboard-created users → Role must be selected  
✅ Users without role → Not possible (always assigned)  
✅ Custom claims → Override default ADMIN assignment  

---

## 🚀 Quick Reference

### Auto-Create Behavior (Current)
```typescript
// src/middlewares/auth.middleware.ts:135
let roleName: RoleName = RoleName.ADMIN; // Default
```

### Dashboard Creation Validation
```typescript
// src/controllers/auth.controller.ts:126
if (!name || !email || !password || !roleName) {
  throw createError('Name, email, password, and role are required', 400);
}
```

### Available Roles
```typescript
enum RoleName {
  ADMIN = 'ADMIN',
  GENERAL_MANAGER = 'GENERAL_MANAGER',
  SALES_MANAGER = 'SALES_MANAGER',
  TEAM_LEAD = 'TEAM_LEAD',
  CUSTOMER_ADVISOR = 'CUSTOMER_ADVISOR'
}
```

---

**This implementation ensures:**
- 🔒 Security through role-based access control
- 🎯 Flexibility in user creation methods
- ✅ Default ADMIN for Firebase-created users
- 📋 Explicit role selection for dashboard-created users

