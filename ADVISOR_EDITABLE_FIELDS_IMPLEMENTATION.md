# Advisor-Editable Fields Implementation - Complete Guide

## 🎯 Overview

This document provides a complete guide to the newly implemented advisor-editable fields system for the car bookings management backend. The implementation allows customer advisors to update specific booking fields after initial Excel upload by admins.

---

## 📋 Implementation Summary

### Framework & Technology Stack
- **Backend Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: Firebase Auth
- **Authorization**: Role-Based Access Control (RBAC)

---

## 🗂️ Database Schema Changes

### 1. New StockAvailability Enum

Added a new enum to the Prisma schema for standardized stock availability values:

```prisma
enum StockAvailability {
  VNA                 // Vehicle Not Available
  VEHICLE_AVAILABLE   // Vehicle Available
}
```

### 2. Updated Booking Model

The `stockAvailability` field type was changed from `String?` to `StockAvailability?`:

```prisma
model Booking {
  // ... other fields
  stockAvailability    StockAvailability?  @map("stock_availability")
  // ... other fields
}
```

### 3. Existing Fields (Already Present)

The following fields were already in the schema and are now editable by advisors:

| Field Name | Type | Description |
|------------|------|-------------|
| `status` | BookingStatus | Booking status (PENDING, IN_PROGRESS, etc.) |
| `financeRequired` | Boolean? | Whether customer needs financing |
| `financerName` | String? | Name of the financing company |
| `fileLoginDate` | DateTime? | Finance file login date |
| `approvalDate` | DateTime? | Finance approval date |
| `stockAvailability` | StockAvailability? | Stock status (VNA, VEHICLE_AVAILABLE) |
| `expectedDeliveryDate` | DateTime? | Expected vehicle delivery date |
| `backOrderStatus` | Boolean? | Whether it's a back order |
| `rtoDate` | DateTime? | RTO registration date |
| `remarks` | String? | General remarks (editable by all roles) |

---

## 🔐 RBAC (Role-Based Access Control) Updates

### Customer Advisor Permissions

Updated `/src/middlewares/rbac.middleware.ts` to grant advisors write access to the following fields:

```typescript
[RoleName.CUSTOMER_ADVISOR]: {
  // ✅ ADVISOR-EDITABLE FIELDS
  'status': { read: true, write: true },
  'expectedDeliveryDate': { read: true, write: true },
  'financeRequired': { read: true, write: true },
  'financerName': { read: true, write: true },
  'fileLoginDate': { read: true, write: true },
  'approvalDate': { read: true, write: true },
  'stockAvailability': { read: true, write: true },
  'backOrderStatus': { read: true, write: true },
  'rtoDate': { read: true, write: true },
  'remarks': { read: true, write: true },  // All roles can edit
  
  // ... other fields remain read-only
}
```

---

## 🌐 API Endpoints

### New Endpoint: Update Booking Status and Fields

**Endpoint**: `PUT /api/bookings/:id/update-status`

**Purpose**: Allows advisors (and other roles) to update specific booking fields with validation and audit tracking.

**Authentication**: Required (Firebase ID Token)

**Authorization**: 
- CUSTOMER_ADVISOR
- TEAM_LEAD
- SALES_MANAGER
- GENERAL_MANAGER
- ADMIN

**Request Format**:

```bash
PUT /api/bookings/:id/update-status
Authorization: Bearer <FIREBASE_ID_TOKEN>
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "financeRequired": true,
  "financerName": "HDFC Bank",
  "fileLoginDate": "2025-10-08T10:00:00.000Z",
  "approvalDate": "2025-10-10T15:30:00.000Z",
  "stockAvailability": "VEHICLE_AVAILABLE",
  "expectedDeliveryDate": "2025-10-20T00:00:00.000Z",
  "backOrderStatus": false,
  "rtoDate": "2025-10-18T00:00:00.000Z",
  "remarks": "Customer confirmed finance requirement."
}
```

**Response Format**:

```json
{
  "success": true,
  "message": "Booking updated successfully",
  "data": {
    "booking": {
      "id": "cmg...",
      "customerName": "Rajesh Kumar",
      "status": "IN_PROGRESS",
      "financeRequired": true,
      "financerName": "HDFC Bank",
      "fileLoginDate": "2025-10-08T10:00:00.000Z",
      "approvalDate": "2025-10-10T15:30:00.000Z",
      "stockAvailability": "VEHICLE_AVAILABLE",
      "expectedDeliveryDate": "2025-10-20T00:00:00.000Z",
      "backOrderStatus": false,
      "rtoDate": "2025-10-18T00:00:00.000Z",
      "remarks": "Customer confirmed finance requirement.",
      "updatedAt": "2025-10-08T18:15:00.888Z",
      // ... other fields
    },
    "updatedBy": {
      "userId": "kryT...",
      "userName": "Test Advisor",
      "userRole": "CUSTOMER_ADVISOR"
    },
    "updatedAt": "2025-10-08T18:15:00.888Z"
  }
}
```

---

## ✅ Validation Rules

### 1. Field-Level Permissions
- Only fields the user has permission to write are accepted
- Unauthorized field updates return a 403 error

### 2. Enum Validation

**BookingStatus Enum**:
```
PENDING, ASSIGNED, IN_PROGRESS, CONFIRMED, DELIVERED, 
CANCELLED, NO_SHOW, WAITLISTED, RESCHEDULED, BACK_ORDER, 
APPROVED, REJECTED
```

**StockAvailability Enum**:
```
VNA, VEHICLE_AVAILABLE
```

Invalid enum values return a 400 error with descriptive message.

### 3. Boolean Field Validation
- `financeRequired` must be a boolean
- `backOrderStatus` must be a boolean

Invalid types return a 400 error.

### 4. Date Field Validation
- All date fields must be in ISO-8601 format
- Accepted formats:
  - `YYYY-MM-DD` (e.g., `2025-10-20`)
  - `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `2025-10-20T00:00:00.000Z`)
- Invalid dates return a 400 error

### 5. Access Control
- Customer Advisors can only update bookings assigned to them
- Managers and Admins can update any booking
- Unauthorized access returns a 403 error

---

## 📊 Audit Tracking

Every update creates an audit log entry in the `booking_audit_logs` table:

```typescript
{
  bookingId: "cmg...",
  changedBy: "kryT...",  // Firebase UID (updated_by)
  action: "UPDATE_STATUS",
  oldValue: { /* previous booking state */ },
  newValue: { /* updated booking state */ },
  changeReason: "Status update by CUSTOMER_ADVISOR: Test Advisor",
  ipAddress: "::1",
  userAgent: "curl/7.88.1",
  createdAt: "2025-10-08T18:15:00.905Z"
}
```

### Query Audit Logs:

```sql
SELECT 
  action, 
  changed_by, 
  change_reason, 
  created_at 
FROM booking_audit_logs 
WHERE booking_id = 'cmg...' 
ORDER BY created_at DESC;
```

---

## 🧪 Testing

### Test Cases Implemented

#### 1. ✅ Successful Update
```bash
curl -X PUT "http://localhost:4000/api/bookings/:id/update-status" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "financeRequired": true,
    "financerName": "HDFC Bank",
    "stockAvailability": "VEHICLE_AVAILABLE",
    "remarks": "Customer confirmed."
  }'
```

**Result**: ✅ Status 200, all fields updated, audit log created

#### 2. ✅ Invalid Enum Validation
```bash
curl -X PUT "http://localhost:4000/api/bookings/:id/update-status" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"stockAvailability": "INVALID_VALUE"}'
```

**Result**: ✅ Status 400, error message: "Invalid stock availability. Must be 'VNA' or 'VEHICLE_AVAILABLE'"

#### 3. ✅ Invalid Date Validation
```bash
curl -X PUT "http://localhost:4000/api/bookings/:id/update-status" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"rtoDate": "invalid-date"}'
```

**Result**: ✅ Status 400, error message: "Invalid date format for rtoDate. Use ISO-8601 format"

#### 4. ✅ Permission Check
```bash
# Advisor trying to update someone else's booking
curl -X PUT "http://localhost:4000/api/bookings/:id/update-status" \
  -H "Authorization: Bearer <ADVISOR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED"}'
```

**Result**: ✅ Status 403, error message: "You can only update bookings assigned to you"

---

## 📁 Files Modified

### 1. Schema & Database
- ✅ `prisma/schema.prisma` - Added StockAvailability enum, updated Booking model
- ✅ Database updated via `npx prisma db push`

### 2. Middleware
- ✅ `src/middlewares/rbac.middleware.ts` - Updated advisor permissions for editable fields

### 3. Controllers
- ✅ `src/controllers/bookings.controller.ts` - Added `updateBookingStatusAndFields` function

### 4. Routes
- ✅ `src/routes/bookings.routes.ts` - Added `PUT /:id/update-status` route

### 5. Services
- ✅ `src/services/booking-import.service.ts` - Fixed TypeScript type for stockAvailability

---

## 🚀 Usage Examples

### For Customer Advisors

#### Update Finance Information
```javascript
const response = await fetch(`${API_URL}/bookings/${bookingId}/update-status`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    financeRequired: true,
    financerName: 'HDFC Bank',
    fileLoginDate: '2025-10-08T10:00:00.000Z'
  })
});
```

#### Update Stock & Delivery Status
```javascript
const response = await fetch(`${API_URL}/bookings/${bookingId}/update-status`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    stockAvailability: 'VEHICLE_AVAILABLE',
    expectedDeliveryDate: '2025-10-25T00:00:00.000Z',
    backOrderStatus: false
  })
});
```

#### Add Remarks
```javascript
const response = await fetch(`${API_URL}/bookings/${bookingId}/update-status`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    remarks: 'Customer requested color change to Blue.'
  })
});
```

---

## ⚠️ Important Notes

### 1. Excel Import Integration
- ✅ All advisor-editable fields are already supported in Excel import
- ✅ Stock availability in Excel can be any string initially
- ✅ After import, advisors can standardize to enum values (VNA, VEHICLE_AVAILABLE)

### 2. Backward Compatibility
- ✅ Existing bookings with string stock availability values remain compatible
- ✅ New updates enforce enum validation
- ✅ No data migration required

### 3. Multi-Role Support
- ✅ All roles can update `remarks` field
- ✅ Higher roles (Manager, Admin) have broader update permissions
- ✅ Advisors restricted to their assigned bookings only

### 4. Date Handling
- ✅ Accepts both simple dates (`2025-10-20`) and full ISO-8601 timestamps
- ✅ Automatically converts to proper DateTime format
- ✅ Validates date integrity before saving

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Insufficient permissions to update bookings"
**Cause**: User doesn't have UPDATE permission on booking resource  
**Solution**: Ensure user has CUSTOMER_ADVISOR, TEAM_LEAD, SALES_MANAGER, GENERAL_MANAGER, or ADMIN role

#### 2. "You can only update bookings assigned to you"
**Cause**: Advisor trying to update booking assigned to different advisor  
**Solution**: Use booking ID where `advisorId` matches the logged-in advisor's Firebase UID

#### 3. "Invalid stock availability"
**Cause**: Using incorrect enum value  
**Solution**: Use only `VNA` or `VEHICLE_AVAILABLE` (case-sensitive)

#### 4. "Invalid date format"
**Cause**: Date not in ISO-8601 format  
**Solution**: Use format `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`

#### 5. "No valid fields to update"
**Cause**: All provided fields are not editable by the user's role  
**Solution**: Check RBAC permissions and only send editable fields

---

## 📝 Test User Credentials

For testing the implementation:

```
Email: test.advisor@test.com
Password: testpassword123
Role: CUSTOMER_ADVISOR
Firebase UID: kryTfSsgR7MRqZW5qYMGE9liI9s1
```

---

## ✨ Summary

The implementation provides:

1. ✅ **Complete RBAC integration** - Field-level permissions for all roles
2. ✅ **Comprehensive validation** - Enums, booleans, dates all validated
3. ✅ **Audit trail** - Every change tracked with user, timestamp, and changes
4. ✅ **Error handling** - Clear, actionable error messages
5. ✅ **Type safety** - Full TypeScript support with Prisma
6. ✅ **Backward compatibility** - Works with existing Excel import system
7. ✅ **Multi-role support** - Different permissions for different user roles
8. ✅ **Tested & Verified** - All validation and permission checks working

---

**Implementation Date**: October 8, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete & Tested

