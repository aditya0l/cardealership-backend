# Role-Specific Remarks Feature - Complete Guide

## 🎯 Overview

The booking system now supports **role-specific remarks fields**, allowing each role to maintain their own separate comments and notes on bookings. This provides better organization, tracking, and accountability.

---

## 📋 Remarks Fields by Role

Each role has their own dedicated remarks field that only they can edit:

| Field Name | Role | Write Permission | Read Permission |
|------------|------|------------------|-----------------|
| `remarks` | Legacy | Read-only (all roles) | All roles |
| `advisorRemarks` | Customer Advisor | ✅ Customer Advisor only | All roles |
| `teamLeadRemarks` | Team Lead | ✅ Team Lead only | All roles |
| `salesManagerRemarks` | Sales Manager | ✅ Sales Manager only | All roles |
| `generalManagerRemarks` | General Manager | ✅ General Manager only | All roles |
| `adminRemarks` | Admin | ✅ Admin only | All roles |

### Key Principles:
1. ✅ **Each role can ONLY write to their own remarks field**
2. ✅ **All roles can READ all remarks fields** (full transparency)
3. ✅ **The legacy `remarks` field is now read-only** for backward compatibility
4. ✅ **No role can overwrite another role's remarks** (audit integrity)

---

## 🗂️ Database Schema

### New Fields Added to `bookings` Table:

```sql
-- Legacy field (now read-only)
remarks              TEXT

-- Role-specific remarks fields
advisor_remarks       TEXT
team_lead_remarks     TEXT
sales_manager_remarks TEXT
general_manager_remarks TEXT
admin_remarks         TEXT
```

---

## 🌐 API Usage

### Endpoint: `PUT /api/bookings/:id/update-status`

### Example 1: Customer Advisor Adding Remarks

```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer ADVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "advisorRemarks": "Customer confirmed delivery date. Documents ready for pickup."
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "cmg...",
      "advisorRemarks": "Customer confirmed delivery date. Documents ready for pickup.",
      "teamLeadRemarks": null,
      "salesManagerRemarks": null,
      "generalManagerRemarks": null,
      "adminRemarks": null
    }
  }
}
```

### Example 2: Team Lead Adding Remarks

```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer TEAMLEAD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "teamLeadRemarks": "Allocation approved. Priority delivery assigned."
  }'
```

### Example 3: Sales Manager Adding Remarks

```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer SALESMANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salesManagerRemarks": "Special discount approved. Revenue target met."
  }'
```

### Example 4: General Manager Adding Remarks

```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer GENERALMANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "generalManagerRemarks": "High-value customer. Ensure premium service."
  }'
```

### Example 5: Admin Adding Remarks

```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adminRemarks": "System override applied. Manual verification required."
  }'
```

---

## 🔐 Permission Matrix

### Customer Advisor
| Field | Read | Write |
|-------|------|-------|
| `remarks` | ✅ | ❌ |
| `advisorRemarks` | ✅ | ✅ |
| `teamLeadRemarks` | ✅ | ❌ |
| `salesManagerRemarks` | ✅ | ❌ |
| `generalManagerRemarks` | ✅ | ❌ |
| `adminRemarks` | ✅ | ❌ |

### Team Lead
| Field | Read | Write |
|-------|------|-------|
| `remarks` | ✅ | ❌ |
| `advisorRemarks` | ✅ | ❌ |
| `teamLeadRemarks` | ✅ | ✅ |
| `salesManagerRemarks` | ✅ | ❌ |
| `generalManagerRemarks` | ✅ | ❌ |
| `adminRemarks` | ✅ | ❌ |

### Sales Manager
| Field | Read | Write |
|-------|------|-------|
| `remarks` | ✅ | ❌ |
| `advisorRemarks` | ✅ | ❌ |
| `teamLeadRemarks` | ✅ | ❌ |
| `salesManagerRemarks` | ✅ | ✅ |
| `generalManagerRemarks` | ✅ | ❌ |
| `adminRemarks` | ✅ | ❌ |

### General Manager
| Field | Read | Write |
|-------|------|-------|
| `remarks` | ✅ | ❌ |
| `advisorRemarks` | ✅ | ❌ |
| `teamLeadRemarks` | ✅ | ❌ |
| `salesManagerRemarks` | ✅ | ❌ |
| `generalManagerRemarks` | ✅ | ✅ |
| `adminRemarks` | ✅ | ❌ |

### Admin
| Field | Read | Write |
|-------|------|-------|
| All fields | ✅ | ✅ |

---

## 📱 Frontend Integration Examples

### React/React Native Example

```typescript
// Fetch booking with all remarks
const fetchBooking = async (bookingId: string) => {
  const response = await fetch(
    `${API_URL}/bookings/${bookingId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data.booking;
};

// Update role-specific remarks based on user role
const updateRemarks = async (
  bookingId: string, 
  remarksText: string, 
  userRole: string
) => {
  // Map role to remarks field
  const remarksFieldMap = {
    'CUSTOMER_ADVISOR': 'advisorRemarks',
    'TEAM_LEAD': 'teamLeadRemarks',
    'SALES_MANAGER': 'salesManagerRemarks',
    'GENERAL_MANAGER': 'generalManagerRemarks',
    'ADMIN': 'adminRemarks'
  };
  
  const remarksField = remarksFieldMap[userRole];
  
  const response = await fetch(
    `${API_URL}/bookings/${bookingId}/update-status`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        [remarksField]: remarksText
      })
    }
  );
  
  return await response.json();
};

// Display all remarks organized by role
const RemarksDisplay = ({ booking }) => {
  const remarksData = [
    { role: 'Advisor', text: booking.advisorRemarks },
    { role: 'Team Lead', text: booking.teamLeadRemarks },
    { role: 'Sales Manager', text: booking.salesManagerRemarks },
    { role: 'General Manager', text: booking.generalManagerRemarks },
    { role: 'Admin', text: booking.adminRemarks }
  ].filter(r => r.text); // Only show non-empty remarks
  
  return (
    <View>
      {remarksData.map((remark, index) => (
        <View key={index} style={styles.remarkCard}>
          <Text style={styles.roleLabel}>{remark.role}</Text>
          <Text style={styles.remarkText}>{remark.text}</Text>
        </View>
      ))}
    </View>
  );
};
```

---

## ✅ Use Cases

### 1. Customer Advisor
```
advisorRemarks: "Customer requested blue color. Finance approved by HDFC Bank. 
Documents submitted on 2025-10-08."
```

### 2. Team Lead
```
teamLeadRemarks: "Priority delivery assigned due to customer loyalty program. 
Vehicle allocation confirmed from regional stock."
```

### 3. Sales Manager
```
salesManagerRemarks: "Special corporate discount of 5% approved. 
Counted towards Q4 sales target."
```

### 4. General Manager
```
generalManagerRemarks: "VIP customer - CEO of partner company. 
Ensure white-glove delivery service and follow-up."
```

### 5. Admin
```
adminRemarks: "System override: Manual allocation required due to stock discrepancy. 
IT ticket #12345 created."
```

---

## 🧪 Testing Examples

### Test 1: ✅ Customer Advisor Can Update Their Remarks
```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer ADVISOR_TOKEN" \
  -d '{"advisorRemarks": "Test remark"}'

# Expected: Success (200)
```

### Test 2: ❌ Customer Advisor Cannot Update Team Lead Remarks
```bash
curl -X PUT "http://localhost:4000/api/bookings/BOOKING_ID/update-status" \
  -H "Authorization: Bearer ADVISOR_TOKEN" \
  -d '{"teamLeadRemarks": "Trying to update"}'

# Expected: Permission error (field filtered out, no update)
```

### Test 3: ✅ All Roles Can Read All Remarks
```bash
curl -X GET "http://localhost:4000/api/bookings/BOOKING_ID" \
  -H "Authorization: Bearer ANY_ROLE_TOKEN"

# Expected: All remarks fields visible in response
```

### Test 4: ✅ Multiple Roles Can Add Their Remarks Independently
```bash
# Advisor adds their remark
curl -X PUT ... -d '{"advisorRemarks": "Advisor note"}'

# Team Lead adds their remark
curl -X PUT ... -d '{"teamLeadRemarks": "Team lead note"}'

# Both remarks are preserved independently
```

---

## 📊 Database Query Examples

### View All Remarks for a Booking
```sql
SELECT 
  customer_name,
  advisor_remarks,
  team_lead_remarks,
  sales_manager_remarks,
  general_manager_remarks,
  admin_remarks
FROM bookings
WHERE id = 'BOOKING_ID';
```

### Find Bookings with Team Lead Remarks
```sql
SELECT 
  id,
  customer_name,
  team_lead_remarks
FROM bookings
WHERE team_lead_remarks IS NOT NULL;
```

### Audit: See Who Added Remarks When
```sql
SELECT 
  b.customer_name,
  al.action,
  al.changed_by,
  al.created_at,
  al.new_value->>'advisorRemarks' as advisor_remarks,
  al.new_value->>'teamLeadRemarks' as team_lead_remarks
FROM bookings b
JOIN booking_audit_logs al ON b.id = al.booking_id
WHERE al.action = 'UPDATE_STATUS'
ORDER BY al.created_at DESC;
```

---

## ⚠️ Important Notes

### 1. Backward Compatibility
- The legacy `remarks` field remains in the database
- It's now **read-only** for all roles
- Existing data in `remarks` is preserved
- No data migration required

### 2. Audit Trail
- Every remarks update is logged in `booking_audit_logs`
- Includes: who, when, what changed
- Full accountability and transparency

### 3. Best Practices
- ✅ Keep remarks concise and professional
- ✅ Use role-specific remarks for role-specific information
- ✅ Include dates/timestamps when referencing events
- ✅ Avoid duplicating information across remarks fields
- ❌ Don't use remarks for structured data (use proper fields instead)

### 4. Performance
- All remarks fields are nullable
- No performance impact on queries
- Indexed on `id` (primary key) for fast lookups

---

## 🔄 Migration Impact

### No Database Migration Required
- Fields added via Prisma schema update
- Existing bookings: All new remarks fields are `NULL`
- New bookings: Remarks fields start as `NULL`, filled as needed

### API Backward Compatibility
- Existing API calls continue to work
- New fields are optional in requests
- Old `remarks` field still readable
- No breaking changes to existing integrations

---

## 🎉 Benefits

1. **Separation of Concerns** - Each role maintains their own notes
2. **Accountability** - Clear ownership of comments
3. **Audit Trail** - Full history of who said what
4. **Transparency** - All roles can see all remarks
5. **No Conflicts** - Roles can't overwrite each other's notes
6. **Better Organization** - Easy to filter/search by role's comments

---

## 📝 Summary

The role-specific remarks system provides:
- ✅ 5 dedicated remarks fields (one per role)
- ✅ Full RBAC integration
- ✅ Complete audit trail
- ✅ Backward compatibility
- ✅ No breaking changes
- ✅ Ready for production use

---

**Implementation Date**: October 8, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete & Tested

