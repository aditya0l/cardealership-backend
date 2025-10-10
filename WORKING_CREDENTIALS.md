# 🔐 WORKING TEST CREDENTIALS

## 📅 Last Updated: October 9, 2025

---

## ✅ **VERIFIED WORKING CREDENTIALS**

### **For Expo Mobile App (Customer Advisors):**

```
Email: advisor.new@test.com
Password: testpassword123
Role: CUSTOMER_ADVISOR
Firebase UID: bPqDAnO0o6WGNR4WR19l7TLEz2d2
```

### **For Web Admin Dashboard:**

```
Email: admin.new@test.com
Password: testpassword123
Role: ADMIN
Firebase UID: p9BTaIFDPgSlYLavxN6VZEEQme23
```

---

## 📋 **ALL USERS IN SYSTEM**

### **Test Users (Created via /api/auth/test-user):**

| Email | Password | Role | UID | Status |
|-------|----------|------|-----|--------|
| `advisor.new@test.com` | `testpassword123` | CUSTOMER_ADVISOR | bPqDAnO0o6WGNR4WR19l7TLEz2d2 | ✅ Active |
| `admin.new@test.com` | `testpassword123` | ADMIN | p9BTaIFDPgSlYLavxN6VZEEQme23 | ✅ Active |

### **Seed Users (Created via seed script):**

| Email | Password | Role | UID | Status |
|-------|----------|------|-----|--------|
| `admin@cardealership.com` | *(unknown - Firebase only)* | ADMIN | admin-user-001 | ✅ Active |
| `gm@cardealership.com` | *(unknown - Firebase only)* | GENERAL_MANAGER | gm-user-001 | ✅ Active |
| `john.admin@dealership.com` | *(unknown)* | ADMIN | demo_john_admin_dealership.com | ✅ Active |
| `sarah.manager@dealership.com` | *(unknown)* | GENERAL_MANAGER | demo_sarah_manager_dealership.com | ✅ Active |
| `mike.manager@dealership.com` | *(unknown)* | SALES_MANAGER | demo_mike_manager_dealership.com | ✅ Active |
| `emily.lead@dealership.com` | *(unknown)* | TEAM_LEAD | demo_emily_lead_dealership.com | ✅ Active |
| `robert.lead@dealership.com` | *(unknown)* | TEAM_LEAD | demo_robert_lead_dealership.com | ✅ Active |
| `jessica.advisor@dealership.com` | *(unknown)* | CUSTOMER_ADVISOR | demo_jessica_advisor_dealership.com | ✅ Active |
| `david.advisor@dealership.com` | *(unknown)* | CUSTOMER_ADVISOR | demo_david_advisor_dealership.com | ✅ Active |
| `lisa.advisor@dealership.com` | *(unknown)* | CUSTOMER_ADVISOR | demo_lisa_advisor_dealership.com | ✅ Active |
| `james.advisor@dealership.com` | *(unknown)* | CUSTOMER_ADVISOR | demo_james_advisor_dealership.com | ✅ Active |
| `maria.advisor@dealership.com` | *(unknown)* | CUSTOMER_ADVISOR | demo_maria_advisor_dealership.com | ✅ Active |

---

## 🎯 **HOW TO USE THESE CREDENTIALS**

### **For Expo App:**

Use Firebase authentication:
```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseConfig';

const userCredential = await signInWithEmailAndPassword(
  auth,
  'advisor.new@test.com',
  'testpassword123'
);

const idToken = await userCredential.user.getIdToken();
// Use idToken for API calls
```

### **For Web Dashboard:**

Same approach but with admin credentials:
```javascript
const userCredential = await signInWithEmailAndPassword(
  auth,
  'admin.new@test.com',
  'testpassword123'
);
```

---

## 🔧 **CREATE MORE TEST USERS**

**Endpoint:** `POST http://localhost:4000/api/auth/test-user`

**Request:**
```json
{
  "name": "Your Name",
  "email": "yourname@test.com",
  "roleName": "CUSTOMER_ADVISOR"
}
```

**Password:** Always `testpassword123` for test users

---

## ⚠️ **IMPORTANT NOTES**

1. **OLD CREDENTIALS DON'T WORK:**
   - ❌ `advisor@test.com` - This email is in Firebase but NOT in the database
   - ❌ `test.advisor@test.com` - Doesn't exist
   - ❌ `TestPass123!` - This was never the actual password

2. **USE THESE INSTEAD:**
   - ✅ `advisor.new@test.com` / `testpassword123`
   - ✅ `admin.new@test.com` / `testpassword123`

3. **All test users have the same password:** `testpassword123`

4. **Firebase Project ID:** `car-dealership-app-9f2d5` (must match in your app config)

---

## 🚀 **QUICK START**

### Expo App:
```
Email: advisor.new@test.com
Password: testpassword123
```

### Admin Dashboard:
```
Email: admin.new@test.com
Password: testpassword123
```

**Both are VERIFIED WORKING!** ✅

