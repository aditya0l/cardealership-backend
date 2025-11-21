# Frontend API Integration Guide (Updated November 8, 2025 backend release)

## 1. Authentication & Profile

### `GET /api/auth/profile`
Returns identity, role, and dealership information for the logged-in user.

```json
{
  "success": true,
  "data": {
    "user": {
      "firebaseUid": "UID123",
      "email": "advisor@dealer.com",
      "name": "Sam Advisor",
      "role": { "id": "roleId", "name": "CUSTOMER_ADVISOR" },
      "dealershipId": "7c8d0f28-62d8-4bf9-8a1b-7f24af35ef10",
      "legacyDealershipId": "cmgphfcpi0005abcdef12345",
      "dealershipCode": "CITY01",
      "dealership": {
        "id": "7c8d0f28-62d8-4bf9-8a1b-7f24af35ef10",
        "uuid": "7c8d0f28-62d8-4bf9-8a1b-7f24af35ef10",
        "cuid": "cmgphfcpi0005abcdef12345",
        "legacyId": "cmgphfcpi0005abcdef12345",
        "name": "City Motors",
        "code": "CITY01"
      },
      "isActive": true,
      "employeeId": "ADV001"
    }
  }
}
```

Use this payload for:
- Header display (`Employee Name • Dealership Name • Employee Code`)
- Role-based access (Advisor vs TL/SM/GM/Admin)
- Multi-tenant scoping (use `dealershipId` which is now a UUID); retain `legacyDealershipId` only if you still need the old CUID.

---

## 2. Enquiries

### Create Enquiry — `POST /api/enquiries`

```json
{
  "customerName": "John Doe",
  "customerContact": "+91 9876543210",
  "customerEmail": "optional@example.com",
  "model": "Nexon",
  "variant": "XZ+",
  "color": "Red",
  "source": "DIGITAL",
  "expectedBookingDate": "2025-11-10",
  "caRemarks": "Interested in test drive",
  "assignedToUserId": "advisor-firebase-uid",
  "category": "HOT",
  "dealerCode": "CITY01",
  "location": "Jaipur Showroom",
  "nextFollowUpDate": "2025-11-10"
}
```

**Rules**
- `customerEmail` optional; do not send empty string.
- `expectedBookingDate` (required) must be today or future.
- `nextFollowUpDate` optional; defaults to expected date if omitted.
- `source` allowed values: `WALK_IN`, `PHONE_CALL`, `WEBSITE`, `DIGITAL`, `SOCIAL_MEDIA`, `REFERRAL`, `ADVERTISEMENT`, `EMAIL`, `SHOWROOM_VISIT`, `EVENT`, `BTL_ACTIVITY`, `WHATSAPP`, `OUTBOUND_CALL`, `OTHER`.
- `dealerCode` and `dealershipId` are auto-populated from the authenticated user when omitted.
- `assignedToUserId` must belong to the same dealership.

### Fetch Enquiries — `GET /api/enquiries`

Query parameters: `page`, `limit`, `status`, `category`, etc.  
Response includes `_count` plus new fields (`location`, `nextFollowUpDate`, etc.).

### Enquiry Detail — `GET /api/enquiries/:id`

Includes latest 3 non-cancelled remarks:
```json
"remarkHistory": [
  {
    "id": "rem_456",
    "remark": "Called customer, follow-up tomorrow",
    "remarkType": "follow_up",
    "createdAt": "2025-11-09T07:00:00.000Z",
    "user": {
      "firebaseUid": "uid",
      "name": "Sam Advisor",
      "email": "advisor@dealer.com",
      "role": { "name": "CUSTOMER_ADVISOR" }
    }
  }
]
```

### Update Enquiry — `PUT /api/enquiries/:id`
Send only changed fields. Backend validates expected booking date, next follow-up date, and assignment rules.

### Export Enquiries — `GET /api/enquiries/download?format=excel`
Excel now includes `Location`, `Next Follow Up`, etc.

---

## 3. Remarks

### Add Remark — `POST /api/remarks/enquiry/:id/remarks`
```json
{ "remark": "Spoke with customer", "remarkType": "ca_remarks" }
```
`remarkType` must match user role (`ca_remarks`, `tl_remarks`, `sm_remarks`, `gm_remarks`, `admin_remarks`, etc.)

### Cancel Remark — `POST /api/remarks/remarks/:remarkId/cancel`
```json
{ "reason": "Duplicate entry" }
```
Available to remark owner, TL, SM, GM, Admin (within their team scope). Backend hides cancelled remarks from latest list and updates snapshots.

### Pending Summary — `GET /api/remarks/pending/summary`
```json
{
  "success": true,
  "data": {
    "date": "2025-11-09T00:00:00.000Z",
    "enquiriesPendingCount": 2,
    "bookingsPendingCount": 1,
    "pendingEnquiryIds": ["enq_123", "enq_789"],
    "pendingBookingIds": ["book_456"]
  }
}
```
Use for badges in dashboard/app. Results scoped by role.

### Remarks History — `GET /api/remarks/enquiry/:id/remarks/history`
Supports pagination and optional filters (`startDate`, `endDate`, `remarkType`).

---

## 4. Dashboard

### Today’s Booking Plan — `GET /api/dashboard/booking-plan/today`

```json
{
  "success": true,
  "data": {
    "date": "2025-11-09T00:00:00.000Z",
    "enquiriesDueToday": 2,
    "bookingsDueToday": 1,
    "enquiries": [
      {
        "id": "enq_123",
        "customerName": "John Doe",
        "model": "Nexon",
        "variant": "XZ+",
        "expectedBookingDate": "2025-11-09T00:00:00.000Z",
        "assignedToUserId": "advisor-uid",
        "createdByUserId": "advisor-uid"
      }
    ],
    "bookings": [
      {
        "id": "book_456",
        "customerName": "John Doe",
        "variant": "Nexon XZ+",
        "expectedDeliveryDate": "2025-11-09T00:00:00.000Z",
        "advisorId": "advisor-uid",
        "stockAvailability": "VEHICLE_AVAILABLE",
        "chassisNumber": "CHASSIS123",
        "allocationOrderNumber": null
      }
    ]
  }
}
```

**Notes**
- Results already filtered by role (advisor sees own items, TL/SM see team, GM/Admin see dealership).
- If `stockAvailability` = `VNA`, `chassisNumber` will be `null` and `allocationOrderNumber` will contain the order reference.

---

## 5. Bookings

### Update Advisor Fields — `PUT /api/bookings/:id/update-status`

```json
{
  "status": "IN_PROGRESS",
  "financeRequired": true,
  "financerName": "HDFC",
  "fileLoginDate": "2025-11-09",
  "approvalDate": "2025-11-10",
  "expectedDeliveryDate": "2025-11-12",
  "rtoDate": "2025-11-15",
  "stockAvailability": "VEHICLE_AVAILABLE",        // Admin only
  "chassisNumber": "CHASSIS123",                   // Required if VEHICLE_AVAILABLE
  "allocationOrderNumber": null,
  "advisorRemarks": "Finance approved"
}
```

**Access control**
- Non-admin roles: `stockAvailability`, `chassisNumber`, `allocationOrderNumber` are read-only and should not be sent.
- Admins:
  - If `stockAvailability = VEHICLE_AVAILABLE` → must send `chassisNumber` (and disable `allocationOrderNumber`).
  - If `stockAvailability = VNA` → must send `allocationOrderNumber` (and disable `chassisNumber`).

### Booking Export — `/api/bookings/download`
Excel includes `Chassis Number` and `Allocation Order Number` columns.

---

## 6. Enquiry Imports (Admin / GM)

### Preview — `POST /api/enquiries/imports/preview`
- `multipart/form-data` with `file`.
- Returns `{ totalRows, validRows, errors }`.

### Upload / Process — `POST /api/enquiries/imports/upload`
- Same payload.
- Response: import ID and summary counts.

### History — `GET /api/enquiries/imports?page=1&limit=10`
- Lists imports created by logged-in admin.

### Import Detail — `GET /api/enquiries/imports/:id`
- Includes first 100 errors with raw row data.

### Download Errors — `GET /api/enquiries/imports/:id/errors`
- Returns CSV with `rowNumber,errorMessage,rawRow`.

**Supported columns**  
`customer_name`, `customer_contact`, `customer_email`, `model`, `variant`, `color`, `source`, `category`, `expected_booking_date`, `ca_remarks`, `assigned_to_user_id`, `dealer_code`, `location`, `next_follow_up_date`.

---

## 7. Booking Imports (Admin)
Existing endpoints (`/api/bookings/import/...`) now accept optional columns:
- `chassis_number` → required if `stock_availability = VEHICLE_AVAILABLE`
- `allocation_order_number` → required if `stock_availability = VNA`

---

## 8. Role Matrix

| Role              | Stock Edit | Pending Badge | Cancel Remarks | Imports                     |
|-------------------|------------|----------------|----------------|-----------------------------|
| Customer Advisor  | No         | Own only       | Own             | No                          |
| Team Lead         | No         | Team scope     | Own + team      | No                          |
| Sales Manager     | No         | Team scope     | Own + team      | No                          |
| General Manager   | No         | Dealership     | Own + team      | Yes (enquiry imports)       |
| Admin             | Yes        | Dealership     | All             | Yes (booking + enquiry)     |

---

## 9. Error Format
Most API errors return:
```json
{
  "success": false,
  "message": "Human-readable error",
  "statusCode": 400
}
```
Front-end should display `message`. Validation errors (e.g., missing expected booking date) also set `statusCode = 400`.

---

## 10. UI Checklist

- Update enquiry form validators (optional email, enforce future dates).
- Display latest three remarks and inline remark form in detail view.
- Implement “Cancel remark” modal with required reason input.
- Show pending updates badge in dashboard/app using summary endpoint.
- Render “Today’s Booking Plan” widget with stock info (chassis vs allocation order).
- Allow stock availability edits only for Admin; enforce conditional fields.
- Add enquiry import screen (preview → upload → history → detail → download errors).
- Update Excel export headers to match new fields (enquiries: Location; bookings: chassis/order numbers).

This document should be shared with the frontend (dashboard + mobile) teams so they implement the correct request payloads, field validations, and response handling for the updated backend.

