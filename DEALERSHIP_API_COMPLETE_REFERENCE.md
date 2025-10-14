# 🏢 DEALERSHIP API - COMPLETE REFERENCE

## 🔗 **BASE URL**

```
https://automotive-backend-frqe.onrender.com/api
```

**Authentication:** All endpoints require Firebase ID token in Authorization header

```typescript
headers: {
  'Authorization': `Bearer ${firebaseIdToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📋 **ALL DEALERSHIP ENDPOINTS**

### **1. CREATE DEALERSHIP**

**Endpoint:**
```
POST /api/dealerships
```

**Permissions:** ADMIN only (without existing dealership)

**Request Body:**
```json
{
  "name": "Mumbai Tata Motors",
  "code": "TATA-MUM-001",
  "type": "TATA",
  "email": "contact@mumbaitata.com",
  "phone": "+91-22-12345678",
  "address": "123 Mumbai Highway",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "gstNumber": "27AABCT1234A1Z5",
  "panNumber": "AABCT1234A",
  "brands": ["TATA"]
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "message": "Dealership created successfully. You are now assigned to this dealership.",
  "data": {
    "dealership": {
      "id": "cmgphfcpi0005i6n4c6lmitk7",
      "name": "Mumbai Tata Motors",
      "code": "TATA-MUM-001",
      "type": "TATA",
      "email": "contact@mumbaitata.com",
      "phone": "+91-22-12345678",
      "address": "123 Mumbai Highway",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "gstNumber": "27AABCT1234A1Z5",
      "panNumber": "AABCT1234A",
      "brands": ["TATA"],
      "isActive": true,
      "onboardingCompleted": false,
      "createdAt": "2025-10-14T14:30:00.000Z",
      "updatedAt": "2025-10-14T14:30:00.000Z"
    }
  }
}
```

**Error Response (Already has dealership): 403**
```json
{
  "success": false,
  "error": "You are already managing a dealership. In multi-tenant mode, each admin manages only one dealership."
}
```

**cURL Example:**
```bash
curl -X POST https://automotive-backend-frqe.onrender.com/api/dealerships \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mumbai Tata Motors",
    "code": "TATA-MUM-001",
    "type": "TATA",
    "email": "contact@mumbaitata.com",
    "phone": "+91-22-12345678",
    "address": "123 Mumbai Highway",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "brands": ["TATA"]
  }'
```

---

### **2. GET ALL DEALERSHIPS**

**Endpoint:**
```
GET /api/dealerships?page=1&limit=10&isActive=true&search=tata
```

**Permissions:** All authenticated users

**Query Parameters:**
```typescript
{
  page?: number;        // Default: 1
  limit?: number;       // Default: 10, Max: 100
  type?: string;        // Filter by type: TATA, UNIVERSAL, etc.
  isActive?: boolean;   // Filter by active status
  search?: string;      // Search by name, code, or email
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Dealerships retrieved successfully",
  "data": {
    "dealerships": [
      {
        "id": "cmgphfcpi0005i6n4c6lmitk7",
        "name": "Aditya jaif",
        "code": "TATA001",
        "type": "TATA",
        "email": "aditya@test.com",
        "phone": "+91-1234567890",
        "address": "Test Address",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "gstNumber": null,
        "panNumber": null,
        "brands": ["TATA"],
        "isActive": true,
        "onboardingCompleted": true,
        "createdAt": "2025-10-14T14:15:00.000Z",
        "updatedAt": "2025-10-14T14:15:00.000Z",
        "_count": {
          "users": 5,
          "bookings": 0,
          "enquiries": 0,
          "vehicleCatalogs": 4
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Note:** In multi-tenant mode, returns only the user's own dealership.

**cURL Example:**
```bash
curl https://automotive-backend-frqe.onrender.com/api/dealerships?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### **3. GET DEALERSHIP BY ID**

**Endpoint:**
```
GET /api/dealerships/:id
```

**Permissions:** All authenticated users (must be their own dealership)

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Dealership retrieved successfully",
  "data": {
    "dealership": {
      "id": "cmgphfcpi0005i6n4c6lmitk7",
      "name": "Aditya jaif",
      "code": "TATA001",
      "type": "TATA",
      "email": "aditya@test.com",
      "phone": "+91-1234567890",
      "address": "Test Address",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "gstNumber": null,
      "panNumber": null,
      "brands": ["TATA"],
      "isActive": true,
      "onboardingCompleted": true,
      "createdAt": "2025-10-14T14:15:00.000Z",
      "updatedAt": "2025-10-14T14:15:00.000Z",
      "_count": {
        "users": 5,
        "bookings": 0,
        "enquiries": 0,
        "vehicleCatalogs": 4
      }
    }
  }
}
```

**cURL Example:**
```bash
curl https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7 \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### **4. UPDATE DEALERSHIP**

**Endpoint:**
```
PATCH /api/dealerships/:id
```

**Permissions:** ADMIN, GENERAL_MANAGER, SALES_MANAGER (own dealership only)

**Request Body:** (All fields optional)
```json
{
  "name": "Updated Dealership Name",
  "type": "UNIVERSAL",
  "email": "newemail@dealership.com",
  "phone": "+91-9876543210",
  "address": "New Address",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "gstNumber": "07AABCT1234A1Z5",
  "panNumber": "AABCT1234B",
  "brands": ["TATA", "MAHINDRA"]
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Dealership updated successfully",
  "data": {
    "dealership": {
      "id": "cmgphfcpi0005i6n4c6lmitk7",
      "name": "Updated Dealership Name",
      "code": "TATA001",
      "type": "UNIVERSAL",
      "email": "newemail@dealership.com",
      "phone": "+91-9876543210",
      "address": "New Address",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "gstNumber": "07AABCT1234A1Z5",
      "panNumber": "AABCT1234B",
      "brands": ["TATA", "MAHINDRA"],
      "isActive": true,
      "onboardingCompleted": true,
      "createdAt": "2025-10-14T14:15:00.000Z",
      "updatedAt": "2025-10-14T14:45:00.000Z"
    }
  }
}
```

**cURL Example:**
```bash
curl -X PATCH https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7 \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Dealership Name",
    "city": "Delhi"
  }'
```

---

### **5. ACTIVATE DEALERSHIP**

**Endpoint:**
```
POST /api/dealerships/:id/activate
```

**Permissions:** ADMIN only

**Request Body:** None

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Dealership activated successfully",
  "data": {
    "dealership": {
      "id": "cmgphfcpi0005i6n4c6lmitk7",
      "name": "Aditya jaif",
      "code": "TATA001",
      "isActive": true,
      ...
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/activate \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### **6. DEACTIVATE DEALERSHIP**

**Endpoint:**
```
POST /api/dealerships/:id/deactivate
```

**Permissions:** ADMIN only

**Request Body:** None

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Dealership deactivated successfully",
  "data": {
    "dealership": {
      "id": "cmgphfcpi0005i6n4c6lmitk7",
      "name": "Aditya jaif",
      "code": "TATA001",
      "isActive": false,
      ...
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/deactivate \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### **7. COMPLETE ONBOARDING**

**Endpoint:**
```
POST /api/dealerships/:id/complete-onboarding
```

**Permissions:** ADMIN only

**Request Body:** None

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Dealership onboarding completed successfully",
  "data": {
    "dealership": {
      "id": "cmgphfcpi0005i6n4c6lmitk7",
      "name": "Aditya jaif",
      "code": "TATA001",
      "onboardingCompleted": true,
      ...
    }
  }
}
```

---

## 🚗 **VEHICLE CATALOG ENDPOINTS**

### **8. GET DEALERSHIP CATALOG**

**Endpoint:**
```
GET /api/dealerships/:dealershipId/catalog?brand=TATA
```

**Permissions:** All authenticated users

**Query Parameters:**
```typescript
{
  brand?: string;  // Optional: Filter by brand
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Dealership catalog retrieved successfully",
  "data": {
    "dealershipId": "cmgphfcpi0005i6n4c6lmitk7",
    "catalogs": [
      {
        "id": "cmgphfcx10007i6n4i8axvwvh",
        "dealershipId": "cmgphfcpi0005i6n4c6lmitk7",
        "brand": "TATA",
        "model": "nexon",
        "isActive": true,
        "variants": [
          {
            "id": "0-0",
            "name": "xz",
            "vcCode": "NXN-007-11",
            "fuelTypes": ["Petrol"],
            "transmissions": ["Manual"],
            "colors": [],
            "exShowroomPrice": 0,
            "onRoadPrice": 0
          }
        ],
        "createdAt": "2025-10-14T14:15:00.000Z",
        "updatedAt": "2025-10-14T14:15:00.000Z"
      },
      {
        "id": "cmgphfd1o0009i6n43bd2j8z0",
        "dealershipId": "cmgphfcpi0005i6n4c6lmitk7",
        "brand": "TATA",
        "model": "harrier",
        "isActive": true,
        "variants": [...],
        "createdAt": "2025-10-14T14:15:00.000Z",
        "updatedAt": "2025-10-14T14:15:00.000Z"
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### **9. GET COMPLETE CATALOG (STRUCTURED)**

**Endpoint:**
```
GET /api/dealerships/:dealershipId/catalog/complete
```

**Permissions:** All authenticated users

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Complete catalog retrieved successfully",
  "data": {
    "dealershipId": "cmgphfcpi0005i6n4c6lmitk7",
    "catalog": {
      "TATA": [
        {
          "id": "cmgphfcx10007i6n4i8axvwvh",
          "model": "nexon",
          "variants": [
            {
              "id": "0-0",
              "name": "xz",
              "vcCode": "NXN-007-11",
              "fuelTypes": ["Petrol"],
              "transmissions": ["Manual"],
              "colors": [],
              "exShowroomPrice": 0,
              "onRoadPrice": 0
            }
          ],
          "createdAt": "2025-10-14T14:15:00.000Z",
          "updatedAt": "2025-10-14T14:15:00.000Z"
        },
        {
          "id": "cmgphfd1o0009i6n43bd2j8z0",
          "model": "harrier",
          "variants": [...],
          "createdAt": "2025-10-14T14:15:00.000Z",
          "updatedAt": "2025-10-14T14:15:00.000Z"
        }
      ]
    }
  }
}
```

**Use This For:** Displaying catalog grouped by brand in your app

**cURL Example:**
```bash
curl https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog/complete \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### **10. ADD VEHICLE TO CATALOG**

**Endpoint:**
```
POST /api/dealerships/:dealershipId/catalog
```

**Permissions:** ADMIN, GENERAL_MANAGER, SALES_MANAGER

**Request Body:**
```json
{
  "brand": "TATA",
  "model": "Punch",
  "variants": [
    {
      "name": "Adventure Petrol MT",
      "vcCode": "PUNCH-ADV-P-MT",
      "fuelTypes": ["Petrol"],
      "transmissions": ["Manual"],
      "colors": [
        {
          "name": "Atomic Orange",
          "code": "AO",
          "additionalCost": 0,
          "isAvailable": true
        },
        {
          "name": "Daytona Grey",
          "code": "DG",
          "additionalCost": 3000,
          "isAvailable": true
        }
      ],
      "exShowroomPrice": 649000,
      "rtoCharges": 65000,
      "insurance": 28000,
      "accessories": 10000,
      "onRoadPrice": 752000,
      "isAvailable": true
    },
    {
      "name": "Creative Diesel AMT",
      "vcCode": "PUNCH-CRT-D-AMT",
      "fuelTypes": ["Diesel"],
      "transmissions": ["Automatic"],
      "colors": [
        {
          "name": "Atomic Orange",
          "code": "AO",
          "additionalCost": 0,
          "isAvailable": true
        }
      ],
      "exShowroomPrice": 899000,
      "rtoCharges": 80000,
      "insurance": 35000,
      "accessories": 15000,
      "onRoadPrice": 1029000,
      "isAvailable": true
    }
  ]
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "message": "Vehicle added to catalog successfully",
  "data": {
    "catalog": {
      "id": "new-catalog-id",
      "dealershipId": "cmgphfcpi0005i6n4c6lmitk7",
      "brand": "TATA",
      "model": "Punch",
      "isActive": true,
      "variants": [
        {
          "name": "Adventure Petrol MT",
          "vcCode": "PUNCH-ADV-P-MT",
          "fuelTypes": ["Petrol"],
          "transmissions": ["Manual"],
          "colors": [...],
          "exShowroomPrice": 649000,
          "rtoCharges": 65000,
          "insurance": 28000,
          "accessories": 10000,
          "onRoadPrice": 752000,
          "isAvailable": true
        },
        {
          "name": "Creative Diesel AMT",
          "vcCode": "PUNCH-CRT-D-AMT",
          ...
        }
      ],
      "createdAt": "2025-10-14T15:00:00.000Z",
      "updatedAt": "2025-10-14T15:00:00.000Z"
    }
  }
}
```

**Error: 409 Conflict (Model already exists)**
```json
{
  "success": false,
  "error": "Vehicle model already exists in catalog"
}
```

**cURL Example:**
```bash
curl -X POST https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "TATA",
    "model": "Punch",
    "variants": [...]
  }'
```

---

### **11. GET AVAILABLE BRANDS**

**Endpoint:**
```
GET /api/dealerships/:dealershipId/catalog/brands
```

**Permissions:** All authenticated users

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Brands retrieved successfully",
  "data": {
    "brands": ["TATA"]
  }
}
```

**cURL Example:**
```bash
curl https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog/brands \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### **12. GET MODELS BY BRAND**

**Endpoint:**
```
GET /api/dealerships/:dealershipId/catalog/models?brand=TATA
```

**Permissions:** All authenticated users

**Query Parameters:**
```typescript
{
  brand: string;  // Required: Brand name
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Models retrieved successfully",
  "data": {
    "models": [
      {
        "model": "nexon",
        "catalogId": "cmgphfcx10007i6n4i8axvwvh",
        "isActive": true
      },
      {
        "model": "harrier",
        "catalogId": "cmgphfd1o0009i6n43bd2j8z0",
        "isActive": true
      },
      {
        "model": "safari",
        "catalogId": "cmgphfd7o000bi6n4fwviu5xx",
        "isActive": true
      },
      {
        "model": "indigo",
        "catalogId": "cmgphfdbx000di6n4whtj6f2j",
        "isActive": true
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl "https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog/models?brand=TATA" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### **13. GET MODEL VARIANTS**

**Endpoint:**
```
GET /api/dealerships/:dealershipId/catalog/:catalogId/variants
```

**Permissions:** All authenticated users

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Variants retrieved successfully",
  "data": {
    "brand": "TATA",
    "model": "nexon",
    "variants": [
      {
        "id": "0-0",
        "name": "xz",
        "vcCode": "NXN-007-11",
        "fuelTypes": ["Petrol"],
        "transmissions": ["Manual"],
        "colors": [],
        "exShowroomPrice": 0,
        "onRoadPrice": 0
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog/cmgphfcx10007i6n4i8axvwvh/variants \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

### **14. UPDATE CATALOG ENTRY**

**Endpoint:**
```
PATCH /api/dealerships/:dealershipId/catalog/:catalogId
```

**Permissions:** ADMIN, GENERAL_MANAGER, SALES_MANAGER

**Request Body:**
```json
{
  "isActive": true,
  "variants": [
    {
      "name": "XZ+ Lux Petrol AT",
      "vcCode": "NXN-XZ-LUX-P-AT",
      "fuelTypes": ["Petrol"],
      "transmissions": ["Automatic"],
      "colors": [
        {
          "name": "Flame Red",
          "code": "FR",
          "additionalCost": 0,
          "isAvailable": true
        },
        {
          "name": "Pearl White",
          "code": "PW",
          "additionalCost": 5000,
          "isAvailable": true
        }
      ],
      "exShowroomPrice": 1149000,
      "rtoCharges": 85000,
      "insurance": 45000,
      "accessories": 15000,
      "onRoadPrice": 1294000,
      "isAvailable": true
    }
  ]
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Catalog updated successfully",
  "data": {
    "catalog": {
      "id": "cmgphfcx10007i6n4i8axvwvh",
      "dealershipId": "cmgphfcpi0005i6n4c6lmitk7",
      "brand": "TATA",
      "model": "nexon",
      "isActive": true,
      "variants": [
        {
          "name": "XZ+ Lux Petrol AT",
          "vcCode": "NXN-XZ-LUX-P-AT",
          ...
        }
      ],
      "createdAt": "2025-10-14T14:15:00.000Z",
      "updatedAt": "2025-10-14T15:00:00.000Z"
    }
  }
}
```

**cURL Example:**
```bash
curl -X PATCH https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog/cmgphfcx10007i6n4i8axvwvh \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "variants": [
      {
        "name": "XZ+ Lux Petrol AT",
        "vcCode": "NXN-XZ-LUX-P-AT",
        "fuelTypes": ["Petrol"],
        "transmissions": ["Automatic"],
        "colors": [...],
        "exShowroomPrice": 1149000,
        "onRoadPrice": 1294000
      }
    ]
  }'
```

---

### **15. DELETE CATALOG ENTRY**

**Endpoint:**
```
DELETE /api/dealerships/:dealershipId/catalog/:catalogId
```

**Permissions:** ADMIN, GENERAL_MANAGER only

**Request Body:** None

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Catalog entry deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE https://automotive-backend-frqe.onrender.com/api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog/cmgphfcx10007i6n4i8axvwvh \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

## 📱 **EXPO APP INTEGRATION**

### **Fetch Complete Catalog (Recommended)**

```typescript
// services/catalogApi.ts
import { getAuth } from 'firebase/auth';

export const fetchCatalog = async (dealershipId: string) => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch(
    `https://automotive-backend-frqe.onrender.com/api/dealerships/${dealershipId}/catalog/complete`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  
  if (data.success) {
    return data.data.catalog;  // Grouped by brand
  } else {
    throw new Error(data.error || 'Failed to fetch catalog');
  }
};

// Usage in component
const { user } = useAuth();
const catalog = await fetchCatalog(user.dealershipId);

// Access vehicles
catalog["TATA"].forEach(model => {
  console.log(model.model);  // "nexon", "harrier", etc.
  model.variants.forEach(variant => {
    console.log(variant.name);  // "XZ+ Lux Petrol AT"
  });
});
```

---

### **Add Vehicle to Catalog**

```typescript
export const addVehicle = async (
  dealershipId: string,
  vehicleData: {
    brand: string;
    model: string;
    variants: Variant[];
  }
) => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch(
    `https://automotive-backend-frqe.onrender.com/api/dealerships/${dealershipId}/catalog`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vehicleData)
    }
  );
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to add vehicle');
  }
  
  return data.data.catalog;
};
```

---

### **Update Catalog Variants**

```typescript
export const updateCatalogVariants = async (
  dealershipId: string,
  catalogId: string,
  variants: Variant[]
) => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch(
    `https://automotive-backend-frqe.onrender.com/api/dealerships/${dealershipId}/catalog/${catalogId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ variants })
    }
  );
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to update catalog');
  }
  
  return data.data.catalog;
};
```

---

## 🔧 **YOUR CURRENT CATALOG DATA**

**Dealership:** Aditya jaif (TATA001)  
**Dealership ID:** `cmgphfcpi0005i6n4c6lmitk7`

**Catalog Entries (4):**

| ID | Brand | Model | Variants |
|----|-------|-------|----------|
| cmgphfcx10007i6n4i8axvwvh | TATA | nexon | 1 variant |
| cmgphfd1o0009i6n43bd2j8z0 | TATA | harrier | 1+ variants |
| cmgphfd7o000bi6n4fwviu5xx | TATA | safari | 1+ variants |
| cmgphfdbx000di6n4whtj6f2j | TATA | indigo | 1+ variants |

---

## ✅ **QUICK REFERENCE**

**Your Dealership ID:**
```
cmgphfcpi0005i6n4c6lmitk7
```

**Fetch Catalog:**
```
GET /api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog/complete
```

**Update Nexon:**
```
PATCH /api/dealerships/cmgphfcpi0005i6n4c6lmitk7/catalog/cmgphfcx10007i6n4i8axvwvh
```

---

## 🎉 **SUMMARY**

**Total Endpoints:** 15
- **7** Dealership management endpoints
- **8** Vehicle catalog endpoints

**All endpoints** support multi-tenant isolation.  
**All data** automatically scoped to user's dealership.  
**Ready to use** in your Expo app! 🚀

