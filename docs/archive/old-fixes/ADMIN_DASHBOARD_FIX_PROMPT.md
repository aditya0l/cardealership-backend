# 🔧 ADMIN DASHBOARD FIX - COMPLETE PROMPT

**Copy this entire prompt and use in automotiveDashboard workspace (Agent Mode)**

---

I need to fix my React admin dashboard to work with the deployed backend at `https://automotive-backend-frqe.onrender.com`. Please make the following changes:

## **CHANGE 1: Update API Base URL** 🔴 CRITICAL

**File:** `src/api/client.ts`  
**Line:** 12

**FROM:**
```typescript
baseURL: import.meta.env.VITE_API_BASE_URL || 'http://10.69.245.247:4000/api',
```

**TO:**
```typescript
baseURL: import.meta.env.VITE_API_BASE_URL || 'https://automotive-backend-frqe.onrender.com/api',
```

---

## **CHANGE 2: Fix Login Page Refresh Issue** 🔴 CRITICAL

**File:** `src/pages/LoginPage.tsx`

Add `type="button"` attribute to THREE demo login buttons to prevent form submission:

### **Line 169 - Add type="button":**

**FROM:**
```typescript
<Button
  variant="contained"
  fullWidth
  onClick={() => handleDemoLogin('admin.new@test.com', 'testpassword123')}
  disabled={loading}
```

**TO:**
```typescript
<Button
  type="button"
  variant="contained"
  fullWidth
  onClick={() => handleDemoLogin('admin.new@test.com', 'testpassword123')}
  disabled={loading}
```

### **Line 186 - Add type="button":**

**FROM:**
```typescript
<Button
  variant="outlined"
  fullWidth
  onClick={() => handleDemoLogin('admin@cardealership.com', 'Admin123!')}
  disabled={loading}
```

**TO:**
```typescript
<Button
  type="button"
  variant="outlined"
  fullWidth
  onClick={() => handleDemoLogin('admin@dealership.com', 'testpassword123')}
  disabled={loading}
```

### **Line 200 - Add type="button":**

**FROM:**
```typescript
<Button
  variant="outlined"
  fullWidth
  onClick={() => handleDemoLogin('advisor.new@test.com', 'testpassword123')}
  disabled={loading}
```

**TO:**
```typescript
<Button
  type="button"
  variant="outlined"
  fullWidth
  onClick={() => handleDemoLogin('advisor.new@test.com', 'testpassword123')}
  disabled={loading}
```

---

## **CHANGE 3: Update Credentials Display** 🟡 OPTIONAL

**File:** `src/pages/LoginPage.tsx`

### **Line 224 - Update admin credentials text:**

**FROM:**
```typescript
<strong>Alt Admin:</strong> admin@cardealership.com / Admin123!
```

**TO:**
```typescript
<strong>Alt Admin:</strong> admin@dealership.com / testpassword123
```

---

## **CHANGE 4: Verify Enquiry Categories** 🟡 OPTIONAL

**File:** `src/utils/constants.ts`  
**Lines:** ~114-118

**Ensure it has ONLY these three categories:**

```typescript
export const ENQUIRY_CATEGORIES = [
  { value: 'HOT', label: 'Hot (High Priority)' },
  { value: 'LOST', label: 'Lost' },
  { value: 'BOOKED', label: 'Booked (Converted)' }
];
```

**If it has WARM, COLD, or ALL - remove them.**

---

## ✅ **EXPECTED RESULT:**

After these changes:
1. ✅ Login page won't refresh when clicking demo buttons
2. ✅ Dashboard connects to deployed backend
3. ✅ Can test with correct credentials
4. ✅ All API calls go to production backend

---

## 🔑 **WORKING CREDENTIALS:**

```
Primary Admin:
  Email: admin.new@test.com
  Password: testpassword123
  Role: ADMIN
  
Alternative Admin:
  Email: admin@dealership.com
  Password: testpassword123
  Role: ADMIN
  
Test Advisor:
  Email: advisor.new@test.com
  Password: testpassword123
  Role: CUSTOMER_ADVISOR
```

**Note:** These users exist in the database. You also need to create them in Firebase Authentication (see instructions below).

---

Please apply all these changes to the admin dashboard.

