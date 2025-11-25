# Quick Fix Guide for 400 Errors

## 📋 Summary of Endpoints

### 1. GET `/api/enquiries?limit=100`

**Status**: ✅ Should work - no required parameters

**Query Parameters** (all optional):
- `limit`: number (default: 10) - ✅ `100` is valid
- `page`: number (default: 1)
- `status`: `OPEN` | `IN_PROGRESS` | `CLOSED`
- `category`: `HOT` | `LOST` | `BOOKED`

**Expected Response**:
```json
{
  "success": true,
  "message": "Enquiries retrieved successfully",
  "data": {
    "enquiries": [...],
    "pagination": { ... }
  }
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "Failed to fetch enquiries: <error details>"
}
```

**Common Issues**:
- Invalid `category` value (must be HOT, LOST, or BOOKED)
- Database query error (check backend logs)
- Missing `dealershipId` (user doesn't have dealership assigned)

---

### 2. GET `/api/dashboard/booking-plan/today`

**Status**: ✅ Should work - no query parameters needed

**Query Parameters**: None (all derived from auth token)

**Expected Response**:
```json
{
  "success": true,
  "message": "Today's booking plan retrieved successfully",
  "data": {
    "date": "2024-01-01T00:00:00.000Z",
    "enquiriesDueToday": 0,
    "bookingsDueToday": 0,
    "enquiries": [],
    "bookings": []
  }
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "Failed to fetch booking plan: <error details>"
}
```

**Common Issues**:
- Database query error (check backend logs)
- Invalid date handling in Prisma query
- Missing `dealershipId` (user doesn't have dealership assigned)

---

### 3. GET `/api/remarks/pending/summary`

**Status**: ✅ Should work - no query parameters needed

**Query Parameters**: None (all derived from auth token)

**Expected Response**:
```json
{
  "success": true,
  "message": "Pending updates summary retrieved successfully",
  "data": {
    "date": "2024-01-01T00:00:00.000Z",
    "enquiriesPendingCount": 0,
    "bookingsPendingCount": 0,
    "pendingEnquiryIds": [],
    "pendingBookingIds": []
  }
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "Failed to fetch pending summary: <error details>"
}
```

**Common Issues**:
- Database query error (check backend logs)
- Complex where clause failing (check backend logs for "Enquiry where" and "Booking where")
- Missing `dealershipId` (user doesn't have dealership assigned)

---

## 🔍 How to Debug

### Step 1: Check Backend Console

When a 400 error occurs, the backend now logs detailed information:

```
Error fetching enquiries: <error message>
Where clause: { "dealershipId": "...", "status": "OPEN" }
```

### Step 2: Check Error Response Body

In browser console (Network tab), look at the error response:

```json
{
  "success": false,
  "message": "Failed to fetch enquiries: <actual error>"
}
```

### Step 3: Test with curl

Test the endpoint directly:

```bash
# First, get a token by logging in
TOKEN=$(curl -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"testpassword123"}' \
  | jq -r '.data.token')

# Then test the endpoint
curl -X GET "http://localhost:4000/api/enquiries?limit=100" \
  -H "Authorization: Bearer $TOKEN" \
  -v
```

---

## ✅ What Should Work Now

After the recent fixes, these endpoints should work:

1. ✅ **Fixed**: Removed invalid `orderBy` syntax in groupBy queries
2. ✅ **Fixed**: Added null-safe `dealershipId` handling
3. ✅ **Fixed**: Added detailed error logging

### Expected Behavior

- **Empty Results**: If there's no data, endpoints return empty arrays with `success: true` ✅
- **No Data**: This is NOT an error - just return `[]` ✅
- **Database Errors**: Now logged with detailed information ✅

---

## 🛠️ Frontend Fixes Needed

If 400 errors persist, check:

1. **Request Headers**:
   ```typescript
   headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   }
   ```

2. **Handle Empty Results**:
   ```typescript
   // Empty results are NOT errors
   if (response.data.enquiries.length === 0) {
     // Show "No data" message - this is normal
   }
   ```

3. **Error Handling**:
   ```typescript
   try {
     const response = await api.get('/enquiries?limit=100');
     
     // Check for API-level errors
     if (!response.data.success) {
       console.error('Backend error:', response.data.message);
       // Show user-friendly message
       return;
     }
     
     // Success - use the data
     return response.data.data.enquiries;
   } catch (error) {
     // Network/HTTP errors
     if (error.response?.status === 400) {
       // Check backend console for detailed error
       console.error('400 Error:', error.response.data.message);
       // The backend now logs the actual error details
     }
   }
   ```

---

## 🧪 Test Script

Use this to test all three endpoints:

```bash
#!/bin/bash

# Login and get token
echo "🔐 Logging in..."
TOKEN=$(curl -s -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"testpassword123"}' \
  | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Token obtained"
echo ""

# Test enquiries endpoint
echo "📋 Testing /api/enquiries?limit=100..."
curl -s -X GET "http://localhost:4000/api/enquiries?limit=100" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
echo ""

# Test booking plan endpoint
echo "📅 Testing /api/dashboard/booking-plan/today..."
curl -s -X GET "http://localhost:4000/api/dashboard/booking-plan/today" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
echo ""

# Test pending summary endpoint
echo "📊 Testing /api/remarks/pending/summary..."
curl -s -X GET "http://localhost:4000/api/remarks/pending/summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
echo ""

echo "✅ All tests complete"
```

---

## 🎯 Next Steps

1. **If errors persist**:
   - Check backend console for detailed error logs
   - Share the error message from backend console
   - Check if user has `dealershipId` set (should be `default-dealership-001`)

2. **If endpoints work**:
   - Update frontend to handle empty results gracefully
   - Show user-friendly messages when no data is found
   - Add retry logic for network errors (but not 400 errors)

3. **If you need more help**:
   - Share the exact error message from backend console
   - Share the error response body from browser Network tab
   - Check if database is accessible and migrations are applied

---

## 📞 Quick Support Checklist

- [ ] Backend is running on `http://localhost:4000`
- [ ] Database is connected and migrations are applied
- [ ] User has `dealershipId` set (check with: `npx ts-node -e "import prisma from './src/config/db'; prisma.user.findMany({select:{email:true,dealershipId:true}}).then(u=>console.log(JSON.stringify(u,null,2))).finally(()=>prisma.$disconnect())"`)
- [ ] Firebase token is valid and not expired
- [ ] Backend console shows detailed error logs when 400 occurs

---

**Last Updated**: After recent fixes (removed invalid orderBy, added null-safe dealershipId handling)

