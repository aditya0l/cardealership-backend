# Enquiry API Documentation

## Updated Enquiry Format

The enquiry system has been updated to match the new car dealership requirements with the following fields:

### Enquiry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerName | string | Yes | Customer's full name |
| customerContact | string | Yes | Customer's phone number |
| customerEmail | string | Yes | Customer's email address |
| model | string | No | Vehicle model/brand (dropdown) |
| variant | string | No | Vehicle variant |
| color | string | No | Preferred vehicle color |
| source | string | No | How the customer found us (dropdown) |
| expectedBookingDate | string | No | Expected booking date (ISO format) |
| caRemarks | string | No | Customer Advisor remarks |
| assignedToUserId | string | No | User ID of assigned advisor |

### Source Options

- WALK_IN
- PHONE_CALL
- WEBSITE
- SOCIAL_MEDIA
- REFERRAL
- ADVERTISEMENT
- EMAIL
- SHOWROOM_VISIT
- EVENT
- OTHER

## API Endpoints

### 1. Create Enquiry
**POST** `/api/enquiries`

```json
{
  "customerName": "John Doe",
  "customerContact": "+1234567890",
  "customerEmail": "john.doe@example.com",
  "model": "Tata Nexon",
  "variant": "XZ Plus",
  "color": "Red",
  "source": "WEBSITE",
  "expectedBookingDate": "2024-01-15T00:00:00.000Z",
  "caRemarks": "Interested in financing options",
  "assignedToUserId": "advisor-uid-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiry created successfully",
  "data": {
    "enquiry": {
      "id": "clx123abc",
      "customerName": "John Doe",
      "customerContact": "+1234567890",
      "customerEmail": "john.doe@example.com",
      "model": "Tata Nexon",
      "variant": "XZ Plus",
      "color": "Red",
      "source": "WEBSITE",
      "expectedBookingDate": "2024-01-15T00:00:00.000Z",
      "caRemarks": "Interested in financing options",
      "status": "OPEN",
      "assignedTo": {
        "firebaseUid": "advisor-uid-123",
        "name": "Jane Smith",
        "email": "jane.smith@dealership.com"
      },
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    }
  }
}
```

### 2. Get All Enquiries
**GET** `/api/enquiries?page=1&limit=10&status=OPEN`

**Response:**
```json
{
  "success": true,
  "message": "Enquiries retrieved successfully",
  "data": {
    "enquiries": [
      {
        "id": "clx123abc",
        "customerName": "John Doe",
        "customerContact": "+1234567890",
        "customerEmail": "john.doe@example.com",
        "model": "Tata Nexon",
        "variant": "XZ Plus",
        "color": "Red",
        "source": "WEBSITE",
        "expectedBookingDate": "2024-01-15T00:00:00.000Z",
        "caRemarks": "Interested in financing options",
        "status": "OPEN",
        "assignedTo": {...},
        "createdBy": {...},
        "_count": {
          "bookings": 0,
          "quotations": 1
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### 3. Get Enquiry by ID
**GET** `/api/enquiries/:id`

### 4. Update Enquiry
**PUT** `/api/enquiries/:id`

```json
{
  "customerName": "John Doe Updated",
  "caRemarks": "Updated remarks after follow-up call",
  "status": "IN_PROGRESS"
}
```

### 5. Delete Enquiry
**DELETE** `/api/enquiries/:id`

## Dropdown Data Endpoints

### Get Available Models
**GET** `/api/enquiries/models`

**Response:**
```json
{
  "success": true,
  "message": "Available models retrieved successfully",
  "data": {
    "modelsByBrand": {
      "Tata": ["Nexon", "Harrier", "Safari", "Punch"],
      "Maruti": ["Swift", "Baleno", "Vitara Brezza"],
      "Honda": ["City", "Amaze", "WR-V"]
    }
  }
}
```

### Get Available Variants
**GET** `/api/enquiries/variants?model=Nexon`

**Response:**
```json
{
  "success": true,
  "message": "Available variants retrieved successfully",
  "data": {
    "variants": [
      {
        "variant": "Nexon XE",
        "vcCode": "NEX001",
        "trim": "XE",
        "fuelType": "Petrol",
        "transmission": "Manual"
      },
      {
        "variant": "Nexon XZ Plus",
        "vcCode": "NEX002",
        "trim": "XZ Plus",
        "fuelType": "Petrol",
        "transmission": "AMT"
      }
    ]
  }
}
```

### Get Available Colors
**GET** `/api/enquiries/colors`

**Response:**
```json
{
  "success": true,
  "message": "Available colors retrieved successfully",
  "data": {
    "colors": ["Red", "Blue", "White", "Silver", "Black", "Grey"]
  }
}
```

### Get Enquiry Sources
**GET** `/api/enquiries/sources`

**Response:**
```json
{
  "success": true,
  "message": "Enquiry sources retrieved successfully",
  "data": {
    "sources": [
      { "value": "WALK_IN", "label": "Walk In" },
      { "value": "PHONE_CALL", "label": "Phone Call" },
      { "value": "WEBSITE", "label": "Website" },
      { "value": "SOCIAL_MEDIA", "label": "Social Media" },
      { "value": "REFERRAL", "label": "Referral" },
      { "value": "ADVERTISEMENT", "label": "Advertisement" },
      { "value": "EMAIL", "label": "Email" },
      { "value": "SHOWROOM_VISIT", "label": "Showroom Visit" },
      { "value": "EVENT", "label": "Event" },
      { "value": "OTHER", "label": "Other" }
    ]
  }
}
```

## Validation Rules

### Customer Name
- Required
- Must be a non-empty string

### Customer Contact
- Required
- Must match pattern: `/^[+]?[\d\s\-\(\)]{10,}$/`
- Minimum 10 characters including digits, spaces, hyphens, parentheses

### Customer Email
- Required
- Must be valid email format: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### Expected Booking Date
- Optional
- Must be valid ISO date string if provided
- Will be parsed and validated as Date object

## Role-Based Access Control

| Action | Customer Advisor | Team Lead | Manager | Admin |
|--------|------------------|-----------|---------|-------|
| Create Enquiry | ✅ | ✅ | ✅ | ✅ |
| View Enquiries | ✅ | ✅ | ✅ | ✅ |
| Update Enquiry | ❌ | ✅ | ✅ | ✅ |
| Delete Enquiry | ❌ | ❌ | ✅ | ✅ |
| View Dropdown Data | ✅ | ✅ | ✅ | ✅ |

## Implementation Notes

1. **Backward Compatibility**: The system maintains backward compatibility with existing enquiries by storing the new format as JSON in the description field until database migration is complete.

2. **Data Migration**: When the database schema is updated, a migration script should be created to move data from the JSON format to proper columns.

3. **Dropdown Data**: All dropdown endpoints use data from the existing Vehicle table to ensure consistency with available inventory.

4. **Error Handling**: Comprehensive validation with clear error messages for all field formats.

5. **Response Format**: All API responses follow the standard format with `success`, `message`, and `data` properties.

## Frontend Integration

For frontend developers, use these endpoints to:

1. **Populate Dropdowns**: Call `/models`, `/variants`, `/colors`, and `/sources` on page load
2. **Create Forms**: Use the new field structure for enquiry forms
3. **Validation**: Implement client-side validation matching the backend rules
4. **Date Handling**: Use date pickers and convert to ISO format for submission
5. **Cascading Dropdowns**: Use model selection to filter variants via the variants endpoint

## Database Schema (Future Migration)

When migrating the database schema, the Enquiry table will have these columns:

```sql
-- Customer Information
customer_name VARCHAR NOT NULL
customer_contact VARCHAR NOT NULL  
customer_email VARCHAR NOT NULL

-- Vehicle Information  
model VARCHAR
variant VARCHAR
color VARCHAR

-- Enquiry Details
source enquiry_source_enum DEFAULT 'WALK_IN'
expected_booking_date TIMESTAMP
ca_remarks TEXT

-- System Fields (existing)
status enquiry_status_enum DEFAULT 'OPEN'
assigned_to_user_id VARCHAR
created_by_user_id VARCHAR NOT NULL
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```
