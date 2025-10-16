# 📋 Booking Advisor Assignment - Complete Guide

## 🎯 **Overview**

Your system **ALREADY HAS** 3 different ways to assign bookings to advisors:

1. ✅ **Bulk Import with Advisor Assignment** (Excel upload)
2. ✅ **Manual Single Booking Assignment** (API endpoint)
3. ✅ **Auto-Assignment** (When advisors convert enquiries)

---

## 📊 **METHOD 1: Bulk Import with Advisor Assignment**

### **How It Works:**

When uploading bookings via Excel, you can include an `advisor_id` or `employee_login` column to automatically assign bookings to specific advisors.

### **Excel Format:**

```excel
| customer_name | customer_phone | variant      | advisor_id (or employee_login) |
|---------------|----------------|--------------|--------------------------------|
| John Doe      | +91 9876543210 | Nexon XZ+    | ADV001                         |
| Jane Smith    | +91 9876543211 | Safari XZ    | advisor@test.com               |
| Bob Johnson   | +91 9876543212 | Harrier XZ   | gpJDwdJlvacGUACQOFbt4Fibtbo1   |
```

### **Supported Advisor Identifiers:**

1. **Firebase UID** (most reliable):
   ```
   gpJDwdJlvacGUACQOFbt4Fibtbo1
   ```

2. **Employee Login/Email**:
   ```
   advisor@test.com
   ```

3. **Employee ID**:
   ```
   ADV001
   ```

### **Backend Logic:**

```typescript
// From: src/services/booking-import.service.ts (lines 338-360)

// Look up advisor if employee_login or advisor_id provided
let advisorId = undefined;

// If advisor_id is directly provided (Firebase UID), use it
if (row.advisor_id) {
  advisorId = row.advisor_id;
} 
// Otherwise, look up by employee_login
else if (row.employee_login) {
  const advisor = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: { contains: row.employee_login, mode: 'insensitive' } },
        { name: { contains: row.emp_name || '', mode: 'insensitive' } }
      ],
      role: { name: RoleName.CUSTOMER_ADVISOR }
    }
  });
  
  if (advisor) {
    advisorId = advisor.firebaseUid;
  }
}
```

### **API Endpoint:**

```bash
POST /api/bookings/import/upload
Content-Type: multipart/form-data

Form Data:
  file: bookings.xlsx
```

**Required Permissions:** ADMIN, GENERAL_MANAGER

---

## 📊 **METHOD 2: Manual Single Booking Assignment**

### **How It Works:**

Admins and managers can assign or reassign bookings to specific advisors one at a time.

### **API Endpoint:**

```bash
PATCH /api/bookings/:bookingId/assign

Headers:
  Authorization: Bearer <admin-token>
  Content-Type: application/json

Body:
{
  "advisorId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",  // Firebase UID
  "reason": "Assigning to John for follow-up"   // Optional
}
```

### **Response:**

```json
{
  "success": true,
  "message": "Advisor assigned successfully",
  "data": {
    "booking": {
      "id": "booking_id",
      "customerName": "John Doe",
      "advisorId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
      "status": "IN_PROGRESS"
    }
  }
}
```

### **What Happens:**

1. ✅ Validates advisor exists and has CUSTOMER_ADVISOR role
2. ✅ Updates `booking.advisorId` to the new advisor
3. ✅ Changes booking status to `IN_PROGRESS`
4. ✅ Creates audit log entry (who assigned, when, why)

### **Required Permissions:**

- ADMIN ✅
- GENERAL_MANAGER ✅
- SALES_MANAGER ✅
- TEAM_LEAD ✅

### **Code Location:**

`src/controllers/booking-import.controller.ts` (lines 439-503)

---

## 📊 **METHOD 3: Auto-Assignment (Enquiry Conversion)**

### **How It Works:**

When an advisor converts their enquiry to a booking, the advisor is automatically assigned to that booking.

### **Flow:**

```
1. Advisor creates enquiry
   POST /api/enquiries
   Body: { customerName, variant, category: "HOT" }
   ↓
2. Enquiry saved with createdByUserId = advisor's UID
   ↓
3. Advisor converts to booking
   PUT /api/enquiries/:id
   Body: { category: "BOOKED" }
   ↓
4. Backend automatically:
   - Creates booking
   - Sets advisorId = current logged-in advisor
   - Links to original enquiry
   - Updates enquiry status to CLOSED
```

### **API Example:**

```bash
# Step 1: Create enquiry
POST /api/enquiries
Authorization: Bearer <advisor-token>

{
  "customerName": "John Doe",
  "customerPhone": "+91 9876543210",
  "variant": "Tata Nexon XZ+",
  "category": "HOT"
}

# Step 2: Convert to booking (auto-assigns to current advisor)
PUT /api/enquiries/:enquiryId
Authorization: Bearer <advisor-token>

{
  "category": "BOOKED"
}
```

---

## 🔧 **RECOMMENDED: Bulk Assignment Feature**

Currently, you can assign bookings one-by-one or via Excel upload. Let me add a **BULK ASSIGNMENT** feature to assign multiple bookings to an advisor at once!

### **New Endpoint:**

```bash
POST /api/bookings/bulk-assign

Headers:
  Authorization: Bearer <admin-token>
  Content-Type: application/json

Body:
{
  "bookingIds": ["booking1", "booking2", "booking3"],
  "advisorId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
  "reason": "Weekly assignment batch"
}
```

**Benefits:**
- ✅ Assign multiple bookings to one advisor in one request
- ✅ Useful for distributing unassigned bookings
- ✅ Faster than calling assign endpoint multiple times

---

## 📋 **Excel Template for Bulk Import with Advisor Assignment**

### **Required Columns:**

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| customer_name | ✅ Yes | Customer full name | John Doe |
| customer_phone | ✅ Yes | Phone with country code | +91 9876543210 |
| customer_email | ❌ Optional | Customer email | john@gmail.com |
| variant | ✅ Yes | Vehicle variant | Tata Nexon XZ+ |
| vc_code | ❌ Optional | Variant code | NXN-XZP-01 |
| color | ❌ Optional | Vehicle color | Pearl White |
| fuel_type | ❌ Optional | Petrol/Diesel | Petrol |
| transmission | ❌ Optional | Manual/Automatic | Manual |
| advisor_id | ❌ Optional | **Advisor Firebase UID** | gpJDwdJlvacGUACQOFbt4Fibtbo1 |
| employee_login | ❌ Optional | **Advisor email** | advisor@test.com |
| booking_date | ❌ Optional | Booking date | 2025-01-15 |
| status | ❌ Optional | Booking status | PENDING |

### **Sample Excel Data:**

```excel
customer_name	customer_phone	variant	advisor_id
John Doe	+91 9876543210	Tata Nexon XZ+	gpJDwdJlvacGUACQOFbt4Fibtbo1
Jane Smith	+91 9876543211	Tata Safari XZ	a0oYxDBwyDdX4U3KdmydXEU64E43
Bob Johnson	+91 9876543212	Tata Harrier XZ	gpJDwdJlvacGUACQOFbt4Fibtbo1
```

**Notes:**
- If `advisor_id` is empty, booking is created as **unassigned**
- Admin can assign later using `PATCH /api/bookings/:id/assign`

---

## 🎯 **How to Get Advisor IDs**

### **Option 1: Via API**

```bash
GET /api/auth/users?role=CUSTOMER_ADVISOR

Response:
{
  "success": true,
  "data": {
    "users": [
      {
        "firebaseUid": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
        "name": "Aditya jaif",
        "email": "adityajaif2004@gmail.com",
        "employeeId": "ADV001",
        "role": { "name": "CUSTOMER_ADVISOR" }
      },
      {
        "firebaseUid": "a0oYxDBwyDdX4U3KdmydXEU64E43",
        "name": "customer advisor",
        "email": "ca@test.com",
        "employeeId": "ADV003",
        "role": { "name": "CUSTOMER_ADVISOR" }
      }
    ]
  }
}
```

### **Option 2: Via Database Query**

```sql
SELECT 
  "firebaseUid" as advisor_id,
  email,
  name,
  employee_id
FROM users u
JOIN roles r ON u."roleId" = r.id
WHERE r.name = 'CUSTOMER_ADVISOR';
```

### **Option 3: From Admin Dashboard**

Navigate to **Employees** page and copy the advisor's ID from the list.

---

## 🚀 **Implementation: Bulk Assignment Endpoint**

Would you like me to implement the **bulk assignment** feature? It would allow you to:

1. Select multiple unassigned bookings in the dashboard
2. Click "Assign to Advisor"
3. Choose an advisor from dropdown
4. All selected bookings assigned at once

**Benefits:**
- ✅ Faster than one-by-one assignment
- ✅ Better for distributing leads among team
- ✅ Audit trail for bulk assignments

---

## 📊 **Current Status Summary**

| Feature | Status | Endpoint | Permissions |
|---------|--------|----------|-------------|
| Bulk Import with Assignment | ✅ **Working** | POST /api/bookings/import/upload | Admin, GM |
| Single Booking Assignment | ✅ **Working** | PATCH /api/bookings/:id/assign | Admin, GM, SM, TL |
| Auto-Assignment (Enquiry) | ✅ **Working** | PUT /api/enquiries/:id | All Advisors |
| Bulk Assignment | ❌ **Not Yet** | - | - |
| Reassignment | ✅ **Working** | PATCH /api/bookings/:id/assign | Admin, GM, SM, TL |
| Unassign Booking | ❌ **Not Yet** | - | - |

---

## 🎯 **RECOMMENDED NEXT STEPS**

### **1. Add Bulk Assignment Feature**

Allow assigning multiple bookings at once:

```typescript
POST /api/bookings/bulk-assign
Body: {
  bookingIds: ["id1", "id2", "id3"],
  advisorId: "firebase_uid"
}
```

### **2. Add Unassign Feature**

Allow removing advisor from booking:

```typescript
PATCH /api/bookings/:id/unassign
Body: {
  reason: "Customer requested different advisor"
}
```

### **3. Add Auto-Assignment Rules**

Implement round-robin or load-based assignment:

```typescript
POST /api/bookings/auto-assign
Body: {
  bookingIds: ["id1", "id2", "id3"],
  strategy: "ROUND_ROBIN" | "LEAST_LOAD" | "RANDOM"
}
```

### **4. Dashboard Features**

- ✅ View unassigned bookings
- ✅ Bulk select and assign
- ✅ Advisor load dashboard (how many bookings each advisor has)
- ✅ Reassignment history

---

## 📞 **WHAT DO YOU WANT?**

Please tell me:

1. **Do you want me to implement bulk assignment?** (assign multiple bookings at once)
2. **Do you want me to create an Excel template?** (for bulk import with advisor assignment)
3. **Do you want auto-assignment rules?** (round-robin distribution)
4. **Do you want dashboard UI changes?** (to show assignment features)

Let me know and I'll implement it! 🚀

