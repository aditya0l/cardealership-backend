# 🔑 Test User Credentials

**Date:** December 6, 2025  
**Status:** ✅ All Users Created Successfully

---

## 📋 Test Users by Role

### **1. ADMIN**
- **Email:** `admin@test.com`
- **Password:** `admin123`
- **Name:** Admin User
- **Employee ID:** ADM001
- **Firebase UID:** `YTPf9tKbZ1dsTYqDBlLc3xzdryo2`
- **Permissions:** Full access to all features

---

### **2. GENERAL_MANAGER**
- **Email:** `gm@test.com`
- **Password:** `gm12345`
- **Name:** General Manager
- **Employee ID:** GM001
- **Firebase UID:** `htwGSGv8DuV6m3vHf8KFK3S03AJ2`
- **Permissions:** 
  - View all enquiries and bookings
  - Manage dealership settings
  - View reports and analytics

---

### **3. SALES_MANAGER**
- **Email:** `sm@test.com`
- **Password:** `sm12345`
- **Name:** Sales Manager
- **Employee ID:** SM001
- **Firebase UID:** `UIETCzR0imYbjJwaNpx98qOOAm82`
- **Manager of:** Team Leads
- **Permissions:**
  - View team enquiries and bookings
  - Manage team leads
  - Receive notifications for escalations (30-35 days, 40+ days)

---

### **4. TEAM_LEAD**
- **Email:** `tl@test.com`
- **Password:** `tl12345` ✅ (Fixed - Role corrected to TEAM_LEAD)
- **Name:** Team Lead
- **Employee ID:** TL001
- **Firebase UID:** `A1oMP6KKndOEeOrxuE1HUw0OxVH2`
- **Role:** TEAM_LEAD ✅ (Fixed in database)
- **Manager:** Sales Manager (sm@test.com)
- **Team Members:** Customer Advisors (ca1, ca2)
- **Status:** ✅ Active, verified, role fixed, and login working
- **Permissions:**
  - View team enquiries and bookings
  - Manage customer advisors
  - Receive notifications for:
    - HOT → BOOKED conversions
    - HOT → LOST conversions
    - 5-day inactivity alerts
    - 20-25 day lead age alerts
    - 15-day post-booking retail delay

---

### **5. CUSTOMER_ADVISOR 1**
- **Email:** `ca1@test.com`
- **Password:** `ca12345`
- **Name:** Customer Advisor 1
- **Employee ID:** CA001
- **Firebase UID:** `lg9fUQGMkbZpQg7HY9XstQBGTeu1`
- **Manager:** Team Lead (tl@test.com)
- **Permissions:**
  - Create and manage own enquiries
  - View only own enquiries and bookings
  - Add remarks to own enquiries
  - Convert enquiries to bookings

---

### **6. CUSTOMER_ADVISOR 2**
- **Email:** `ca2@test.com`
- **Password:** `ca12345`
- **Name:** Customer Advisor 2
- **Employee ID:** CA002
- **Firebase UID:** `vuyMAbfTuwXK6x7iwd1FOjAT9YX2`
- **Manager:** Team Lead (tl@test.com)
- **Permissions:**
  - Create and manage own enquiries
  - View only own enquiries and bookings
  - Add remarks to own enquiries
  - Convert enquiries to bookings

---

## 🎯 Role Hierarchy

```
ADMIN
  └── GENERAL_MANAGER
        └── SALES_MANAGER
              └── TEAM_LEAD
                    ├── CUSTOMER_ADVISOR 1
                    └── CUSTOMER_ADVISOR 2
```

---

## 📱 Login Instructions

### **For Expo App:**

1. Open the Expo app
2. Enter email and password from the table above
3. Select the appropriate role to test

### **For API Testing:**

```bash
# Get auth token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ca1@test.com",
    "password": "ca12345"
  }'

# Use token in subsequent requests
curl -X GET http://localhost:4000/api/enquiries \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔔 Notification Testing

### **Test HOT → BOOKED Notification:**
1. Login as `ca1@test.com`
2. Create an enquiry with category: HOT
3. Change category to BOOKED
4. **Expected:** Team Lead (`tl@test.com`) receives notification

### **Test HOT → LOST Notification:**
1. Login as `ca1@test.com`
2. Create an enquiry with category: HOT
3. Change category to LOST (provide reason)
4. **Expected:** Team Lead (`tl@test.com`) and Sales Manager (`sm@test.com`) receive notifications

---

## 🧪 Testing Scenarios

### **1. Test Source Dropdown Restriction:**
- Login as `ca1@test.com`
- Create enquiry with source: "Showroom Walk-in" ✅
- Try source: "WEBSITE" ❌ (should fail)

### **2. Test Date Validation:**
- Login as `ca1@test.com`
- Create enquiry without EDB ❌ (should fail)
- Create enquiry without Follow-up Date ❌ (should fail)
- Create enquiry with past dates ❌ (should fail)

### **3. Test Locking Logic:**
- Login as `ca1@test.com`
- Create enquiry, mark as BOOKED
- Try to update customer name ❌ (should fail - locked)
- Try to add remark ✅ (should work)

### **4. Test Remarks Limit:**
- Login as `ca1@test.com`
- Create enquiry
- Add 20 remarks ✅
- Try to add 21st remark ❌ (should fail)

---

## 🔄 Recreate Users

If you need to recreate users, run:

```bash
npx ts-node scripts/create-users-by-role.ts
```

## 🔑 Reset Passwords

If login credentials are not working, reset passwords:

```bash
# Reset Team Lead password only
npx ts-node scripts/fix-team-lead-password.ts

# Reset all user passwords
npx ts-node scripts/reset-all-passwords.ts
```

These scripts:
- Creates/updates Firebase users
- Creates/updates database users
- Sets up manager relationships
- Assigns to default dealership
- Resets passwords to default values

---

## 📝 Notes

- All passwords meet Firebase requirements (6+ characters)
- All users are **active** by default
- Users are assigned to the first available dealership
- Manager relationships are set up automatically:
  - TL → reports to SM
  - CA → reports to TL

---

**Last Updated:** December 6, 2025

