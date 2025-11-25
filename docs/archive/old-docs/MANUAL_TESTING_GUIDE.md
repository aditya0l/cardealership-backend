# 🧪 MANUAL END-TO-END TESTING GUIDE

## 📅 Created: October 9, 2025

---

## 🎯 **GOAL: Test Complete Workflow**

Test the flow: **Admin uploads Excel → Bookings created → Advisor sees in Expo app → Advisor updates → Changes reflect everywhere**

---

## 📁 **TEST FILE CREATED**

**Location:** `/Users/adityajaif/car-dealership-backend/fixtures/bulk_import_test.csv`

**Contents:**
- ✅ 25 sample bookings
- ✅ 6 different Tata EV models
- ✅ Mix of colors, zones, regions
- ✅ Finance details
- ✅ Stock availability (VEHICLE_AVAILABLE and VNA)
- ✅ All assigned to advisor: `advisor.new@test.com`

---

## 🔐 **TEST CREDENTIALS**

### **Admin (for uploading file):**
```
Email: admin.new@test.com
Password: testpassword123
Role: ADMIN
UID: p9BTaIFDPgSlYLavxN6VZEEQme23
```

### **Advisor (for Expo app):**
```
Email: advisor.new@test.com
Password: testpassword123
Role: CUSTOMER_ADVISOR
UID: bPqDAnO0o6WGNR4WR19l7TLEz2d2
```

---

## 📝 **STEP-BY-STEP TESTING INSTRUCTIONS**

### **STEP 1: Login as Admin (Postman/cURL)**

```bash
# Method 1: Using cURL
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.new@test.com",
    "password": "testpassword123"
  }'
```

**OR use Postman:**
- Method: POST
- URL: `http://localhost:4000/api/auth/login`
- Body (JSON):
  ```json
  {
    "email": "admin.new@test.com",
    "password": "testpassword123"
  }
  ```

**Copy the `token` from the response** - you'll need it for the next step!

---

### **STEP 2: Upload Bulk Import File**

```bash
# Replace YOUR_ADMIN_TOKEN with the token from Step 1
curl -X POST http://localhost:4000/api/bookings/import/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@/Users/adityajaif/car-dealership-backend/fixtures/bulk_import_test.csv" \
  -F "dealerCode=TATA001"
```

**OR use Postman:**
- Method: POST
- URL: `http://localhost:4000/api/bookings/import/upload`
- Headers:
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`
- Body (form-data):
  - Key: `file` (type: File) → Select `bulk_import_test.csv`
  - Key: `dealerCode` (type: Text) → Value: `TATA001`

**Expected Response:**
```json
{
  "success": true,
  "message": "File uploaded and import job queued successfully",
  "data": {
    "job": {
      "id": "job-id",
      "status": "PROCESSING"
    },
    "import": {
      "id": "import-id",
      "fileName": "bulk_import_test.csv",
      "status": "PROCESSING"
    }
  }
}
```

**⏱️ Wait 5-10 seconds** for the background job to process the file.

---

### **STEP 3: Check Import Status**

```bash
# Replace YOUR_ADMIN_TOKEN and IMPORT_ID
curl -X GET "http://localhost:4000/api/bookings/imports/IMPORT_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "import": {
      "id": "import-id",
      "fileName": "bulk_import_test.csv",
      "status": "COMPLETED",
      "totalRecords": 25,
      "successfulRecords": 25,
      "failedRecords": 0,
      "createdAt": "2025-10-09T10:00:00.000Z"
    }
  }
}
```

**✅ If status is "COMPLETED" → All bookings were created!**

---

### **STEP 4: Verify Bookings Were Created**

```bash
# Get all bookings as admin
curl -X GET "http://localhost:4000/api/bookings?limit=50" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  | python3 -m json.tool
```

**Expected:** You should see 30+ bookings (5 old + 25 new)

---

### **STEP 5: Login as Advisor in Expo App**

**Open your Expo app and:**

1. **Login with:**
   - Email: `advisor.new@test.com`
   - Password: `testpassword123`

2. **Check Bookings Screen:**
   - You should see **30 bookings** (5 old + 25 new)

3. **Check Enquiries Screen:**
   - You should see **5 enquiries**

4. **Filter by Timeline:**
   - "Today" → Bookings with today's dates
   - "Delivery Today" → Bookings to deliver today
   - "Pending Update" → Stale bookings

---

### **STEP 6: Test Advisor Can Update Bookings**

**In Expo app (or via Postman as advisor):**

First, get advisor token:
```bash
# Login as advisor to get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "advisor.new@test.com",
    "password": "testpassword123"
  }'
```

Then update a booking:
```bash
# Replace YOUR_ADVISOR_TOKEN and BOOKING_ID
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer YOUR_ADVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED",
    "advisorRemarks": "Customer confirmed payment - ready for processing",
    "expectedDeliveryDate": "2025-10-20T00:00:00.000Z",
    "financeRequired": true,
    "financerName": "HDFC Bank"
  }'
```

**Expected:** Booking updated successfully!

---

### **STEP 7: Verify Changes in Admin Dashboard**

```bash
# Get the same booking as admin
curl -X GET "http://localhost:4000/api/bookings/BOOKING_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:** You should see:
- ✅ Status: `CONFIRMED`
- ✅ `advisorRemarks`: "Customer confirmed payment..."
- ✅ Updated delivery date

---

### **STEP 8: Check Booking Audit Log (Admin)**

```bash
# View audit trail
curl -X GET "http://localhost:4000/api/bookings/BOOKING_ID/audit" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:** Shows who made changes, when, and what changed!

---

## ✅ **SUCCESS CRITERIA**

- [ ] Admin can login successfully
- [ ] CSV file uploads without errors
- [ ] All 25 bookings created in database
- [ ] Advisor can login to Expo app
- [ ] Advisor sees 30 bookings (5 old + 25 new)
- [ ] Advisor can update booking fields
- [ ] Advisor can add remarks
- [ ] Changes are saved to database
- [ ] Admin can see advisor's changes
- [ ] Audit log tracks all changes

---

## 🚀 **QUICK TEST COMMANDS**

### **Full Test Script (Copy-Paste):**

```bash
# 1. Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin.new@test.com", "password": "testpassword123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

echo "✅ Admin logged in"

# 2. Upload file
IMPORT_RESPONSE=$(curl -s -X POST http://localhost:4000/api/bookings/import/upload \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@/Users/adityajaif/car-dealership-backend/fixtures/bulk_import_test.csv" \
  -F "dealerCode=TATA001")

echo "$IMPORT_RESPONSE" | python3 -m json.tool

# 3. Wait for processing
echo "⏱️  Waiting for import to process..."
sleep 10

# 4. Check status
IMPORT_ID=$(echo "$IMPORT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['import']['id'])")

curl -s "http://localhost:4000/api/bookings/imports/$IMPORT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -m json.tool

# 5. Count total bookings
echo ""
echo "📊 Total bookings in system:"
curl -s "http://localhost:4000/api/bookings?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Total: {d['data']['pagination']['total']}\")"

echo ""
echo "✅ TEST COMPLETE!"
echo ""
echo "🎯 NEXT: Login to Expo app with:"
echo "   Email: advisor.new@test.com"
echo "   Password: testpassword123"
```

---

## 📱 **EXPO APP TESTING**

### **Test Checklist:**

1. **Login Screen:**
   - [ ] Enter `advisor.new@test.com` / `testpassword123`
   - [ ] Login succeeds
   - [ ] Redirects to home screen

2. **Enquiries Screen:**
   - [ ] See 5 enquiries
   - [ ] Filter by category (HOT/LOST/BOOKED)
   - [ ] Create new enquiry
   - [ ] Update enquiry category to BOOKED
   - [ ] Verify auto-conversion to booking

3. **Bookings Screen:**
   - [ ] See 30+ bookings (after bulk import)
   - [ ] Filter by timeline (Today/Delivery Today/etc.)
   - [ ] Open a booking
   - [ ] Update status (PENDING → CONFIRMED)
   - [ ] Add advisor remarks
   - [ ] Update delivery date
   - [ ] Save changes
   - [ ] Verify changes saved

4. **Quotations Screen:**
   - [ ] View quotations (if any)
   - [ ] Check permissions (advisor should have limited access)

---

## 🐛 **TROUBLESHOOTING**

### **If import fails:**
```bash
# Check import errors
curl -X GET "http://localhost:4000/api/bookings/imports/IMPORT_ID/errors" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  > import_errors.csv
  
# Review the errors
cat import_errors.csv
```

### **If advisor can't see bookings:**
```bash
# Verify advisor assignment
node -e "const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.booking.count({ where: { advisorId: 'bPqDAnO0o6WGNR4WR19l7TLEz2d2' } })
  .then(count => console.log('Advisor bookings:', count))
  .finally(() => prisma.\$disconnect());"
```

### **If token expires:**
- Tokens expire after 1 hour
- Generate new token by logging in again

---

## 📊 **EXPECTED RESULTS SUMMARY**

### **After Bulk Import:**
```
Total System Bookings: 30+ (5 existing + 25 new)
Advisor Bookings: 30
Admin Bookings: 30 (can see all)

Total Enquiries: 5
Advisor Enquiries: 5 (only sees their own)
Admin Enquiries: 5 (can see all)
```

### **Vehicle Models in Import:**
1. Tata Harrier EV Adventure (8 bookings)
2. Tata Nexon EV Max (6 bookings)
3. Tata Nexon EV Prime (4 bookings)
4. Tata Punch EV (3 bookings)
5. Tata Tigor EV (3 bookings)
6. Tata Curvv EV (1 booking)

### **Stock Status:**
- VEHICLE_AVAILABLE: 21 bookings
- VNA (Vehicle Not Available): 4 bookings

### **Finance Required:**
- Yes: 18 bookings (with bank names)
- No: 7 bookings

---

## 🎉 **YOU'RE ALL SET!**

**File Location:** `/Users/adityajaif/car-dealership-backend/fixtures/bulk_import_test.csv`

**Upload it using:**
1. Postman (recommended for first test)
2. Admin dashboard web UI (once built)
3. cURL command from above

**Then check Expo app** - you should see all 25 new bookings! ✅

