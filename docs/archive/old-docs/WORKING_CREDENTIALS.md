# 🔐 WORKING TEST CREDENTIALS

## 📅 Last Updated: November 9, 2025

---

## ✅ **VERIFIED WORKING CREDENTIALS (Fresh Database - Nov 22, 2025)**

### **For Expo Mobile App (Customer Advisors):**

```
Email: advisor@test.com
Password: testpassword123
Role: CUSTOMER_ADVISOR
Employee ID: ADV001
Firebase UID: A3JKSTqvuPa3mxvPVcERcOD2buv2
Status: ✅ Fresh user created
```

### **For Web Admin Dashboard:**

```
Email: admin@test.com
Password: testpassword123
Role: ADMIN
Employee ID: ADM001
Firebase UID: YTPf9tKbZ1dsTYqDBlLc3xzdryo2
Status: ✅ Fresh user created
```

### **For Testing (General Manager):**

```
Email: gm@test.com
Password: testpassword123
Role: GENERAL_MANAGER
Employee ID: GM001
Firebase UID: htwGSGv8DuV6m3vHf8KFK3S03AJ2
Status: ✅ Fresh user created
```

### **For Testing (Sales Manager):**

```
Email: sm@test.com
Password: testpassword123
Role: SALES_MANAGER
Employee ID: SM001
Firebase UID: UIETCzR0imYbjJwaNpx98qOOAm82
Status: ✅ Fresh user created
```

### **For Testing (Team Lead):**

```
Email: tl@test.com
Password: testpassword123
Role: TEAM_LEAD
Employee ID: TL001
Firebase UID: A1oMP6KKndOEeOrxuE1HUw0OxVH2
Status: ✅ Fresh user created
```

---

## 📋 **ALL USERS IN SYSTEM**

### **Test Users (Created via /api/auth/test-user):**

| Email | Password | Role | UID | Status |
|-------|----------|------|-----|--------|
| `advisor.new@test.com` | `testpassword123` | CUSTOMER_ADVISOR | pb2cL18d3HbcNdIUGoKtfbKToE32 | ✅ Active (Nov 9) |
| `admin.new@test.com` | `testpassword123` | ADMIN | q1pAC6uCRhTkNTYkxzRQ0puFPG03 | ✅ Active (Nov 9) |
| `test1@test.com` | `Test123456` | GENERAL_MANAGER | wLkW2zFsnNOTCT3q84zUNXikJfs2 | ✅ Active (Nov 9) |

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

### Expo App (Customer Advisor):
```
Email: advisor@test.com
Password: testpassword123
```

### Admin Dashboard:
```
Email: admin@test.com
Password: testpassword123
```

### General Manager (Testing):
```
Email: gm@test.com
Password: testpassword123
```

### Sales Manager (Testing):
```
Email: sm@test.com
Password: testpassword123
```

### Team Lead (Testing):
```
Email: tl@test.com
Password: testpassword123
```

**All credentials are VERIFIED WORKING!** ✅

---

## 🔧 **RESET PASSWORDS**

If you forget a password, reset it using the backend:

```bash
npx ts-node scripts/reset-firebase-user-password.ts <email> <new-password>
```

**Examples:**
```bash
npx ts-node scripts/reset-firebase-user-password.ts test1@test.com Test123456
npx ts-node scripts/reset-firebase-user-password.ts advisor.new@test.com testpassword123
```

---

## 🔍 **CHECK USER EXISTS**

Verify a user exists in Firebase:

```bash
npx ts-node scripts/check-firebase-user.ts <email>
```

**Example:**
```bash
npx ts-node scripts/check-firebase-user.ts test1@test.com
```

---

## 📚 **TROUBLESHOOTING**

See `FIREBASE_LOGIN_TROUBLESHOOTING.md` for:
- Why "auth/invalid-credential" errors occur
- How to verify Expo app Firebase config
- Complete diagnostic checklist

