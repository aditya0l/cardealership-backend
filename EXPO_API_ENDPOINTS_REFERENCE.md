# 📱 **EXPO APP - COMPLETE API ENDPOINTS REFERENCE**

**Complete API endpoints and response structures for Expo React Native app integration**

---

## 🌐 **BASE URL**

```
Production: https://automotive-backend-frqe.onrender.com/api
Development: http://localhost:4000/api
```

---

## 🔐 **AUTHENTICATION**

### **Headers Required:**
```typescript
{
  "Authorization": "Bearer <firebase_id_token>",
  "Content-Type": "application/json"
}
```

### **Get Firebase ID Token:**
```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
const token = await user.getIdToken();
```

---

## 👤 **AUTHENTICATION ENDPOINTS**

### **1. Get User Profile**
```typescript
GET /auth/profile
```

**Response:**
```typescript
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "firebaseUid": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
    "email": "adityajaif2004@gmail.com",
    "name": "Aditya jaif",
    "role": {
      "id": "cmgkr59om0004vn69xt4vg4l1",
      "name": "CUSTOMER_ADVISOR",
      "permissions": ["read", "write"]
    },
    "dealership": {
      "id": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
      "name": "Aditya jaif's Dealership",
      "code": "ADMIN_1703123456789_abc123def",
      "type": "UNIVERSAL",
      "email": "adityajaif2004@gmail.com",
      "phone": "+1234567890",
      "address": "To be configured",
      "city": "To be configured",
      "state": "To be configured",
      "pincode": "00000",
      "gstNumber": "TO_BE_CONFIGURED",
      "panNumber": "TO_BE_CONFIGURED",
      "brands": ["TO_BE_CONFIGURED"],
      "isActive": true,
      "onboardingCompleted": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "dealershipId": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
    "isActive": true,
    "employeeId": "ADV_1703123456789",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### **2. Get All Users (Admin Only)**
```typescript
GET /auth/users?page=1&limit=20&search=john&role=ADMIN&isActive=true
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by name or email
- `role` (string): Filter by role (ADMIN, GENERAL_MANAGER, etc.)
- `isActive` (boolean): Filter by active status

**Response:**
```typescript
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "firebaseUid": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
        "email": "adityajaif2004@gmail.com",
        "name": "Aditya jaif",
        "role": {
          "id": "cmgkr59om0004vn69xt4vg4l1",
          "name": "CUSTOMER_ADVISOR"
        },
        "dealership": {
          "id": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
          "name": "Aditya jaif's Dealership"
        },
        "dealershipId": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
        "isActive": true,
        "employeeId": "ADV_1703123456789",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

### **3. Create User (Admin Only)**
```typescript
POST /auth/users
```

**Request Body:**
```typescript
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123",
  "roleName": "CUSTOMER_ADVISOR"
}
```

**Response:**
```typescript
{
  "success": true,
  "message": "User created successfully with credentials",
  "data": {
    "user": {
      "firebaseUid": "newFirebaseUid123",
      "employeeId": "ADV_1703123456789",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": {
        "id": "cmgkr59om0004vn69xt4vg4l1",
        "name": "CUSTOMER_ADVISOR"
      },
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "temporaryPassword": "SecurePassword123"
  }
}
```

### **4. Update User (Admin Only)**
```typescript
PUT /auth/users/{firebaseUid}
```

**Request Body:**
```typescript
{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "roleName": "TEAM_LEAD",
  "isActive": true
}
```

### **5. Delete User (Admin Only)**
```typescript
DELETE /auth/users/{firebaseUid}
```

### **6. Reset User Password (Admin Only)**
```typescript
POST /auth/users/{firebaseUid}/reset-password
```

**Request Body:**
```typescript
{
  "newPassword": "NewSecurePassword123"
}
```

---

## 🏢 **DEALERSHIP ENDPOINTS**

### **1. Get All Dealerships**
```typescript
GET /dealerships?limit=100
```

**Response:**
```typescript
{
  "success": true,
  "message": "Dealerships retrieved successfully",
  "data": {
    "dealerships": [
      {
        "id": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
        "name": "Aditya jaif's Dealership",
        "code": "ADMIN_1703123456789_abc123def",
        "type": "UNIVERSAL",
        "email": "adityajaif2004@gmail.com",
        "phone": "+1234567890",
        "address": "To be configured",
        "city": "To be configured",
        "state": "To be configured",
        "pincode": "00000",
        "gstNumber": "TO_BE_CONFIGURED",
        "panNumber": "TO_BE_CONFIGURED",
        "brands": ["TO_BE_CONFIGURED"],
        "isActive": true,
        "onboardingCompleted": false,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### **2. Create Dealership (Admin Only)**
```typescript
POST /dealerships
```

**Request Body:**
```typescript
{
  "name": "My New Dealership",
  "type": "UNIVERSAL",
  "email": "contact@mydealership.com",
  "phone": "+1234567890",
  "address": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "gstNumber": "27ABCDE1234F1Z5",
  "panNumber": "ABCDE1234F",
  "brands": ["Tata", "Honda", "Maruti"]
}
```

---

## 📋 **ENQUIRY ENDPOINTS**

### **1. Get All Enquiries**
```typescript
GET /enquiries?page=1&limit=20&status=NEW&category=HOT&search=john&sortBy=createdAt&sortOrder=desc
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status (NEW, CONTACTED, FOLLOW_UP, CONVERTED, LOST)
- `category` (string): Filter by category (HOT, LOST, BOOKED)
- `search` (string): Search by customer name or contact
- `sortBy` (string): Sort field (createdAt, customerName, status)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```typescript
{
  "success": true,
  "message": "Enquiries retrieved successfully",
  "data": {
    "enquiries": [
      {
        "id": "cmgj8k9yx000ek4jzcjzo8yrh",
        "customerName": "John Smith",
        "customerContact": "+919876543210",
        "customerEmail": "john.smith@example.com",
        "variant": "Tata Harrier XZ Plus Diesel AT",
        "color": "Pearl White",
        "expectedBookingDate": "2024-02-15T00:00:00.000Z",
        "status": "NEW",
        "category": "HOT",
        "caRemarks": "Customer is very interested in Harrier",
        "gmRemarks": null,
        "createdByUserId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
        "assignedToUserId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
        "dealershipId": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "createdBy": {
          "firebaseUid": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
          "name": "Aditya jaif",
          "email": "adityajaif2004@gmail.com"
        },
        "assignedTo": {
          "firebaseUid": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
          "name": "Aditya jaif",
          "email": "adityajaif2004@gmail.com"
        },
        "dealership": {
          "id": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
          "name": "Aditya jaif's Dealership"
        },
        "_count": {
          "bookings": 0,
          "quotations": 0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

### **2. Get Enquiry by ID**
```typescript
GET /enquiries/{id}
```

### **3. Create Enquiry**
```typescript
POST /enquiries
```

**Request Body:**
```typescript
{
  "customerName": "John Smith",
  "customerContact": "+919876543210",
  "customerEmail": "john.smith@example.com",
  "variant": "Tata Harrier XZ Plus Diesel AT",
  "color": "Pearl White",
  "expectedBookingDate": "2024-02-15",
  "caRemarks": "Customer is very interested in Harrier"
}
```

### **4. Update Enquiry**
```typescript
PUT /enquiries/{id}
```

**Request Body:**
```typescript
{
  "customerName": "John Smith Updated",
  "customerContact": "+919876543210",
  "customerEmail": "john.smith@example.com",
  "variant": "Tata Harrier XZ Plus Diesel AT",
  "color": "Pearl White",
  "expectedBookingDate": "2024-02-15",
  "status": "CONTACTED",
  "category": "HOT",
  "caRemarks": "Customer contacted successfully",
  "gmRemarks": "Good lead, follow up required",
  "assignedToUserId": "gpJDwdJlvacGUACQOFbt4Fibtbo1"
}
```

### **5. Delete Enquiry**
```typescript
DELETE /enquiries/{id}
```

### **6. Get Enquiry Statistics**
```typescript
GET /enquiries/stats
```

**Response:**
```typescript
{
  "success": true,
  "message": "Enquiry statistics retrieved successfully",
  "data": {
    "total": 25,
    "byStatus": {
      "NEW": 10,
      "CONTACTED": 8,
      "FOLLOW_UP": 4,
      "CONVERTED": 2,
      "LOST": 1
    },
    "byCategory": {
      "HOT": 15,
      "LOST": 5,
      "BOOKED": 5
    }
  }
}
```

---

## 📅 **BOOKING ENDPOINTS**

### **1. Get All Bookings**
```typescript
GET /bookings?page=1&limit=20&status=PENDING&timeline=today&search=john&sortBy=createdAt&sortOrder=desc
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status (PENDING, ASSIGNED, IN_PROGRESS, CONFIRMED, DELIVERED, CANCELLED)
- `timeline` (string): Filter by timeline (today, delivery_today, pending_update, overdue)
- `search` (string): Search by customer name or contact
- `sortBy` (string): Sort field (createdAt, customerName, status)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```typescript
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "cmgj8ka0c000gk4jz2ujgkhgk",
        "customerName": "John Smith",
        "customerPhone": "+919876543210",
        "customerEmail": "john.smith@example.com",
        "variant": "Tata Harrier XZ Plus Diesel AT",
        "vcCode": "THXZPDAT001",
        "color": "Pearl White",
        "fuelType": "Diesel",
        "transmission": "Automatic",
        "status": "PENDING",
        "source": "MOBILE",
        "dealerCode": "TATA001",
        "advisorId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
        "enquiryId": "cmgj8k9yx000ek4jzcjzo8yrh",
        "dealershipId": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
        "bookingDate": "2024-01-15T10:30:00.000Z",
        "expectedDeliveryDate": "2024-02-15T00:00:00.000Z",
        "stockAvailability": "VEHICLE_AVAILABLE",
        "backOrderStatus": false,
        "financeRequired": true,
        "financerName": "HDFC Bank",
        "remarks": "Customer is ready for booking",
        "advisorRemarks": "Good customer, follow up required",
        "teamLeadRemarks": null,
        "salesManagerRemarks": null,
        "generalManagerRemarks": null,
        "adminRemarks": null,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "advisor": {
          "firebaseUid": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
          "name": "Aditya jaif",
          "email": "adityajaif2004@gmail.com",
          "role": {
            "id": "cmgkr59om0004vn69xt4vg4l1",
            "name": "CUSTOMER_ADVISOR"
          }
        },
        "enquiry": {
          "id": "cmgj8k9yx000ek4jzcjzo8yrh",
          "customerName": "John Smith",
          "customerContact": "+919876543210",
          "customerEmail": "john.smith@example.com",
          "status": "CONVERTED"
        },
        "dealership": {
          "id": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
          "name": "Aditya jaif's Dealership"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

### **2. Get Advisor's Bookings (Customer Advisor Only)**
```typescript
GET /bookings/advisor/my-bookings?page=1&limit=20&status=PENDING&timeline=today
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status
- `timeline` (string): Filter by timeline (today, delivery_today, pending_update, overdue)

### **3. Get Booking by ID**
```typescript
GET /bookings/{id}
```

### **4. Create Booking**
```typescript
POST /bookings
```

**Request Body:**
```typescript
{
  "customerName": "John Smith",
  "customerPhone": "+919876543210",
  "customerEmail": "john.smith@example.com",
  "variant": "Tata Harrier XZ Plus Diesel AT",
  "vcCode": "THXZPDAT001",
  "color": "Pearl White",
  "fuelType": "Diesel",
  "transmission": "Automatic",
  "dealerCode": "TATA001",
  "advisorId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
  "bookingDate": "2024-01-15",
  "expectedDeliveryDate": "2024-02-15",
  "financeRequired": true,
  "financerName": "HDFC Bank",
  "remarks": "Customer is ready for booking"
}
```

### **5. Update Booking**
```typescript
PUT /bookings/{id}
```

**Request Body:**
```typescript
{
  "customerName": "John Smith Updated",
  "customerPhone": "+919876543210",
  "customerEmail": "john.smith@example.com",
  "variant": "Tata Harrier XZ Plus Diesel AT",
  "vcCode": "THXZPDAT001",
  "color": "Pearl White",
  "fuelType": "Diesel",
  "transmission": "Automatic",
  "status": "ASSIGNED",
  "advisorId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
  "bookingDate": "2024-01-15",
  "expectedDeliveryDate": "2024-02-15",
  "stockAvailability": "VEHICLE_AVAILABLE",
  "financeRequired": true,
  "financerName": "HDFC Bank",
  "advisorRemarks": "Good customer, follow up required",
  "teamLeadRemarks": "Approved for delivery",
  "salesManagerRemarks": "Priority customer",
  "generalManagerRemarks": null,
  "adminRemarks": null
}
```

### **6. Update Booking Status (Advisor)**
```typescript
PUT /bookings/{id}/update-status
```

**Request Body:**
```typescript
{
  "status": "IN_PROGRESS",
  "expectedDeliveryDate": "2024-02-20",
  "financeRequired": true,
  "financerName": "HDFC Bank",
  "advisorRemarks": "Customer confirmed delivery date",
  "stockAvailability": "VEHICLE_AVAILABLE"
}
```

### **7. Delete Booking**
```typescript
DELETE /bookings/{id}
```

### **8. Bulk Assign Bookings (Admin Only)**
```typescript
POST /bookings/bulk-assign
```

**Request Body:**
```typescript
{
  "bookingIds": ["cmgj8ka0c000gk4jz2ujgkhgk", "cmgj8ka0c000gk4jz2ujgkhgl"],
  "advisorId": "gpJDwdJlvacGUACQOFbt4Fibtbo1"
}
```

**Response:**
```typescript
{
  "success": true,
  "message": "Bulk assignment completed",
  "data": {
    "successful": 2,
    "failed": 0,
    "assignments": [
      {
        "bookingId": "cmgj8ka0c000gk4jz2ujgkhgk",
        "advisorId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
        "advisorName": "Aditya jaif",
        "success": true
      },
      {
        "bookingId": "cmgj8ka0c000gk4jz2ujgkhgl",
        "advisorId": "gpJDwdJlvacGUACQOFbt4Fibtbo1",
        "advisorName": "Aditya jaif",
        "success": true
      }
    ]
  }
}
```

### **9. Auto Assign Bookings (Admin Only)**
```typescript
POST /bookings/auto-assign
```

**Request Body:**
```typescript
{
  "bookingIds": ["cmgj8ka0c000gk4jz2ujgkhgk", "cmgj8ka0c000gk4jz2ujgkhgl"],
  "strategy": "ROUND_ROBIN" // or "LEAST_LOAD" or "RANDOM"
}
```

### **10. Unassign Booking**
```typescript
PATCH /bookings/{id}/unassign
```

**Request Body:**
```typescript
{}
```

### **11. Bulk Import Bookings (Admin Only)**
```typescript
POST /bookings/import
```

**Request Body:**
```typescript
// FormData with file
Content-Type: multipart/form-data
file: <excel_file>
```

**Response:**
```typescript
{
  "success": true,
  "message": "File uploaded successfully and queued for processing",
  "data": {
    "importId": "import_123456789",
    "jobId": "job_987654321",
    "filename": "bookings_import.xlsx",
    "fileSize": 1024000,
    "status": "PENDING"
  }
}
```

### **12. Get Import Progress**
```typescript
GET /bookings/imports/{importId}/progress
```

**Response:**
```typescript
{
  "success": true,
  "message": "Import progress retrieved successfully",
  "data": {
    "importId": "import_123456789",
    "status": "PROCESSING",
    "totalRows": 100,
    "processedRows": 75,
    "successfulRows": 70,
    "failedRows": 5,
    "errorSummary": {
      "validationErrors": 3,
      "duplicateErrors": 2
    }
  }
}
```

### **13. Get Import History**
```typescript
GET /bookings/imports?page=1&limit=10
```

---

## 🚗 **STOCK/VEHICLE ENDPOINTS**

### **1. Get All Vehicles**
```typescript
GET /stock?page=1&limit=20&search=harrier&fuelType=Diesel&transmission=Automatic&sortBy=variant&sortOrder=asc
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search by variant, vcCode, or color
- `fuelType` (string): Filter by fuel type (Petrol, Diesel, Electric, CNG)
- `transmission` (string): Filter by transmission (Manual, Automatic, AMT, DCA)
- `sortBy` (string): Sort field (variant, vcCode, totalStock, onRoadPrice)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```typescript
{
  "success": true,
  "message": "Vehicles retrieved successfully",
  "data": {
    "vehicles": [
      {
        "id": "cmgj8ka0c000gk4jz2ujgkhgk",
        "variant": "Tata Harrier XZ Plus Diesel AT",
        "vcCode": "THXZPDAT001",
        "color": "Pearl White",
        "fuelType": "Diesel",
        "transmission": "Automatic",
        "onRoadPrice": 1850000,
        "exShowroomPrice": 1650000,
        "zawlStock": 5,
        "rasStock": 3,
        "regionalStock": 2,
        "plantStock": 10,
        "totalStock": 20,
        "isActive": true,
        "dealerId": "dealer_123",
        "dealershipId": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "dealer": {
          "id": "dealer_123",
          "name": "Tata Motors Dealer"
        },
        "dealership": {
          "id": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
          "name": "Aditya jaif's Dealership"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### **2. Get Vehicle by ID**
```typescript
GET /stock/{id}
```

### **3. Create Vehicle (Admin Only)**
```typescript
POST /stock
```

**Request Body:**
```typescript
{
  "variant": "Tata Harrier XZ Plus Diesel AT",
  "vcCode": "THXZPDAT001",
  "color": "Pearl White",
  "fuelType": "Diesel",
  "transmission": "Automatic",
  "onRoadPrice": 1850000,
  "exShowroomPrice": 1650000,
  "zawlStock": 5,
  "rasStock": 3,
  "regionalStock": 2,
  "plantStock": 10
}
```

### **4. Update Vehicle (Admin Only)**
```typescript
PUT /stock/{id}
```

**Request Body:**
```typescript
{
  "variant": "Tata Harrier XZ Plus Diesel AT Updated",
  "vcCode": "THXZPDAT001",
  "color": "Pearl White",
  "fuelType": "Diesel",
  "transmission": "Automatic",
  "onRoadPrice": 1900000,
  "exShowroomPrice": 1700000,
  "zawlStock": 8,
  "rasStock": 5,
  "regionalStock": 3,
  "plantStock": 12,
  "isActive": true
}
```

### **5. Delete Vehicle (Admin Only)**
```typescript
DELETE /stock/{id}
```

### **6. Get Stock Statistics**
```typescript
GET /stock/stats
```

**Response:**
```typescript
{
  "success": true,
  "message": "Stock statistics retrieved successfully",
  "data": {
    "totalVehicles": 50,
    "lowStockVehicles": 5,
    "outOfStockVehicles": 2,
    "totalStock": 500,
    "byFuelType": {
      "Petrol": 25,
      "Diesel": 20,
      "Electric": 3,
      "CNG": 2
    },
    "byTransmission": {
      "Manual": 30,
      "Automatic": 15,
      "AMT": 3,
      "DCA": 2
    }
  }
}
```

### **7. Search Vehicles**
```typescript
GET /stock/search?q=harrier
```

**Response:**
```typescript
{
  "success": true,
  "message": "Vehicle search completed",
  "data": [
    {
      "id": "cmgj8ka0c000gk4jz2ujgkhgk",
      "variant": "Tata Harrier XZ Plus Diesel AT",
      "vcCode": "THXZPDAT001",
      "color": "Pearl White",
      "fuelType": "Diesel",
      "transmission": "Automatic",
      "onRoadPrice": 1850000,
      "totalStock": 20,
      "isActive": true
    }
  ]
}
```

---

## 📊 **DASHBOARD ENDPOINTS**

### **1. Get Dashboard Statistics**
```typescript
GET /dashboard/stats
```

**Response:**
```typescript
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "totalEnquiries": 25,
    "totalBookings": 15,
    "totalVehicles": 50,
    "totalEmployees": 8,
    "pendingEnquiries": 10,
    "pendingBookings": 5,
    "lowStockVehicles": 3,
    "recentActivities": [
      {
        "id": "activity_1",
        "type": "enquiry",
        "action": "created",
        "description": "New enquiry from John Smith for Tata Harrier",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "user": "Aditya jaif"
      },
      {
        "id": "activity_2",
        "type": "booking",
        "action": "updated",
        "description": "Booking status changed to CONFIRMED",
        "timestamp": "2024-01-15T09:15:00.000Z",
        "user": "Aditya jaif"
      }
    ]
  }
}
```

### **2. Get Recent Activities**
```typescript
GET /dashboard/recent-activities?limit=10&type=enquiry
```

**Query Parameters:**
- `limit` (number): Number of activities to retrieve
- `type` (string): Filter by activity type (enquiry, booking, vehicle, user)

### **3. Get Sales Performance**
```typescript
GET /dashboard/sales-performance?period=month&startDate=2024-01-01&endDate=2024-01-31
```

**Query Parameters:**
- `period` (string): Period type (day, week, month, year)
- `startDate` (string): Start date in YYYY-MM-DD format
- `endDate` (string): End date in YYYY-MM-DD format

**Response:**
```typescript
{
  "success": true,
  "message": "Sales performance retrieved successfully",
  "data": {
    "totalSales": 15000000,
    "totalBookings": 15,
    "conversionRate": 60.0,
    "byPeriod": [
      {
        "period": "2024-01-01",
        "sales": 1000000,
        "bookings": 1
      },
      {
        "period": "2024-01-02",
        "sales": 1500000,
        "bookings": 2
      }
    ]
  }
}
```

### **4. Get Revenue Chart**
```typescript
GET /dashboard/revenue-chart?period=month&months=6
```

**Query Parameters:**
- `period` (string): Period type (day, week, month, year)
- `months` (number): Number of months to retrieve

**Response:**
```typescript
{
  "success": true,
  "message": "Revenue chart data retrieved successfully",
  "data": {
    "labels": ["Aug 2023", "Sep 2023", "Oct 2023", "Nov 2023", "Dec 2023", "Jan 2024"],
    "data": [1200000, 1500000, 1800000, 2000000, 2200000, 2500000],
    "totalRevenue": 11200000
  }
}
```

---

## 🏷️ **MODEL & VARIANT ENDPOINTS**

### **1. Get All Models**
```typescript
GET /models?brand=Tata&isActive=true
```

**Query Parameters:**
- `brand` (string): Filter by brand (Tata, Honda, Maruti, etc.)
- `isActive` (boolean): Filter by active status

**Response:**
```typescript
{
  "success": true,
  "message": "Models retrieved successfully",
  "data": {
    "models": [
      {
        "id": "cmgj8ka0c000gk4jz2ujgkhgk",
        "brand": "Tata",
        "modelName": "Harrier",
        "segment": "SUV",
        "description": "Premium SUV with advanced features",
        "basePrice": 1500000,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "vehicles": [
          {
            "id": "vehicle_1",
            "variant": "Tata Harrier XZ Plus Diesel AT",
            "color": "Pearl White",
            "totalStock": 20
          }
        ]
      }
    ]
  }
}
```

### **2. Get Model by ID**
```typescript
GET /models/{id}
```

### **3. Create Model (Admin Only)**
```typescript
POST /models
```

**Request Body:**
```typescript
{
  "brand": "Tata",
  "modelName": "Nexon",
  "segment": "Compact SUV",
  "description": "Compact SUV with electric and petrol variants",
  "basePrice": 800000
}
```

### **4. Update Model (Admin Only)**
```typescript
PUT /models/{id}
```

### **5. Delete Model (Admin Only)**
```typescript
DELETE /models/{id}
```

---

## 📄 **QUOTATION ENDPOINTS**

### **1. Get All Quotations**
```typescript
GET /quotations?page=1&limit=20&status=PENDING&enquiryId=cmgj8k9yx000ek4jzcjzo8yrh
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status (PENDING, APPROVED, REJECTED)
- `enquiryId` (string): Filter by enquiry ID

**Response:**
```typescript
{
  "success": true,
  "message": "Quotations retrieved successfully",
  "data": {
    "quotations": [
      {
        "id": "cmgj8ka0c000gk4jz2ujgkhgk",
        "enquiryId": "cmgj8k9yx000ek4jzcjzo8yrh",
        "amount": 1850000,
        "status": "PENDING",
        "pdfUrl": "https://storage.googleapis.com/quotations/quote_123.pdf",
        "dealershipId": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "enquiry": {
          "id": "cmgj8k9yx000ek4jzcjzo8yrh",
          "customerName": "John Smith",
          "customerContact": "+919876543210",
          "customerEmail": "john.smith@example.com",
          "variant": "Tata Harrier XZ Plus Diesel AT",
          "status": "CONVERTED"
        },
        "dealership": {
          "id": "b7958da3-c5f6-4596-b849-3f4beb6d24eb",
          "name": "Aditya jaif's Dealership"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### **2. Get Quotation by ID**
```typescript
GET /quotations/{id}
```

### **3. Create Quotation**
```typescript
POST /quotations
```

**Request Body:**
```typescript
{
  "enquiryId": "cmgj8k9yx000ek4jzcjzo8yrh",
  "amount": 1850000,
  "pdfUrl": "https://storage.googleapis.com/quotations/quote_123.pdf"
}
```

### **4. Update Quotation**
```typescript
PUT /quotations/{id}
```

**Request Body:**
```typescript
{
  "amount": 1900000,
  "status": "APPROVED",
  "pdfUrl": "https://storage.googleapis.com/quotations/quote_123_updated.pdf"
}
```

### **5. Delete Quotation**
```typescript
DELETE /quotations/{id}
```

### **6. Get Quotation Statistics**
```typescript
GET /quotations/stats
```

**Response:**
```typescript
{
  "success": true,
  "message": "Quotation statistics retrieved successfully",
  "data": {
    "total": 15,
    "byStatus": {
      "PENDING": 8,
      "APPROVED": 5,
      "REJECTED": 2
    },
    "totalAmount": 25000000,
    "averageAmount": 1666666.67
  }
}
```

---

## 🔍 **SEARCH ENDPOINTS**

### **1. Global Search**
```typescript
GET /search?q=harrier&type=all&limit=20
```

**Query Parameters:**
- `q` (string): Search query
- `type` (string): Search type (all, enquiries, bookings, vehicles, users)
- `limit` (number): Number of results

**Response:**
```typescript
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "query": "harrier",
    "totalResults": 15,
    "results": {
      "enquiries": [
        {
          "id": "cmgj8k9yx000ek4jzcjzo8yrh",
          "customerName": "John Smith",
          "variant": "Tata Harrier XZ Plus Diesel AT",
          "status": "NEW",
          "createdAt": "2024-01-15T10:30:00.000Z"
        }
      ],
      "bookings": [
        {
          "id": "cmgj8ka0c000gk4jz2ujgkhgk",
          "customerName": "Jane Doe",
          "variant": "Tata Harrier XZ Plus Diesel AT",
          "status": "PENDING",
          "createdAt": "2024-01-15T10:30:00.000Z"
        }
      ],
      "vehicles": [
        {
          "id": "vehicle_1",
          "variant": "Tata Harrier XZ Plus Diesel AT",
          "color": "Pearl White",
          "totalStock": 20,
          "onRoadPrice": 1850000
        }
      ]
    }
  }
}
```

---

## ❌ **ERROR RESPONSES**

### **Authentication Error (401)**
```typescript
{
  "success": false,
  "message": "Authentication failed",
  "error": "Invalid or expired token"
}
```

### **Authorization Error (403)**
```typescript
{
  "success": false,
  "message": "Insufficient permissions",
  "error": "You don't have permission to perform this action"
}
```

### **Validation Error (400)**
```typescript
{
  "success": false,
  "message": "Validation failed",
  "error": "Customer name is required",
  "details": {
    "field": "customerName",
    "value": "",
    "constraint": "required"
  }
}
```

### **Not Found Error (404)**
```typescript
{
  "success": false,
  "message": "Resource not found",
  "error": "Enquiry with ID 'invalid_id' not found"
}
```

### **Server Error (500)**
```typescript
{
  "success": false,
  "message": "Internal server error",
  "error": "Database connection failed"
}
```

---

## 📱 **EXPO APP INTEGRATION EXAMPLES**

### **1. API Client Setup**
```typescript
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_BASE_URL = 'https://automotive-backend-frqe.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
```

### **2. Fetch Enquiries Example**
```typescript
import apiClient from './api/client';

const fetchEnquiries = async (page = 1, limit = 20) => {
  try {
    const response = await apiClient.get(`/enquiries?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch enquiries:', error);
    throw error;
  }
};
```

### **3. Create Booking Example**
```typescript
const createBooking = async (bookingData) => {
  try {
    const response = await apiClient.post('/bookings', bookingData);
    return response.data;
  } catch (error) {
    console.error('Failed to create booking:', error);
    throw error;
  }
};

// Usage
const newBooking = await createBooking({
  customerName: "John Smith",
  customerPhone: "+919876543210",
  variant: "Tata Harrier XZ Plus Diesel AT",
  dealerCode: "TATA001"
});
```

### **4. File Upload Example**
```typescript
const uploadBulkBookings = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/bookings/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw error;
  }
};
```

---

## 🎯 **USAGE TIPS**

### **1. Error Handling**
```typescript
const handleApiCall = async () => {
  try {
    const response = await apiClient.get('/enquiries');
    // Handle success
    console.log('Success:', response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      // Handle authentication error
      // Redirect to login
    } else if (error.response?.status === 403) {
      // Handle authorization error
      // Show permission denied message
    } else if (error.response?.status === 400) {
      // Handle validation error
      console.error('Validation Error:', error.response.data.error);
    } else {
      // Handle other errors
      console.error('API Error:', error.message);
    }
  }
};
```

### **2. Loading States**
```typescript
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const response = await apiClient.get('/enquiries');
    setData(response.data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

### **3. Pagination Handling**
```typescript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const loadMore = async () => {
  if (!hasMore || loading) return;
  
  const nextPage = page + 1;
  const response = await apiClient.get(`/enquiries?page=${nextPage}`);
  
  if (response.data.data.enquiries.length === 0) {
    setHasMore(false);
  } else {
    setData(prevData => [...prevData, ...response.data.data.enquiries]);
    setPage(nextPage);
  }
};
```

---

## 🚀 **QUICK REFERENCE**

### **Base URL:** `https://automotive-backend-frqe.onrender.com/api`

### **Authentication:** Bearer Token (Firebase ID Token)

### **Common Headers:**
```typescript
{
  "Authorization": "Bearer <firebase_id_token>",
  "Content-Type": "application/json"
}
```

### **Response Format:**
```typescript
{
  "success": boolean,
  "message": string,
  "data": any
}
```

### **Pagination Format:**
```typescript
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "totalPages": number
    }
  }
}
```

**This complete API reference provides everything you need to integrate your Expo app with the backend! 🎉**
