# 📱 EXPO APP - COMPLETE BACKEND INTEGRATION GUIDE

## 🎯 Purpose
This is the **COMPLETE** integration guide for your React Native/Expo app. Copy this entire document to your frontend machine for full implementation.

---

## 🔗 **Backend Configuration**

**Base URL:**
```typescript
const API_URL = 'http://10.69.245.247:4000/api';
```

**Authentication Header:**
```typescript
const token = await getAuth().currentUser?.getIdToken();

headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 🔐 **Test Credentials**

```typescript
// Use these for testing
const TEST_ADVISOR = {
  email: 'advisor@test.com',
  password: 'TestPass123!',
  role: 'CUSTOMER_ADVISOR',
  firebaseUid: 'kryTfSsgR7MRqZW5qYMGE9liI9s1'
};
```

---

## 📋 **1. ENQUIRIES - COMPLETE API**

### **A. Create Enquiry**

**Endpoint:** `POST /api/enquiries`

**Request Body:**
```typescript
{
  customerName: string;        // ✅ REQUIRED
  customerContact: string;     // ✅ REQUIRED (with country code)
  customerEmail?: string;      // ❌ Optional
  model: string;               // ✅ REQUIRED
  variant?: string;            // ❌ Optional
  color?: string;              // ❌ Optional
  source: EnquirySource;       // ✅ REQUIRED (UPPERCASE enum)
  caRemarks?: string;          // ❌ Optional
  dealerCode?: string;         // ❌ Optional (defaults to DEFAULT001)
}
```

**EnquirySource Enum (MUST BE UPPERCASE):**
```typescript
enum EnquirySource {
  SHOWROOM = 'SHOWROOM',
  WEBSITE = 'WEBSITE',
  PHONE = 'PHONE',
  REFERRAL = 'REFERRAL',
  WALK_IN = 'WALK_IN'
}
```

**Example Request:**
```typescript
const newEnquiry = await fetch(`${API_URL}/enquiries`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerName: "John Doe",
    customerContact: "+919876543210",
    customerEmail: "john@example.com",
    model: "Tata Nexon",
    variant: "Tata Nexon XZ Plus Petrol AT",
    color: "Blue",
    source: "WEBSITE",  // ← UPPERCASE!
    caRemarks: "Interested in automatic transmission",
    dealerCode: "TATA001"
  })
});

const result = await newEnquiry.json();
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiry created successfully",
  "data": {
    "enquiry": {
      "id": "cmgj8k9yx000ek4jzcjzo8yrh",
      "customerName": "John Doe",
      "customerContact": "+919876543210",
      "customerEmail": "john@example.com",
      "model": "Tata Nexon",
      "variant": "Tata Nexon XZ Plus Petrol AT",
      "color": "Blue",
      "source": "WEBSITE",
      "status": "OPEN",
      "category": "HOT",
      "caRemarks": "Interested in automatic transmission",
      "dealerCode": "TATA001",
      "createdByUserId": "kryTfSsgR7MRqZW5qYMGE9liI9s1",
      "assignedToUserId": null,
      "createdAt": "2025-10-09T09:00:00.000Z",
      "updatedAt": "2025-10-09T09:00:00.000Z"
    }
  }
}
```

---

### **B. Get My Enquiries**

**Endpoint:** `GET /api/enquiries`

**Query Parameters:**
```typescript
interface EnquiryQueryParams {
  page?: number;           // Default: 1
  limit?: number;          // Default: 10, Max: 100
  category?: 'HOT' | 'LOST' | 'BOOKED';
  status?: EnquiryStatus;
  sortBy?: string;         // Default: 'createdAt'
  sortOrder?: 'asc' | 'desc';  // Default: 'desc'
}
```

**Example Request:**
```typescript
// Get all HOT enquiries
const response = await fetch(
  `${API_URL}/enquiries?category=HOT&page=1&limit=100`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const result = await response.json();
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiries retrieved successfully",
  "data": {
    "enquiries": [
      {
        "id": "cmgj8k9yx000ek4jzcjzo8yrh",
        "customerName": "John Doe",
        "customerContact": "+919876543210",
        "model": "Tata Nexon",
        "variant": "Tata Nexon XZ Plus Petrol AT",
        "status": "OPEN",
        "category": "HOT",
        "createdAt": "2025-10-09T09:00:00.000Z",
        "createdBy": {
          "firebaseUid": "kryTfSsgR7MRqZW5qYMGE9liI9s1",
          "name": "Advisor Name",
          "email": "advisor@test.com"
        },
        "_count": {
          "bookings": 0,
          "quotations": 1
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### **C. Update Enquiry / Convert to Booking**

**Endpoint:** `PUT /api/enquiries/:id`

**Request Body (all fields optional):**
```typescript
{
  customerName?: string;
  customerContact?: string;
  customerEmail?: string;
  model?: string;
  variant?: string;
  color?: string;
  status?: EnquiryStatus;
  category?: 'HOT' | 'LOST' | 'BOOKED';  // ← BOOKED triggers auto-conversion
  caRemarks?: string;
}
```

**Example: Convert to Booking**
```typescript
const response = await fetch(`${API_URL}/enquiries/${enquiryId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    category: "BOOKED"  // ← This triggers auto-conversion
  })
});

const result = await response.json();

if (result.success && result.data.booking) {
  // Booking was created!
  console.log("Booking ID:", result.data.booking.id);
  console.log("Stock Status:", result.data.stockValidation);
} else {
  // Out of stock or error
  Alert.alert("Error", result.message);
}
```

**Success Response (In Stock):**
```json
{
  "success": true,
  "message": "Enquiry updated and booking created successfully. Stock validated.",
  "data": {
    "enquiry": {
      "id": "cmgj8k9yx000ek4jzcjzo8yrh",
      "status": "CLOSED",
      "category": "BOOKED"
    },
    "booking": {
      "id": "cmgj8ka0c000gk4jz2ujgkhgk",
      "customerName": "Test Booking Customer",
      "variant": "Tata Harrier EV Adventure",
      "status": "PENDING",
      "stockAvailability": "VEHICLE_AVAILABLE",
      "advisorId": "kryTfSsgR7MRqZW5qYMGE9liI9s1",
      "dealerCode": "TATA001"
    },
    "stockValidation": {
      "variant": "Tata Harrier EV Adventure",
      "inStock": true,
      "stockLocations": {
        "zawlStock": 10,
        "rasStock": 5,
        "regionalStock": 3
      }
    }
  }
}
```

**Error Response (Out of Stock):**
```json
{
  "success": false,
  "message": "Vehicle variant \"Tata Harrier XZ Plus Diesel AT\" is not in stock. Cannot convert to booking."
}
```

---

## 🚗 **2. BOOKINGS - COMPLETE API**

### **A. Get My Bookings**

**Endpoint:** `GET /api/bookings/advisor/my-bookings`

**Query Parameters:**
```typescript
interface BookingQueryParams {
  page?: number;           // Default: 1
  limit?: number;          // Default: 10, Max: 100
  status?: BookingStatus;
  timeline?: TimelineCategory;
}

type TimelineCategory = 'today' | 'delivery_today' | 'pending_update' | 'overdue';
```

**Example Requests:**
```typescript
// All bookings
const all = await fetch(`${API_URL}/bookings/advisor/my-bookings`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Today's actions
const today = await fetch(
  `${API_URL}/bookings/advisor/my-bookings?timeline=today`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// Today's deliveries
const deliveries = await fetch(
  `${API_URL}/bookings/advisor/my-bookings?timeline=delivery_today`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// Pending updates (stale bookings)
const pending = await fetch(
  `${API_URL}/bookings/advisor/my-bookings?timeline=pending_update`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// Overdue deliveries
const overdue = await fetch(
  `${API_URL}/bookings/advisor/my-bookings?timeline=overdue`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

**Response:**
```json
{
  "success": true,
  "message": "Bookings for timeline 'today' retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "cmgj8ka0c000gk4jz2ujgkhgk",
        "customerName": "Test Booking Customer",
        "customerPhone": "+918888888888",
        "customerEmail": "testbooking@example.com",
        "status": "CONFIRMED",
        "variant": "Tata Harrier EV Adventure",
        "color": "Blue",
        "bookingDate": "2025-10-09T09:49:27.852Z",
        "expectedDeliveryDate": "2025-10-09T09:50:38.000Z",
        "financeRequired": true,
        "financerName": "HDFC Bank",
        "fileLoginDate": "2025-10-09T09:50:38.000Z",
        "approvalDate": null,
        "stockAvailability": "VEHICLE_AVAILABLE",
        "backOrderStatus": false,
        "rtoDate": null,
        "advisorRemarks": "Customer confirmed, finance approved, delivery scheduled for today",
        "dealerCode": "TATA001",
        "advisorId": "kryTfSsgR7MRqZW5qYMGE9liI9s1",
        "source": "MOBILE",
        "createdAt": "2025-10-09T09:49:27.852Z",
        "updatedAt": "2025-10-09T09:50:38.475Z"
      }
    ],
    "timeline": "today",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### **B. Update Booking**

**Endpoint:** `PUT /api/bookings/:id/update-status`

**Advisor Can Update These Fields:**
```typescript
interface UpdateBookingRequest {
  status?: BookingStatus;                // Enum
  expectedDeliveryDate?: string;         // ISO DateTime
  financeRequired?: boolean;             // Boolean
  financerName?: string;                 // String
  fileLoginDate?: string;                // ISO DateTime
  approvalDate?: string;                 // ISO DateTime
  stockAvailability?: StockAvailability; // Enum
  backOrderStatus?: boolean;             // Boolean
  rtoDate?: string;                      // ISO DateTime
  advisorRemarks?: string;               // String
}
```

**Enums:**
```typescript
enum BookingStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  DELIVERED = 'DELIVERED'
}

enum StockAvailability {
  VNA = 'VNA',                           // Vehicle Not Available
  VEHICLE_AVAILABLE = 'VEHICLE_AVAILABLE'
}
```

**⚠️ CRITICAL: Date Format**
```typescript
// ✅ CORRECT - ISO-8601 DateTime
const correctDate = new Date().toISOString();
// Result: "2025-10-09T10:30:00.000Z"

const correctDate2 = new Date("2025-11-15").toISOString();
// Result: "2025-11-15T00:00:00.000Z"

// ❌ WRONG - Will cause errors
const wrongDate = "2025-10-09";
const wrongDate2 = "10/09/2025";
```

**Example Request:**
```typescript
const response = await fetch(
  `${API_URL}/bookings/${bookingId}/update-status`,
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: "CONFIRMED",
      financeRequired: true,
      financerName: "HDFC Bank",
      fileLoginDate: new Date().toISOString(),
      approvalDate: new Date("2025-10-12").toISOString(),
      expectedDeliveryDate: new Date("2025-11-15").toISOString(),
      stockAvailability: "VEHICLE_AVAILABLE",
      advisorRemarks: "Finance approved by HDFC, delivery confirmed for Nov 15"
    })
  }
);

const result = await response.json();
```

**Response:**
```json
{
  "success": true,
  "message": "Booking updated successfully",
  "data": {
    "booking": {
      "id": "cmgj8ka0c000gk4jz2ujgkhgk",
      "status": "CONFIRMED",
      "financeRequired": true,
      "financerName": "HDFC Bank",
      "advisorRemarks": "Finance approved...",
      "updatedAt": "2025-10-09T10:00:00.000Z"
    },
    "updatedBy": {
      "userId": "kryTfSsgR7MRqZW5qYMGE9liI9s1",
      "userName": "Advisor Name",
      "userRole": "CUSTOMER_ADVISOR"
    }
  }
}
```

---

## 💰 **3. QUOTATIONS - COMPLETE API**

### **Create Quotation** (Currently Team Lead+ only)

**Endpoint:** `POST /api/quotations`

**Request:**
```typescript
{
  enquiryId: string;   // ✅ REQUIRED
  amount: number;      // ✅ REQUIRED (must be > 0)
  pdfUrl?: string;     // ❌ Optional
}
```

**Example:**
```typescript
const quotation = await fetch(`${API_URL}/quotations`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enquiryId: "cmgj8k9yx000ek4jzcjzo8yrh",
    amount: 1250000,
    pdfUrl: "https://example.com/quotation.pdf"
  })
});
```

**Response:**
```json
{
  "success": true,
  "message": "Quotation created successfully",
  "data": {
    "quotation": {
      "id": "cmgj9xyz123",
      "enquiryId": "cmgj8k9yx000ek4jzcjzo8yrh",
      "amount": 1250000,
      "status": "PENDING",
      "pdfUrl": "https://example.com/quotation.pdf",
      "createdAt": "2025-10-09T10:00:00.000Z",
      "enquiry": {
        "customerName": "John Doe",
        "model": "Tata Nexon"
      }
    }
  }
}
```

---

## 🔧 **COMPLETE SERVICE LAYER**

### **Create These Files in Your Expo App:**

#### **services/api.config.ts**
```typescript
export const API_URL = 'http://10.69.245.247:4000/api';

export async function getAuthToken(): Promise<string> {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result.data;
}
```

#### **services/enquiry.service.ts**
```typescript
import { apiRequest } from './api.config';
import { EnquirySource, EnquiryCategory, EnquiryStatus } from './types';

export interface CreateEnquiryData {
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  model: string;
  variant?: string;
  color?: string;
  source: EnquirySource;
  caRemarks?: string;
  dealerCode?: string;
}

export interface UpdateEnquiryData {
  customerName?: string;
  customerContact?: string;
  customerEmail?: string;
  model?: string;
  variant?: string;
  color?: string;
  status?: EnquiryStatus;
  category?: EnquiryCategory;
  caRemarks?: string;
}

export const enquiryService = {
  async createEnquiry(data: CreateEnquiryData) {
    return await apiRequest('/enquiries', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getMyEnquiries(page = 1, category?: EnquiryCategory) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '100',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    
    if (category) params.append('category', category);
    
    return await apiRequest(`/enquiries?${params}`);
  },

  async getEnquiryById(id: string) {
    return await apiRequest(`/enquiries/${id}`);
  },

  async updateEnquiry(id: string, data: UpdateEnquiryData) {
    return await apiRequest(`/enquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async convertToBooking(id: string) {
    return await apiRequest(`/enquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ category: 'BOOKED' })
    });
  }
};
```

#### **services/booking.service.ts**
```typescript
import { apiRequest } from './api.config';
import { BookingStatus, StockAvailability, TimelineCategory } from './types';

export interface UpdateBookingData {
  status?: BookingStatus;
  expectedDeliveryDate?: string;  // ISO DateTime
  financeRequired?: boolean;
  financerName?: string;
  fileLoginDate?: string;         // ISO DateTime
  approvalDate?: string;          // ISO DateTime
  stockAvailability?: StockAvailability;
  backOrderStatus?: boolean;
  rtoDate?: string;               // ISO DateTime
  advisorRemarks?: string;
}

export const bookingService = {
  async getMyBookings(timeline?: TimelineCategory, status?: BookingStatus) {
    const params = new URLSearchParams({
      page: '1',
      limit: '100'
    });
    
    if (timeline) params.append('timeline', timeline);
    if (status) params.append('status', status);
    
    return await apiRequest(`/bookings/advisor/my-bookings?${params}`);
  },

  async getBookingById(id: string) {
    return await apiRequest(`/bookings/${id}`);
  },

  async updateBooking(id: string, data: UpdateBookingData) {
    return await apiRequest(`/bookings/${id}/update-status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};
```

#### **services/quotation.service.ts**
```typescript
import { apiRequest } from './api.config';
import { QuotationStatus } from './types';

export interface CreateQuotationData {
  enquiryId: string;
  amount: number;
  pdfUrl?: string;
}

export const quotationService = {
  async createQuotation(data: CreateQuotationData) {
    return await apiRequest('/quotations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getQuotations(page = 1) {
    return await apiRequest(`/quotations?page=${page}&limit=10`);
  },

  async getQuotationById(id: string) {
    return await apiRequest(`/quotations/${id}`);
  },

  async updateQuotation(id: string, data: {
    amount?: number;
    status?: QuotationStatus;
    pdfUrl?: string;
  }) {
    return await apiRequest(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};
```

#### **services/types.ts**
```typescript
// ========== ENUMS ==========

export enum EnquirySource {
  SHOWROOM = 'SHOWROOM',
  WEBSITE = 'WEBSITE',
  PHONE = 'PHONE',
  REFERRAL = 'REFERRAL',
  WALK_IN = 'WALK_IN'
}

export enum EnquiryCategory {
  HOT = 'HOT',
  LOST = 'LOST',
  BOOKED = 'BOOKED'
}

export enum EnquiryStatus {
  OPEN = 'OPEN',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  CLOSED = 'CLOSED'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  DELIVERED = 'DELIVERED'
}

export enum StockAvailability {
  VNA = 'VNA',
  VEHICLE_AVAILABLE = 'VEHICLE_AVAILABLE'
}

export enum QuotationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export type TimelineCategory = 'today' | 'delivery_today' | 'pending_update' | 'overdue';

// ========== INTERFACES ==========

export interface Enquiry {
  id: string;
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  model: string;
  variant?: string;
  color?: string;
  source: EnquirySource;
  status: EnquiryStatus;
  category: EnquiryCategory;
  caRemarks?: string;
  dealerCode?: string;
  createdByUserId: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  status: BookingStatus;
  variant?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  bookingDate?: string;
  expectedDeliveryDate?: string;
  financeRequired?: boolean;
  financerName?: string;
  fileLoginDate?: string;
  approvalDate?: string;
  stockAvailability?: StockAvailability;
  backOrderStatus?: boolean;
  rtoDate?: string;
  advisorRemarks?: string;
  dealerCode: string;
  advisorId?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  enquiryId: string;
  amount: number;
  status: QuotationStatus;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎨 **UI IMPLEMENTATION EXAMPLES**

### **Enquiry Creation Form:**
```typescript
import React, { useState } from 'react';
import { View, TextInput, Button, Picker } from 'react-native';
import { enquiryService } from './services/enquiry.service';
import { EnquirySource } from './services/types';

const CreateEnquiryScreen = () => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerContact: '',
    customerEmail: '',
    model: '',
    variant: '',
    color: '',
    source: EnquirySource.WEBSITE,
    caRemarks: '',
    dealerCode: 'TATA001'
  });

  const handleSubmit = async () => {
    try {
      const result = await enquiryService.createEnquiry(formData);
      Alert.alert('Success', 'Enquiry created successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Customer Name *"
        value={formData.customerName}
        onChangeText={(text) => setFormData({...formData, customerName: text})}
      />
      
      <TextInput
        placeholder="Contact (+91...)"
        value={formData.customerContact}
        onChangeText={(text) => setFormData({...formData, customerContact: text})}
        keyboardType="phone-pad"
      />
      
      <TextInput
        placeholder="Email"
        value={formData.customerEmail}
        onChangeText={(text) => setFormData({...formData, customerEmail: text})}
        keyboardType="email-address"
      />
      
      <TextInput
        placeholder="Model *"
        value={formData.model}
        onChangeText={(text) => setFormData({...formData, model: text})}
      />
      
      <TextInput
        placeholder="Variant"
        value={formData.variant}
        onChangeText={(text) => setFormData({...formData, variant: text})}
      />
      
      <Picker
        selectedValue={formData.source}
        onValueChange={(value) => setFormData({...formData, source: value})}
      >
        <Picker.Item label="Showroom" value="SHOWROOM" />
        <Picker.Item label="Website" value="WEBSITE" />
        <Picker.Item label="Phone" value="PHONE" />
        <Picker.Item label="Referral" value="REFERRAL" />
        <Picker.Item label="Walk-in" value="WALK_IN" />
      </Picker>
      
      <TextInput
        placeholder="Remarks"
        value={formData.caRemarks}
        onChangeText={(text) => setFormData({...formData, caRemarks: text})}
        multiline
      />
      
      <Button title="Create Enquiry" onPress={handleSubmit} />
    </View>
  );
};
```

### **Enquiry Categories UI:**
```typescript
const EnquiriesScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState<EnquiryCategory>('HOT');
  const [enquiries, setEnquiries] = useState([]);

  const fetchEnquiries = async (category: EnquiryCategory) => {
    const data = await enquiryService.getMyEnquiries(1, category);
    setEnquiries(data.enquiries);
  };

  useEffect(() => {
    fetchEnquiries(selectedCategory);
  }, [selectedCategory]);

  return (
    <View>
      {/* Category Tabs */}
      <View style={styles.categoryTabs}>
        <TouchableOpacity
          style={[styles.tab, selectedCategory === 'HOT' && styles.activeTab]}
          onPress={() => setSelectedCategory('HOT')}
        >
          <Text>🔥 HOT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedCategory === 'LOST' && styles.activeTab]}
          onPress={() => setSelectedCategory('LOST')}
        >
          <Text>❌ LOST</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedCategory === 'BOOKED' && styles.activeTab]}
          onPress={() => setSelectedCategory('BOOKED')}
        >
          <Text>✅ BOOKED</Text>
        </TouchableOpacity>
      </View>

      {/* Enquiry List */}
      <FlatList
        data={enquiries}
        renderItem={({ item }) => <EnquiryCard enquiry={item} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};
```

### **Booking Timeline UI:**
```typescript
const BookingsScreen = () => {
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineCategory | 'all'>('all');
  const [bookings, setBookings] = useState([]);

  const fetchBookings = async (timeline?: TimelineCategory) => {
    const data = await bookingService.getMyBookings(timeline);
    setBookings(data.bookings);
  };

  return (
    <View>
      {/* Timeline Tabs */}
      <ScrollView horizontal style={styles.timelineTabs}>
        <TimelineTab
          icon="📅"
          label="Today"
          active={selectedTimeline === 'today'}
          onPress={() => setSelectedTimeline('today')}
        />
        
        <TimelineTab
          icon="🚗"
          label="Delivery"
          active={selectedTimeline === 'delivery_today'}
          onPress={() => setSelectedTimeline('delivery_today')}
        />
        
        <TimelineTab
          icon="⏰"
          label="Pending"
          active={selectedTimeline === 'pending_update'}
          onPress={() => setSelectedTimeline('pending_update')}
        />
        
        <TimelineTab
          icon="🔴"
          label="Overdue"
          active={selectedTimeline === 'overdue'}
          onPress={() => setSelectedTimeline('overdue')}
        />
        
        <TimelineTab
          icon="📋"
          label="All"
          active={selectedTimeline === 'all'}
          onPress={() => setSelectedTimeline('all')}
        />
      </ScrollView>

      {/* Bookings List */}
      <FlatList
        data={bookings}
        renderItem={({ item }) => <BookingCard booking={item} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};
```

### **Update Booking Form:**
```typescript
const UpdateBookingScreen = ({ route }) => {
  const { bookingId } = route.params;
  const [formData, setFormData] = useState({
    status: 'PENDING',
    financeRequired: false,
    financerName: '',
    expectedDeliveryDate: new Date(),
    advisorRemarks: ''
  });

  const handleSubmit = async () => {
    try {
      await bookingService.updateBooking(bookingId, {
        status: formData.status,
        financeRequired: formData.financeRequired,
        financerName: formData.financerName,
        expectedDeliveryDate: formData.expectedDeliveryDate.toISOString(), // ← ISO format!
        advisorRemarks: formData.advisorRemarks
      });
      
      Alert.alert('Success', 'Booking updated!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <Picker
        selectedValue={formData.status}
        onValueChange={(value) => setFormData({...formData, status: value})}
      >
        <Picker.Item label="Pending" value="PENDING" />
        <Picker.Item label="Assigned" value="ASSIGNED" />
        <Picker.Item label="Confirmed" value="CONFIRMED" />
        <Picker.Item label="Cancelled" value="CANCELLED" />
        <Picker.Item label="Delivered" value="DELIVERED" />
      </Picker>

      <DateTimePicker
        value={formData.expectedDeliveryDate}
        onChange={(event, date) => {
          if (date) setFormData({...formData, expectedDeliveryDate: date});
        }}
      />

      <Switch
        value={formData.financeRequired}
        onValueChange={(value) => setFormData({...formData, financeRequired: value})}
      />

      {formData.financeRequired && (
        <TextInput
          placeholder="Financer Name"
          value={formData.financerName}
          onChangeText={(text) => setFormData({...formData, financerName: text})}
        />
      )}

      <TextInput
        placeholder="Advisor Remarks"
        value={formData.advisorRemarks}
        onChangeText={(text) => setFormData({...formData, advisorRemarks: text})}
        multiline
      />

      <Button title="Update Booking" onPress={handleSubmit} />
    </View>
  );
};
```

---

## ⚠️ **COMMON ERRORS & SOLUTIONS**

### **Error 1: "Invalid data provided"**
```json
{
  "success": false,
  "message": "Invalid data provided"
}
```
**Causes:**
- Enum values not UPPERCASE (`"website"` instead of `"WEBSITE"`)
- Wrong date format (`"2025-10-09"` instead of `"2025-10-09T00:00:00.000Z"`)
- Missing required fields

**Solution:**
```typescript
// ✅ CORRECT
{
  source: "WEBSITE",  // UPPERCASE
  expectedDeliveryDate: new Date().toISOString()  // ISO format
}
```

---

### **Error 2: "Insufficient permissions"**
```json
{
  "success": false,
  "message": "Insufficient permissions to create bookings"
}
```
**Cause:** Advisor trying to create booking directly

**Solution:**
Advisors cannot create bookings directly. Use auto-conversion:
```typescript
// ✅ CORRECT: Convert enquiry to booking
await enquiryService.updateEnquiry(enquiryId, { category: 'BOOKED' });

// ❌ WRONG: Direct booking creation (not allowed for advisors)
await bookingService.createBooking({...});
```

---

### **Error 3: "Out of stock"**
```json
{
  "success": false,
  "message": "Vehicle variant \"...\" is not in stock. Cannot convert to booking."
}
```
**Cause:** Variant not available in inventory

**Solution:**
```typescript
try {
  await enquiryService.convertToBooking(enquiryId);
} catch (error) {
  if (error.message.includes('not in stock')) {
    Alert.alert(
      'Out of Stock',
      'This variant is currently not available. Mark as LOST or wait for stock?',
      [
        { text: 'Mark as LOST', onPress: () => markAsLost() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }
}
```

---

### **Error 4: "data.filter is not a function"**
**Cause:** API returns `{data: {enquiries: [...]}}` but code expects `data` to be array

**Solution:**
```typescript
// ❌ WRONG
const filtered = enquiriesState.data.filter(...);

// ✅ CORRECT
const filtered = enquiriesState.data.enquiries.filter(...);
```

---

## 🧪 **TESTING CHECKLIST**

### **Before Deployment:**
- [ ] Test enquiry creation with all required fields
- [ ] Test enquiry creation with optional fields
- [ ] Test all 3 enquiry categories (HOT, LOST, BOOKED)
- [ ] Test auto-booking conversion (in-stock variant)
- [ ] Test auto-booking conversion (out-of-stock variant)
- [ ] Test all 4 booking timelines
- [ ] Test booking field updates
- [ ] Test advisor remarks
- [ ] Test date picker → ISO format conversion
- [ ] Test enum dropdowns → UPPERCASE values
- [ ] Test authentication token refresh
- [ ] Test network error handling
- [ ] Test empty states
- [ ] Test loading states
- [ ] Test pagination

---

## 📖 **COMPLETE WORKFLOW EXAMPLE**

### **Scenario: Customer Wants to Buy Tata Nexon**

```typescript
// Step 1: Advisor creates enquiry
const enquiry = await enquiryService.createEnquiry({
  customerName: "Alice Cooper",
  customerContact: "+919123456789",
  customerEmail: "alice@example.com",
  model: "Tata Nexon",
  variant: "Tata Nexon XZ Plus Petrol AT",
  color: "Red",
  source: "SHOWROOM",
  caRemarks: "Interested in automatic, wants test drive",
  dealerCode: "TATA001"
});
// Result: Enquiry created with category = HOT

// Step 2: After test drive, customer ready to book
const conversionResult = await enquiryService.updateEnquiry(enquiry.data.enquiry.id, {
  category: "BOOKED"
});

if (conversionResult.booking) {
  // Step 3: Booking auto-created, now update details
  await bookingService.updateBooking(conversionResult.booking.id, {
    status: "CONFIRMED",
    financeRequired: true,
    financerName: "HDFC Bank",
    fileLoginDate: new Date().toISOString(),
    expectedDeliveryDate: new Date("2025-11-15").toISOString(),
    advisorRemarks: "Finance approved, delivery in 37 days"
  });
  
  // Step 4: Create quotation
  await quotationService.createQuotation({
    enquiryId: enquiry.data.enquiry.id,
    amount: 1200000
  });
  
  Alert.alert('Success', 'Booking confirmed and quotation sent!');
}
```

---

## 🎯 **IMPLEMENTATION PRIORITY**

### **Phase 1: Core Features** ✅ DONE
- ✅ Enquiry creation
- ✅ Enquiry categories
- ✅ Auto-booking conversion
- ✅ Booking viewing
- ✅ Booking updates
- ✅ Timeline filtering

### **Phase 2: Enhanced Features** ⚠️ PENDING
- ⚠️ Quotation creation for advisors
- ⚠️ PDF generation
- ⚠️ Public quotation links
- ⚠️ WhatsApp sharing

### **Phase 3: Advanced Features** ⚠️ FUTURE
- ⚠️ Push notifications
- ⚠️ Analytics dashboard
- ⚠️ Bulk operations
- ⚠️ Offline sync

---

## 📞 **SUPPORT**

### **Backend Status:**
- ✅ Server: Running on port 4000
- ✅ Database: PostgreSQL connected
- ✅ Firebase: Authenticated
- ✅ Redis: Connected (for imports)

### **Documentation:**
- ✅ API endpoints documented
- ✅ Request/response formats provided
- ✅ Error handling examples included
- ✅ TypeScript interfaces provided

### **If You Need Help:**
1. Check server logs for detailed error messages
2. Verify API_URL is correct
3. Ensure Firebase token is valid
4. Check enum values are UPPERCASE
5. Verify date format is ISO-8601

---

## 🎉 **YOU'RE READY TO BUILD!**

**Everything you need is documented here:**
- ✅ Complete API specifications
- ✅ TypeScript interfaces
- ✅ Service layer code
- ✅ UI component examples
- ✅ Error handling
- ✅ Test credentials
- ✅ Real working data in database

**Backend is ready and waiting for your Expo app to connect!** 🚀

---

**Last Updated:** October 9, 2025  
**Backend Version:** 1.5.0  
**Backend URL:** http://10.69.245.247:4000/api  
**Status:** ✅ Production Ready for Advisor Features

