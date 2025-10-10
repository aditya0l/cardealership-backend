# 🖥️ ADMIN DASHBOARD - COMPLETE INTEGRATION GUIDE

## 🎯 Purpose
Copy this entire prompt to your **Web Admin Dashboard** project (React/Next.js/Vue) to integrate with the car dealership backend.

---

## 🔗 BACKEND CONFIGURATION

**API Base URL:**
```javascript
const API_URL = 'http://10.69.245.247:4000/api';
// or localhost: 'http://localhost:4000/api'
```

**Authentication:** Firebase Auth + Bearer Token
```javascript
headers: {
  'Authorization': `Bearer ${firebaseIdToken}`,
  'Content-Type': 'application/json'
}
```

---

## 🔐 FIREBASE SETUP FOR WEB DASHBOARD

### Step 1: Install Firebase
```bash
npm install firebase
```

### Step 2: Firebase Configuration

```javascript
// firebase.config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "car-dealership-app-9f2d5",
  authDomain: "car-dealership-app-9f2d5.firebaseapp.com",
  // ⚠️ GET THESE FROM FIREBASE CONSOLE:
  apiKey: "AIzaSy...", 
  storageBucket: "car-dealership-app-9f2d5.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

**To get missing values:**
1. Go to https://console.firebase.google.com/
2. Select project: `car-dealership-app-9f2d5`
3. Settings ⚙️ → Project settings → Your apps → Web app
4. Copy the config values

---

## 🔑 WORKING TEST CREDENTIALS

### **Admin User:**
```
Email: admin.new@test.com
Password: testpassword123
Role: ADMIN
```

### **Other Test Users (all use password: testpassword123):**
- `advisor.new@test.com` - CUSTOMER_ADVISOR
- `admin@cardealership.com` - ADMIN (password unknown)
- `gm@cardealership.com` - GENERAL_MANAGER (password unknown)

---

## 🎨 1. AUTHENTICATION IMPLEMENTATION

### Login Component:

```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase.config';

async function loginAdmin(email: string, password: string) {
  try {
    // Firebase authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    // Store token
    localStorage.setItem('authToken', idToken);
    
    // Get user profile from backend
    const response = await fetch('http://10.69.245.247:4000/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    const user = data.data.user;
    
    // Check if user is admin or manager
    if (!['ADMIN', 'GENERAL_MANAGER', 'SALES_MANAGER'].includes(user.role.name)) {
      throw new Error('Access denied. Admin/Manager role required.');
    }
    
    // Store user info
    localStorage.setItem('user', JSON.stringify(user));
    
    return { success: true, user };
    
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Firebase error codes
    if (error.code === 'auth/wrong-password') {
      return { success: false, error: 'Invalid password' };
    }
    if (error.code === 'auth/user-not-found') {
      return { success: false, error: 'User not found' };
    }
    if (error.code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many attempts. Please try later.' };
    }
    
    return { success: false, error: error.message || 'Login failed' };
  }
}

// Usage:
const result = await loginAdmin('admin.new@test.com', 'testpassword123');
if (result.success) {
  // Redirect to dashboard
  window.location.href = '/dashboard';
}
```

---

## 👥 2. USER MANAGEMENT MODULE

### A. Get All Users

**Endpoint:** `GET /api/auth/users?page=1&limit=20`

**Implementation:**
```typescript
async function getAllUsers(page = 1, limit = 20) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/auth/users?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data = await response.json();
  return data.data; // { users: [], pagination: {} }
}
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "firebaseUid": "bPqDAnO0o6WGNR4WR19l7TLEz2d2",
        "email": "advisor.new@test.com",
        "name": "Test Advisor",
        "role": {
          "id": "role-id",
          "name": "CUSTOMER_ADVISOR"
        },
        "isActive": true,
        "createdAt": "2025-10-09T10:00:00.000Z",
        "updatedAt": "2025-10-09T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

### B. Create New User (Admin Only)

**Endpoint:** `POST /api/auth/users/create-with-credentials`

**Implementation:**
```typescript
async function createUser(userData: {
  name: string;
  email: string;
  password: string;
  roleName: 'ADMIN' | 'GENERAL_MANAGER' | 'SALES_MANAGER' | 'TEAM_LEAD' | 'CUSTOMER_ADVISOR';
}) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    'http://10.69.245.247:4000/api/auth/users/create-with-credentials',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    }
  );
  
  return await response.json();
}

// Usage:
const result = await createUser({
  name: 'New Advisor',
  email: 'newadvisor@dealership.com',
  password: 'SecurePass123!',
  roleName: 'CUSTOMER_ADVISOR'
});

// Response includes the temporary password
console.log('Share with user:', result.data.temporaryPassword);
```

### C. Update User Role

**Endpoint:** `PUT /api/auth/users/:firebaseUid/role`

```typescript
async function updateUserRole(firebaseUid: string, newRole: string) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/auth/users/${firebaseUid}/role`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roleName: newRole })
    }
  );
  
  return await response.json();
}
```

### D. Reset Password

**Endpoint:** `PUT /api/auth/users/:firebaseUid/password`

```typescript
async function resetPassword(firebaseUid: string, newPassword: string) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/auth/users/${firebaseUid}/password`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPassword })
    }
  );
  
  const data = await response.json();
  // data.data.newPassword contains the new password to share with user
  return data;
}
```

### E. Deactivate/Activate User

```typescript
async function toggleUserStatus(firebaseUid: string, activate: boolean) {
  const token = localStorage.getItem('authToken');
  const action = activate ? 'activate' : 'deactivate';
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/auth/users/${firebaseUid}/${action}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

---

## 📊 3. BULK BOOKING IMPORT

### A. Upload Excel File

```typescript
async function uploadBookingFile(file: File, dealerCode: string) {
  const token = localStorage.getItem('authToken');
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('dealerCode', dealerCode);
  
  const response = await fetch(
    'http://10.69.245.247:4000/api/bookings/import/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - browser sets it with boundary for FormData
      },
      body: formData
    }
  );
  
  return await response.json();
}

// UI Component:
function BulkImportUpload() {
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const result = await uploadBookingFile(file, 'TATA001');
    
    if (result.success) {
      alert(`Import started! Job ID: ${result.data.job.id}`);
    } else {
      alert(`Error: ${result.message}`);
    }
  };
  
  return (
    <div>
      <input 
        type="file" 
        accept=".xlsx,.xls,.csv" 
        onChange={handleFileUpload} 
      />
    </div>
  );
}
```

### B. Preview Before Import

**Endpoint:** `POST /api/bookings/import/preview`

```typescript
async function previewImport(file: File) {
  const token = localStorage.getItem('authToken');
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    'http://10.69.245.247:4000/api/bookings/import/preview',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }
  );
  
  const data = await response.json();
  return data.data.preview;
  /* Returns:
  {
    totalRows: 100,
    validRows: 95,
    invalidRows: 5,
    sampleData: [...], // First 10 rows
    errors: [...]      // Validation errors
  }
  */
}
```

### C. Get Import History

**Endpoint:** `GET /api/bookings/imports?page=1&limit=10`

```typescript
async function getImportHistory(page = 1) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/bookings/imports?page=${page}&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data = await response.json();
  return data.data;
}
```

### D. Download Import Errors

**Endpoint:** `GET /api/bookings/imports/:importId/errors`

```typescript
async function downloadImportErrors(importId: string) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/bookings/imports/${importId}/errors`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `import-${importId}-errors.csv`;
  a.click();
}
```

---

## 📋 4. ENQUIRY MANAGEMENT

### Get All Enquiries with Filters

**Endpoint:** `GET /api/enquiries`

**Query Parameters:**
- `page`, `limit` - Pagination
- `category` - `HOT`, `LOST`, or `BOOKED`
- `status` - `OPEN` or `CLOSED`
- `search` - Search customer name/contact
- `sortBy` - Field to sort by
- `sortOrder` - `asc` or `desc`

```typescript
async function getEnquiries(filters: {
  page?: number;
  limit?: number;
  category?: 'HOT' | 'LOST' | 'BOOKED';
  status?: 'OPEN' | 'CLOSED';
  search?: string;
}) {
  const token = localStorage.getItem('authToken');
  const params = new URLSearchParams(filters as any);
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/enquiries?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}

// Usage:
const data = await getEnquiries({ 
  page: 1, 
  limit: 20, 
  category: 'HOT' 
});

// data.data.enquiries - array of enquiries
// data.data.pagination - { page, limit, total, totalPages }
```

### Get Enquiry Stats (Admin Only)

**Endpoint:** `GET /api/enquiries/stats`

```typescript
async function getEnquiryStats() {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    'http://10.69.245.247:4000/api/enquiries/stats',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

---

## 🚗 5. BOOKING MANAGEMENT

### A. Get All Bookings

**Endpoint:** `GET /api/bookings`

**Advanced Filters:**
```typescript
async function getBookings(filters: {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
  dealerCode?: string;
  advisorId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}) {
  const token = localStorage.getItem('authToken');
  const params = new URLSearchParams(filters as any);
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/bookings?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

### B. Get Booking by ID

**Endpoint:** `GET /api/bookings/:id`

```typescript
async function getBookingDetails(bookingId: string) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/bookings/${bookingId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

### C. Update Booking (Admin - Full Access)

**Endpoint:** `PUT /api/bookings/:id`

```typescript
async function updateBooking(bookingId: string, updates: {
  status?: string;
  expectedDeliveryDate?: string;
  financeRequired?: boolean;
  financerName?: string;
  fileLoginDate?: string;
  approvalDate?: string;
  stockAvailability?: 'VNA' | 'VEHICLE_AVAILABLE';
  backOrderStatus?: boolean;
  rtoDate?: string;
  adminRemarks?: string;
  generalManagerRemarks?: string;
  salesManagerRemarks?: string;
  teamLeadRemarks?: string;
}) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/bookings/${bookingId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  
  return await response.json();
}
```

### D. Assign Advisor to Booking

**Endpoint:** `PATCH /api/bookings/:id/assign`

```typescript
async function assignAdvisor(bookingId: string, advisorId: string) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/bookings/${bookingId}/assign`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ advisorId })
    }
  );
  
  return await response.json();
}
```

### E. Get Booking Audit Log

**Endpoint:** `GET /api/bookings/:id/audit`

```typescript
async function getBookingAuditLog(bookingId: string) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/bookings/${bookingId}/audit`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

---

## 📦 6. STOCK/VEHICLE MANAGEMENT

### A. Get All Vehicles

**Endpoint:** `GET /api/stock?page=1&limit=20&search=Harrier&dealerType=TATA`

```typescript
async function getVehicles(filters: {
  page?: number;
  limit?: number;
  search?: string;
  dealerType?: string;
}) {
  const token = localStorage.getItem('authToken');
  const params = new URLSearchParams(filters as any);
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/stock?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

### B. Create Vehicle (Admin/GM/SM)

**Endpoint:** `POST /api/stock`

```typescript
async function createVehicle(vehicleData: {
  variant: string;
  vcCode?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  dealerType?: string;
  exShowroomPrice?: number;
  finalBillingPrice?: number;
  onRoadPrice?: number;
}) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    'http://10.69.245.247:4000/api/stock',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vehicleData)
    }
  );
  
  return await response.json();
}
```

### C. Update Vehicle

**Endpoint:** `PUT /api/stock/:id`

### D. Delete Vehicle (Admin Only)

**Endpoint:** `DELETE /api/stock/:id`

---

## 💰 7. QUOTATION MANAGEMENT

### A. Get All Quotations

**Endpoint:** `GET /api/quotations?page=1&limit=20&status=PENDING`

```typescript
async function getQuotations(filters: {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT_TO_CUSTOMER';
}) {
  const token = localStorage.getItem('authToken');
  const params = new URLSearchParams(filters as any);
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/quotations?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

### B. Create Quotation (Admin)

**Endpoint:** `POST /api/quotations`

```typescript
async function createQuotation(data: {
  enquiryId: string;
  amount: number;
  status?: 'PENDING' | 'APPROVED';
  pdfUrl?: string;
}) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    'http://10.69.245.247:4000/api/quotations',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );
  
  return await response.json();
}
```

### C. Update Quotation

**Endpoint:** `PUT /api/quotations/:id`

```typescript
async function updateQuotation(quotationId: string, updates: {
  status?: string;
  amount?: number;
  pdfUrl?: string;
}) {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(
    `http://10.69.245.247:4000/api/quotations/${quotationId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  
  return await response.json();
}
```

---

## 🎨 8. RECOMMENDED DASHBOARD PAGES

### Page 1: Dashboard (/)
```
📊 Statistics Cards:
- Total Enquiries (with category breakdown)
- Total Bookings (with status breakdown)
- Active Advisors
- Vehicles in Stock

📈 Charts:
- Enquiries by Category (Pie chart: HOT/LOST/BOOKED)
- Bookings by Status (Bar chart)
- Monthly trends (Line chart)

📋 Recent Activity:
- Last 10 enquiries created
- Recent bookings
- Recent imports
```

### Page 2: User Management (/users)
```
👥 User Table with:
- Name, Email, Role (badge), Status (active/inactive), Created Date
- Actions: Edit Role, Reset Password, Deactivate/Activate, Delete
- Create New User button → Modal with form

Filters:
- Role dropdown
- Status toggle (Active/Inactive)
- Search by name/email
```

### Page 3: Bulk Import Center (/imports)
```
📤 Upload Section:
- Drag & drop zone for Excel files
- Dealer code selector
- Preview button → shows validation results
- Upload button

📊 Import History Table:
- File name, Date, Status, Total/Success/Failed records
- Actions: View details, Download errors
- Status badges: PENDING (yellow), COMPLETED (green), FAILED (red)

📥 Download Sample Template button
```

### Page 4: Enquiries (/enquiries)
```
📋 Enquiry Table with:
- Customer Name, Contact, Email, Model, Variant
- Category badge (HOT/LOST/BOOKED)
- Status badge (OPEN/CLOSED)
- Advisor name
- Created date
- Actions: View, Edit, Convert to Booking, Delete

Filters:
- Category tabs (ALL, HOT, LOST, BOOKED)
- Status dropdown
- Date range picker
- Advisor selector
- Search bar

📊 Stats at top:
- Total HOT: X
- Total LOST: X
- Total BOOKED: X
```

### Page 5: Bookings (/bookings)
```
🚗 Booking Table with:
- Customer Name, Phone, Variant, Color
- Status badge
- Advisor name
- Delivery date
- Finance status
- Stock availability
- Actions: View, Edit, Assign, Audit Log

Timeline Tabs (for advisors):
- All
- Today (actions due today)
- Delivery Today
- Pending Update
- Overdue

Filters:
- Status dropdown
- Dealer dropdown
- Advisor dropdown
- Date range
- Finance required toggle
- Stock availability

Bulk Actions:
- Assign multiple bookings to advisor
- Export selected to Excel
```

### Page 6: Stock Management (/stock)
```
📦 Vehicle Table with:
- Variant, VC Code, Color, Fuel Type, Transmission
- Ex-showroom Price, On-road Price
- Dealer Type
- Status (Active/Inactive)
- Actions: Edit, Delete, Duplicate

Add New Vehicle button → Modal/Page with form

Filters:
- Dealer Type (TATA, Universal, etc.)
- Fuel Type
- Transmission
- Price range
- Search by variant/code
```

### Page 7: Quotations (/quotations)
```
💰 Quotation Table with:
- Customer Name (from enquiry), Amount
- Status badge (PENDING/APPROVED/REJECTED/SENT)
- Created date
- PDF link (if generated)
- Actions: View, Edit, Approve, Reject, Generate PDF, Share

Workflow:
1. Create quotation for enquiry
2. Admin reviews and approves
3. Generate PDF
4. Share link with customer
5. Mark as SENT_TO_CUSTOMER

Filters:
- Status dropdown
- Date range
- Amount range
- Advisor/Enquiry search
```

---

## 🔒 9. AUTHENTICATION FLOW

```typescript
// 1. Login page (/login)
async function handleLogin(email: string, password: string) {
  const result = await loginAdmin(email, password);
  
  if (result.success) {
    // Store user data
    localStorage.setItem('user', JSON.stringify(result.user));
    localStorage.setItem('authToken', result.token);
    
    // Redirect to dashboard
    router.push('/dashboard');
  } else {
    setError(result.error);
  }
}

// 2. Protected routes wrapper
function ProtectedRoute({ children, allowedRoles }: { 
  children: React.ReactNode; 
  allowedRoles: string[] 
}) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!user.role) {
    return <Navigate to="/login" />;
  }
  
  if (!allowedRoles.includes(user.role.name)) {
    return <div>Access Denied</div>;
  }
  
  return <>{children}</>;
}

// 3. Use in router
<Route path="/dashboard" element={
  <ProtectedRoute allowedRoles={['ADMIN', 'GENERAL_MANAGER']}>
    <Dashboard />
  </ProtectedRoute>
} />

<Route path="/users" element={
  <ProtectedRoute allowedRoles={['ADMIN']}>
    <UserManagement />
  </ProtectedRoute>
} />
```

---

## 🎯 10. EXAMPLE: User Management Table Component

```typescript
import React, { useEffect, useState } from 'react';

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    loadUsers();
  }, [currentPage]);
  
  async function loadUsers() {
    setLoading(true);
    const data = await getAllUsers(currentPage, 20);
    setUsers(data.users);
    setLoading(false);
  }
  
  async function handleResetPassword(firebaseUid: string) {
    const newPassword = prompt('Enter new password (min 8 chars):');
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    
    const result = await resetPassword(firebaseUid, newPassword);
    if (result.success) {
      alert(`Password reset! New password: ${result.data.newPassword}\n\nShare this with the user securely.`);
    }
  }
  
  async function handleToggleStatus(firebaseUid: string, isActive: boolean) {
    const result = await toggleUserStatus(firebaseUid, !isActive);
    if (result.success) {
      loadUsers(); // Refresh list
    }
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Create New User
        </button>
      </div>
      
      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.firebaseUid}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <span className="badge">{user.role.name}</span>
              </td>
              <td>
                <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td>
                <button onClick={() => handleResetPassword(user.firebaseUid)}>
                  Reset Password
                </button>
                <button onClick={() => handleToggleStatus(user.firebaseUid, user.isActive)}>
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 📝 11. IMPORTANT ENUMS & VALUES

### Roles:
```typescript
type RoleName = 
  | 'ADMIN' 
  | 'GENERAL_MANAGER' 
  | 'SALES_MANAGER' 
  | 'TEAM_LEAD' 
  | 'CUSTOMER_ADVISOR';
```

### Enquiry Category:
```typescript
type EnquiryCategory = 'HOT' | 'LOST' | 'BOOKED';
```

### Enquiry Status:
```typescript
type EnquiryStatus = 'OPEN' | 'CLOSED';
```

### Booking Status:
```typescript
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
```

### Stock Availability:
```typescript
type StockAvailability = 'VNA' | 'VEHICLE_AVAILABLE';
```

### Enquiry Source:
```typescript
type EnquirySource = 'WEBSITE' | 'MOBILE' | 'WALKIN' | 'PHONE' | 'REFERRAL' | 'OTHER';
```

### Quotation Status:
```typescript
type QuotationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT_TO_CUSTOMER';
```

---

## 🚨 12. ERROR HANDLING

```typescript
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`http://10.69.245.247:4000/api${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    // Handle common errors
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
    
    if (response.status === 403) {
      throw new Error('Insufficient permissions');
    }
    
    if (!data.success) {
      throw new Error(data.message || 'Request failed');
    }
    
    return data;
    
  } catch (error: any) {
    console.error('API Error:', error);
    throw error;
  }
}

// Usage:
try {
  const data = await apiCall('/api/bookings?page=1');
  setBookings(data.data.bookings);
} catch (error: any) {
  alert(error.message);
}
```

---

## ✅ 13. COMPLETE SETUP CHECKLIST

### Backend (Already Done ✅)
- [x] Firebase configured
- [x] All APIs implemented
- [x] Role-based permissions
- [x] Bulk import system
- [x] Audit logging
- [x] Test users created

### Frontend (Your Tasks)
- [ ] Install Firebase SDK
- [ ] Configure Firebase with project ID: `car-dealership-app-9f2d5`
- [ ] Implement login page with `admin.new@test.com` / `testpassword123`
- [ ] Create API service layer with authentication
- [ ] Build dashboard layout
- [ ] Implement user management page
- [ ] Build bulk import interface
- [ ] Create enquiry management page
- [ ] Create booking management page
- [ ] Implement stock management
- [ ] Build quotation workflow
- [ ] Add role-based UI rendering
- [ ] Handle errors and token expiration

---

## 🎯 QUICK START CODE

Save this as `api.service.ts`:

```typescript
const API_URL = 'http://10.69.245.247:4000/api';

function getToken() {
  return localStorage.getItem('authToken');
}

export const authAPI = {
  login: async (email: string, password: string) => {
    // Use Firebase signInWithEmailAndPassword
    // Then call /api/auth/profile to get user details
  },
  
  getAllUsers: async (page: number, limit: number) => {
    const response = await fetch(
      `${API_URL}/auth/users?page=${page}&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${getToken()}` } }
    );
    return await response.json();
  },
  
  createUser: async (userData: any) => {
    const response = await fetch(
      `${API_URL}/auth/users/create-with-credentials`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      }
    );
    return await response.json();
  }
};

export const bookingAPI = {
  getAll: async (filters: any) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${API_URL}/bookings?${params}`,
      { headers: { 'Authorization': `Bearer ${getToken()}` } }
    );
    return await response.json();
  },
  
  uploadBulkImport: async (file: File, dealerCode: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dealerCode', dealerCode);
    
    const response = await fetch(
      `${API_URL}/bookings/import/upload`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      }
    );
    return await response.json();
  }
};

export const enquiryAPI = {
  getAll: async (filters: any) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${API_URL}/enquiries?${params}`,
      { headers: { 'Authorization': `Bearer ${getToken()}` } }
    );
    return await response.json();
  }
};

export const stockAPI = {
  getAll: async (filters: any) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${API_URL}/stock?${params}`,
      { headers: { 'Authorization': `Bearer ${getToken()}` } }
    );
    return await response.json();
  },
  
  create: async (vehicleData: any) => {
    const response = await fetch(
      `${API_URL}/stock`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vehicleData)
      }
    );
    return await response.json();
  }
};

export const quotationAPI = {
  getAll: async (filters: any) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${API_URL}/quotations?${params}`,
      { headers: { 'Authorization': `Bearer ${getToken()}` } }
    );
    return await response.json();
  },
  
  create: async (quotationData: any) => {
    const response = await fetch(
      `${API_URL}/quotations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quotationData)
      }
    );
    return await response.json();
  }
};
```

---

## 🎉 YOU'RE READY TO BUILD!

### Test Credentials:
- **Admin:** `admin.new@test.com` / `testpassword123`
- **Advisor:** `advisor.new@test.com` / `testpassword123`

### Backend Status:
✅ Running on `http://10.69.245.247:4000`  
✅ All APIs ready  
✅ Firebase configured  
✅ Test users created  

**Just build the frontend and start making API calls!**

