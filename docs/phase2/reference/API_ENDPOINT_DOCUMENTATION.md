# API Endpoint Documentation

Complete API documentation for the endpoints currently returning 400 errors.

---

## 🔐 Authentication

**All endpoints require authentication via Firebase JWT token.**

### Headers Required:
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
Content-Type: application/json
```

### Authentication Middleware:
- Extracts user from Firebase token
- Automatically sets `req.user` with user information including:
  - `firebaseUid`: Firebase user ID
  - `email`: User email
  - `name`: User name
  - `role`: User role (ADMIN, GENERAL_MANAGER, SALES_MANAGER, TEAM_LEAD, CUSTOMER_ADVISOR)
  - `dealershipId`: User's dealership ID (automatically filtered)
  - `employeeId`: Employee ID

---

## 📋 Endpoint: GET `/api/enquiries`

### Description
Retrieves a paginated list of enquiries with optional filtering.

### Route
```
GET /api/enquiries
```

### Authentication
✅ **Required** - All authenticated users can access

### Query Parameters

| Parameter | Type | Required | Default | Description | Valid Values |
|-----------|------|----------|---------|-------------|--------------|
| `page` | number | No | `1` | Page number for pagination | Any positive integer |
| `limit` | number | No | `10` | Number of items per page | Any positive integer |
| `status` | string | No | - | Filter by enquiry status | `OPEN`, `IN_PROGRESS`, `CLOSED` |
| `category` | string | No | - | Filter by enquiry category | `HOT`, `LOST`, `BOOKED` |

### Role-Based Filtering

- **CUSTOMER_ADVISOR**: Only sees enquiries they created
- **Other roles**: See all enquiries in their dealership (if `dealershipId` is set)

### Request Example
```bash
curl -X GET "http://localhost:4000/api/enquiries?limit=100&page=1&status=OPEN" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Enquiries retrieved successfully",
  "data": {
    "enquiries": [
      {
        "id": "string",
        "customerName": "string",
        "customerContact": "string",
        "customerEmail": "string",
        "model": "string",
        "variant": "string",
        "color": "string",
        "source": "WALK_IN",
        "expectedBookingDate": "2024-01-01T00:00:00.000Z",
        "category": "HOT",
        "status": "OPEN",
        "assignedTo": {
          "firebaseUid": "string",
          "name": "string",
          "email": "string"
        },
        "createdBy": {
          "firebaseUid": "string",
          "name": "string",
          "email": "string"
        },
        "_count": {
          "bookings": 0,
          "quotations": 0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 50,
      "totalPages": 1
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Category
```json
{
  "success": false,
  "message": "Invalid category. Must be HOT, LOST, or BOOKED"
}
```

#### 400 Bad Request - Database Error
```json
{
  "success": false,
  "message": "Failed to fetch enquiries: <error message>"
}
```

#### 401 Unauthorized - Missing/Invalid Token
```json
{
  "success": false,
  "message": "Firebase ID token required"
}
```

---

## 📅 Endpoint: GET `/api/dashboard/booking-plan/today`

### Description
Retrieves today's booking plan including enquiries due for booking and bookings due for delivery.

### Route
```
GET /api/dashboard/booking-plan/today
```

### Authentication
✅ **Required** - All authenticated users can access

### Query Parameters
**None** - All parameters are derived from:
- Current date (automatically set to today)
- User's `dealershipId` (from authentication)
- User's role (for filtering)

### Role-Based Filtering

- **CUSTOMER_ADVISOR**: Only sees their own enquiries/bookings
- **TEAM_LEAD**: Sees enquiries/bookings from their team members
- **SALES_MANAGER/GENERAL_MANAGER**: Sees enquiries/bookings from their team
- **ADMIN**: Sees all enquiries/bookings in the dealership

### Request Example
```bash
curl -X GET "http://localhost:4000/api/dashboard/booking-plan/today" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Today's booking plan retrieved successfully",
  "data": {
    "date": "2024-01-01T00:00:00.000Z",
    "enquiriesDueToday": 5,
    "bookingsDueToday": 3,
    "enquiries": [
      {
        "id": "string",
        "customerName": "string",
        "customerContact": "string",
        "model": "string",
        "variant": "string",
        "expectedBookingDate": "2024-01-01T00:00:00.000Z",
        "assignedToUserId": "string",
        "createdByUserId": "string"
      }
    ],
    "bookings": [
      {
        "id": "string",
        "customerName": "string",
        "customerPhone": "string",
        "variant": "string",
        "expectedDeliveryDate": "2024-01-01T00:00:00.000Z",
        "advisorId": "string",
        "stockAvailability": "VNA",
        "chassisNumber": "string",
        "allocationOrderNumber": "string"
      }
    ]
  }
}
```

### Filter Criteria

#### Enquiries Included:
- Status: `OPEN`
- `expectedBookingDate`: Today (between start and end of day)
- `dealershipId`: Matches user's dealership (if set)

#### Bookings Included:
- Status: Not `CANCELLED` or `DELIVERED`
- `expectedDeliveryDate`: Today (between start and end of day)
- `dealershipId`: Matches user's dealership (if set)

### Error Responses

#### 400 Bad Request - Database Error
```json
{
  "success": false,
  "message": "Failed to fetch booking plan: <error message>"
}
```

#### 401 Unauthorized - Missing/Invalid Token
```json
{
  "success": false,
  "message": "Firebase ID token required"
}
```

---

## 📊 Endpoint: GET `/api/remarks/pending/summary`

### Description
Retrieves a summary of pending updates (enquiries and bookings) that need remarks added today.

### Route
```
GET /api/remarks/pending/summary
```

### Authentication
✅ **Required** - All authenticated users can access

### Query Parameters
**None** - All parameters are derived from:
- Current date (automatically set to today)
- User's `dealershipId` (from authentication)
- User's role (for filtering)

### Role-Based Filtering

- **CUSTOMER_ADVISOR**: Only sees their own enquiries/bookings
- **TEAM_LEAD**: Sees enquiries/bookings from their team members
- **SALES_MANAGER/GENERAL_MANAGER**: Sees enquiries/bookings from their team
- **ADMIN**: Sees all enquiries/bookings in the dealership

### Request Example
```bash
curl -X GET "http://localhost:4000/api/remarks/pending/summary" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Pending updates summary retrieved successfully",
  "data": {
    "date": "2024-01-01T00:00:00.000Z",
    "enquiriesPendingCount": 5,
    "bookingsPendingCount": 3,
    "pendingEnquiryIds": ["id1", "id2", "id3"],
    "pendingBookingIds": ["id1", "id2"]
  }
}
```

### Filter Criteria

#### Enquiries Included:
- Status: `OPEN`
- `nextFollowUpDate`: `null` OR `<= end of today`
- `dealershipId`: Matches user's dealership (if set)
- **Not** completed: User has NOT added a remark today for this enquiry

#### Bookings Included:
- Status: Not `CANCELLED` or `DELIVERED`
- `nextFollowUpDate`: `null` OR `<= end of today`
- `dealershipId`: Matches user's dealership (if set)
- **Not** completed: User has NOT added a remark today for this booking

### Error Responses

#### 400 Bad Request - Database Error
```json
{
  "success": false,
  "message": "Failed to fetch pending summary: <error message>"
}
```

#### 401 Unauthorized - Missing/Invalid Token
```json
{
  "success": false,
  "message": "Firebase ID token required"
}
```

---

## ⚠️ Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error message description",
  "details": {} // Optional - only for Prisma errors
}
```

### Common Error Status Codes

| Status Code | Description | Common Causes |
|------------|-------------|---------------|
| `400` | Bad Request | Invalid parameters, validation errors, database errors |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `500` | Internal Server Error | Unexpected server errors |

### Error Response Examples

#### Prisma Validation Error (400)
```json
{
  "success": false,
  "message": "Invalid data provided"
}
```

#### Foreign Key Constraint (400)
```json
{
  "success": false,
  "message": "Foreign key constraint failed",
  "details": {
    "field_name": "dealershipId"
  }
}
```

#### Missing Authentication (401)
```json
{
  "success": false,
  "message": "Firebase ID token required"
}
```

#### Token Expired (401)
```json
{
  "success": false,
  "message": "Token expired"
}
```

#### Route Not Found (404)
```json
{
  "success": false,
  "message": "Route /api/invalid/endpoint not found"
}
```

---

## 🧪 Testing Endpoints

### Get Authentication Token

First, login to get a Firebase ID token:

```bash
curl -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "testpassword123"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "FIREBASE_ID_TOKEN_HERE",
    "user": { ... }
  }
}
```

### Test Enquiries Endpoint

```bash
# Get first 100 enquiries
curl -X GET "http://localhost:4000/api/enquiries?limit=100" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN_HERE" \
  -H "Content-Type: application/json"

# Get OPEN enquiries only
curl -X GET "http://localhost:4000/api/enquiries?status=OPEN&limit=50" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN_HERE" \
  -H "Content-Type: application/json"

# Get HOT category enquiries
curl -X GET "http://localhost:4000/api/enquiries?category=HOT&page=1&limit=10" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Test Booking Plan Endpoint

```bash
curl -X GET "http://localhost:4000/api/dashboard/booking-plan/today" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Test Pending Summary Endpoint

```bash
curl -X GET "http://localhost:4000/api/remarks/pending/summary" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## 🔍 Debugging 400 Errors

### Check Backend Logs

When a 400 error occurs, check the backend console for detailed error messages:

```
Error fetching enquiries: <error>
Where clause: { ... }
```

### Common Causes of 400 Errors

1. **Invalid Category Value**
   - Must be one of: `HOT`, `LOST`, `BOOKED`
   - Fix: Validate category before sending request

2. **Prisma Validation Error**
   - Invalid where clause structure
   - Missing required fields in query
   - Fix: Check backend logs for specific field errors

3. **Database Connection Issues**
   - Database not accessible
   - Schema mismatch
   - Fix: Verify database is running and migrations are applied

4. **Missing Dealership ID**
   - User doesn't have `dealershipId` set
   - Fix: Ensure user has a `dealershipId` assigned (required in multi-tenant model)

### Enable Detailed Logging

The backend automatically logs detailed errors in development mode. Check your backend console for:

```
Error fetching enquiries: <error message>
Where clause: { "dealershipId": "...", "status": "OPEN" }
```

---

## 📝 Notes

1. **Dealership Filtering**: All endpoints automatically filter by the authenticated user's `dealershipId`. This ensures multi-tenant data isolation.

2. **Role-Based Access**: Different roles see different data:
   - **CUSTOMER_ADVISOR**: Only their own data
   - **TEAM_LEAD**: Their team's data
   - **MANAGERS**: Their team's data
   - **ADMIN**: All data in their dealership

3. **Pagination**: Use `page` and `limit` query parameters for pagination. Default is `page=1` and `limit=10`.

4. **Date Filtering**: The booking plan and pending summary endpoints automatically use "today" (current date in server timezone).

5. **Empty Results**: If no data matches the filters, endpoints return empty arrays with `success: true`. This is NOT an error.

---

## 🛠️ Frontend Integration Tips

### Handle Empty Results
```typescript
if (response.data.enquiries.length === 0) {
  // Show "No enquiries found" message
  // This is normal, not an error
}
```

### Handle Errors
```typescript
try {
  const response = await api.get('/enquiries?limit=100');
  if (!response.data.success) {
    console.error('API Error:', response.data.message);
    // Show user-friendly error message
  }
} catch (error) {
  if (error.response?.status === 400) {
    // Handle validation errors
    console.error('Validation Error:', error.response.data.message);
  } else if (error.response?.status === 401) {
    // Handle authentication errors - redirect to login
  }
}
```

### Retry Logic
```typescript
// Retry on network errors, but not on 400 errors
if (error.response?.status === 400) {
  // Don't retry - fix the request instead
  showError(error.response.data.message);
} else {
  // Retry network errors
  await retryRequest();
}
```

---

**Last Updated**: 2024-01-01
**Backend Version**: 1.0.0

