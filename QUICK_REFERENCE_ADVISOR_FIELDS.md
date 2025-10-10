# Quick Reference: Advisor-Editable Fields API

## 🎯 Endpoint

```
PUT /api/bookings/:id/update-status
```

## 🔑 Authentication Required
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

## 👥 Authorized Roles
- CUSTOMER_ADVISOR (own bookings only)
- TEAM_LEAD
- SALES_MANAGER  
- GENERAL_MANAGER
- ADMIN

---

## 📝 Editable Fields

| Field | Type | Values/Format | Required |
|-------|------|---------------|----------|
| `status` | enum | PENDING, ASSIGNED, IN_PROGRESS, CONFIRMED, DELIVERED, CANCELLED, NO_SHOW, WAITLISTED, RESCHEDULED, BACK_ORDER, APPROVED, REJECTED | No |
| `financeRequired` | boolean | true/false | No |
| `financerName` | string | Any text | No |
| `fileLoginDate` | date | ISO-8601 (YYYY-MM-DD or full) | No |
| `approvalDate` | date | ISO-8601 (YYYY-MM-DD or full) | No |
| `stockAvailability` | enum | VNA, VEHICLE_AVAILABLE | No |
| `expectedDeliveryDate` | date | ISO-8601 (YYYY-MM-DD or full) | No |
| `backOrderStatus` | boolean | true/false | No |
| `rtoDate` | date | ISO-8601 (YYYY-MM-DD or full) | No |
| `remarks` | string | Any text | No |

---

## 📋 Example Requests

### Update Finance Details
```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "financeRequired": true,
    "financerName": "HDFC Bank",
    "fileLoginDate": "2025-10-08"
  }'
```

### Update Stock & Delivery
```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stockAvailability": "VEHICLE_AVAILABLE",
    "expectedDeliveryDate": "2025-10-25",
    "backOrderStatus": false
  }'
```

### Update Status Only
```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

### Add Remarks
```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks": "Customer requested blue color"}'
```

### Update Multiple Fields
```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED",
    "financeRequired": true,
    "financerName": "ICICI Bank",
    "approvalDate": "2025-10-10T15:30:00.000Z",
    "stockAvailability": "VEHICLE_AVAILABLE",
    "expectedDeliveryDate": "2025-10-20",
    "remarks": "Finance approved. Vehicle ready for delivery."
  }'
```

---

## ✅ Success Response

```json
{
  "success": true,
  "message": "Booking updated successfully",
  "data": {
    "booking": { /* updated booking object */ },
    "updatedBy": {
      "userId": "firebase_uid",
      "userName": "John Doe",
      "userRole": "CUSTOMER_ADVISOR"
    },
    "updatedAt": "2025-10-08T18:15:00.888Z"
  }
}
```

---

## ❌ Error Responses

### 400 - Invalid Data
```json
{
  "success": false,
  "message": "Invalid stock availability. Must be \"VNA\" or \"VEHICLE_AVAILABLE\""
}
```

### 403 - Permission Denied
```json
{
  "success": false,
  "message": "You can only update bookings assigned to you"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Booking not found"
}
```

---

## 📊 Audit Trail

Every update creates an audit log with:
- Who made the change (userId + name + role)
- When it was changed (timestamp)
- What changed (old vs new values)
- Why (change reason)
- From where (IP address, user agent)

Query audit logs:
```sql
SELECT * FROM booking_audit_logs 
WHERE booking_id = 'YOUR_BOOKING_ID' 
ORDER BY created_at DESC;
```

---

## 💡 Tips

1. **Partial Updates**: Send only the fields you want to update
2. **Date Formats**: Both `2025-10-20` and `2025-10-20T00:00:00.000Z` work
3. **Enums**: Values are case-sensitive (use UPPERCASE)
4. **Advisors**: Can only update bookings where `advisorId` matches their Firebase UID
5. **Remarks**: All roles can add/update remarks
6. **Validation**: Invalid data returns clear error messages

---

## 🧪 Test Credentials

```
Email: test.advisor@test.com
Password: testpassword123
Role: CUSTOMER_ADVISOR
```

Get token:
```bash
curl -X POST http://localhost:4000/api/auth/test-user \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Advisor", "email": "test.advisor@test.com", "roleName": "CUSTOMER_ADVISOR"}'
```

