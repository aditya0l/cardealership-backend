# 📱 Expo App - Stock Functionality Implementation Prompt

## Use this prompt to implement stock management in your Expo mobile app

---

## 🎯 PROMPT FOR AI/DEVELOPER

```
I need you to implement a complete Stock Management module in my Expo React Native mobile app.

### BACKEND API ENDPOINTS (Already available)

Base URL: https://automotive-backend-frqe.onrender.com/api

**Stock Endpoints:**
- GET /stock - Get all vehicles with filtering
- GET /stock/stats - Get stock statistics
- GET /stock/:id - Get specific vehicle details
- POST /stock - Create new vehicle (Admin only)
- PUT /stock/:id - Update vehicle (Admin only)
- DELETE /stock/:id - Delete vehicle (Admin only)

**Authentication:**
- Use Firebase ID token: `Authorization: Bearer {firebase-token}`
- Token should be automatically refreshed

### REQUIRED FEATURES

#### 1. Stock List Screen
- Display all vehicles in a scrollable list
- Show for each vehicle:
  - Variant name (main text)
  - Color, Fuel Type, Transmission (subtitle)
  - Stock quantity with visual indicator (badge/chip)
  - Location (dealerCode or location)
  - Available/Out of Stock status
- Pull-to-refresh functionality
- Loading state while fetching
- Empty state when no vehicles
- Error handling with retry option

**Filters (optional but recommended):**
- Filter by availability (In Stock / Out of Stock)
- Filter by fuel type (PETROL, DIESEL, CNG, ELECTRIC)
- Filter by transmission (MANUAL, AUTOMATIC)
- Search by variant name

#### 2. Stock Statistics Card
- Total vehicles count
- In stock count
- Out of stock count
- Visual representation (progress bar or pie chart)
- Refresh on pull-to-refresh

#### 3. Vehicle Detail Screen
- Full vehicle information:
  - Variant name (heading)
  - Model year
  - Color
  - Fuel type
  - Transmission
  - VIN number (if available)
  - Stock availability (badge)
  - Total stock quantity
  - Available stock
  - Allocated stock
  - Location/dealerCode
  - Created date
  - Last updated date
- Back navigation
- Refresh button

#### 4. Admin Features (if user.role === 'ADMIN')
- Add new vehicle button (FAB or header button)
- Edit vehicle button on detail screen
- Delete vehicle option (with confirmation)

#### 5. Add/Edit Vehicle Form (Admin only)
**Form fields:**
- Variant name* (required)
- Model year (optional)
- Color* (required)
- Fuel type* (required - dropdown: PETROL, DIESEL, CNG, ELECTRIC)
- Transmission* (required - dropdown: MANUAL, AUTOMATIC)
- VIN number (optional)
- Total stock* (required - number input)
- Available stock* (required - number input)
- Allocated stock (optional - number input)
- Location/Dealer code (optional)

**Validation:**
- Required fields must be filled
- Stock numbers must be >= 0
- Available + Allocated should not exceed Total
- Show validation errors below fields

**Actions:**
- Save button (calls POST or PUT endpoint)
- Cancel button (goes back)
- Loading state during save
- Success message on save
- Error handling

### TECHNICAL REQUIREMENTS

**State Management:**
- Use React hooks (useState, useEffect)
- Or use Context API for global stock state
- Or use Redux/Zustand if already in project

**API Client:**
- Create stock API service file
- Handle authentication headers automatically
- Handle errors with user-friendly messages
- Implement request timeout

**Navigation:**
- Stock List Screen (main)
- Stock Detail Screen (on item tap)
- Add/Edit Stock Screen (admin only)

**UI Components:**
- Use React Native Paper, Native Base, or custom components
- Follow existing app design system
- Ensure responsive design
- Support both iOS and Android

**Error Handling:**
- Network errors → Show retry button
- 401 Unauthorized → Redirect to login
- 403 Forbidden → Show "No permission" message
- 404 Not Found → Show "Item not found"
- 500 Server Error → Show "Server error, try again"

**Performance:**
- Implement pagination if stock list is large
- Use FlatList for efficient rendering
- Cache stock data locally
- Optimize images if showing vehicle photos

### EXISTING PROJECT STRUCTURE

**Assume this structure (adjust to your actual structure):**
```
src/
  ├── screens/
  │   ├── stock/
  │   │   ├── StockListScreen.tsx
  │   │   ├── StockDetailScreen.tsx
  │   │   └── AddEditStockScreen.tsx
  ├── components/
  │   ├── stock/
  │   │   ├── StockCard.tsx
  │   │   ├── StockStats.tsx
  │   │   └── StockFilter.tsx
  ├── api/
  │   ├── client.ts (base API client)
  │   ├── stock.ts (stock API functions)
  │   └── types.ts (TypeScript types)
  ├── navigation/
  │   └── AppNavigator.tsx (add stock screens here)
  └── context/
      └── AuthContext.tsx (existing, provides user data)
```

### DATA TYPES (TypeScript)

```typescript
// Vehicle/Stock type from backend
interface Vehicle {
  id: string;
  variant: string;
  modelYear?: string;
  color: string;
  fuelType: 'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC';
  transmission: 'MANUAL' | 'AUTOMATIC';
  vinNumber?: string;
  totalStock: number;
  availableStock: number;
  allocatedStock?: number;
  dealerCode?: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Stock stats from backend
interface StockStats {
  totalVehicles: number;
  inStock: number;
  outOfStock: number;
  stockByLocation?: Array<{
    location: string;
    total: number;
  }>;
  topModels?: Array<{
    variant: string;
    totalStock: number;
  }>;
}

// API response wrapper
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
```

### EXAMPLE API CALLS

```typescript
// Get all stock
const response = await fetch('https://automotive-backend-frqe.onrender.com/api/stock', {
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  }
});
const data: ApiResponse<{ vehicles: Vehicle[], total: number }> = await response.json();

// Get stats
const response = await fetch('https://automotive-backend-frqe.onrender.com/api/stock/stats', {
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  }
});
const data: ApiResponse<StockStats> = await response.json();

// Create vehicle (Admin)
const response = await fetch('https://automotive-backend-frqe.onrender.com/api/stock', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    variant: 'Nexon XZ+',
    color: 'Red',
    fuelType: 'PETROL',
    transmission: 'MANUAL',
    totalStock: 10,
    availableStock: 8,
    dealerCode: 'DLR001'
  })
});
```

### USER EXPERIENCE REQUIREMENTS

1. **Loading States:** Show spinners/skeletons while loading
2. **Empty States:** Show friendly messages with actions when no data
3. **Error States:** Show clear error messages with retry options
4. **Success Feedback:** Show toast/snackbar on successful actions
5. **Confirmation Dialogs:** Ask before deleting vehicles
6. **Search/Filter:** Debounce search input, show active filters
7. **Refresh:** Pull-to-refresh on list screens
8. **Navigation:** Clear back navigation, proper screen titles

### ACCESSIBILITY

- Add proper labels for screen readers
- Ensure touch targets are at least 44x44 pixels
- Support dark mode if app has it
- Use semantic colors (red for out of stock, green for in stock)

### TESTING CHECKLIST

After implementation, test:
- [ ] Stock list loads correctly
- [ ] Stats display accurate numbers
- [ ] Detail screen shows all information
- [ ] Filters work correctly
- [ ] Search returns correct results
- [ ] Pull-to-refresh updates data
- [ ] Admin can add new vehicles
- [ ] Admin can edit existing vehicles
- [ ] Admin can delete vehicles (with confirmation)
- [ ] Non-admin users can't access admin features
- [ ] Error handling works (try with network off)
- [ ] Loading states show properly
- [ ] Navigation flows smoothly
- [ ] Works on both iOS and Android

### DELIVERABLES

Please provide:
1. All screen components (StockListScreen, StockDetailScreen, AddEditStockScreen)
2. Reusable components (StockCard, StockStats, etc.)
3. API service file (stock.ts with all API functions)
4. Navigation setup (add stock screens to navigator)
5. TypeScript types (if using TypeScript)
6. Brief documentation on how to use the screens

### STYLE GUIDELINES

- Follow the existing app's design system
- Use consistent spacing (8px, 16px, 24px)
- Use app's color palette
- Match existing component styles
- Ensure responsive on different screen sizes
- Support both portrait and landscape (if applicable)

### OPTIONAL ENHANCEMENTS

If time permits:
- Add vehicle image upload/display
- Add barcode/QR scanner for VIN
- Add export stock list to CSV
- Add stock level alerts (low stock notifications)
- Add stock history/audit log
- Add bulk import vehicles
- Add advanced analytics (charts/graphs)

### PRIORITY

**Must Have (P0):**
- Stock list with basic info
- Stock detail view
- Stats display
- API integration
- Error handling

**Should Have (P1):**
- Add/Edit/Delete (Admin)
- Filters and search
- Pull-to-refresh
- Loading/empty states

**Nice to Have (P2):**
- Advanced filters
- Pagination
- Offline support
- Image upload

Start with P0, then P1, then P2 if time allows.
```

---

## 🎨 DESIGN REFERENCES

### Stock List Screen Layout
```
┌─────────────────────────────────┐
│ ← Stock Management          ➕  │  (Header with back & add button)
├─────────────────────────────────┤
│ 📊 Stats Card                   │
│ Total: 150 | In Stock: 120     │
│ Out of Stock: 30                │
├─────────────────────────────────┤
│ 🔍 Search vehicles...           │
│ [Filter] [Sort]                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Nexon XZ+            [✓ 8]  │ │  (Vehicle Card)
│ │ Red • Petrol • Manual       │ │
│ │ Location: ZAWL              │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Safari XZ             [⚠ 0] │ │
│ │ White • Diesel • Auto       │ │
│ │ Location: RAS               │ │
│ └─────────────────────────────┘ │
│ ...more vehicles...             │
└─────────────────────────────────┘
```

### Stock Detail Screen Layout
```
┌─────────────────────────────────┐
│ ← Nexon XZ+              ✏️ 🗑️  │  (Header with edit/delete)
├─────────────────────────────────┤
│                                 │
│  🚗 Nexon XZ+                   │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Variant: Nexon XZ+        │ │
│  │ Color: Red                │ │
│  │ Fuel: Petrol              │ │
│  │ Transmission: Manual      │ │
│  │ Model Year: 2024          │ │
│  │                           │ │
│  │ 📦 Stock Status           │ │
│  │ Total: 10                 │ │
│  │ Available: 8    ✅        │ │
│  │ Allocated: 2              │ │
│  │                           │ │
│  │ 📍 Location: ZAWL         │ │
│  │ 🆔 VIN: ABC123...         │ │
│  │                           │ │
│  │ Created: 2025-01-15       │ │
│  │ Updated: 2025-01-20       │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

### Add/Edit Vehicle Screen Layout
```
┌─────────────────────────────────┐
│ ← Add Vehicle           [Save]  │
├─────────────────────────────────┤
│                                 │
│  Variant Name *                 │
│  ┌─────────────────────────┐   │
│  │ Nexon XZ+               │   │
│  └─────────────────────────┘   │
│                                 │
│  Color *                        │
│  ┌─────────────────────────┐   │
│  │ Red                     │   │
│  └─────────────────────────┘   │
│                                 │
│  Fuel Type *                    │
│  ┌─────────────────────────┐   │
│  │ ▼ Select Fuel Type      │   │
│  └─────────────────────────┘   │
│                                 │
│  Transmission *                 │
│  ┌─────────────────────────┐   │
│  │ ▼ Select Transmission   │   │
│  └─────────────────────────┘   │
│                                 │
│  Total Stock *                  │
│  ┌─────────────────────────┐   │
│  │ 10                      │   │
│  └─────────────────────────┘   │
│                                 │
│  Available Stock *              │
│  ┌─────────────────────────┐   │
│  │ 8                       │   │
│  └─────────────────────────┘   │
│                                 │
│  [Cancel]          [Save]       │
│                                 │
└─────────────────────────────────┘
```

---

## 📋 BACKEND API DOCUMENTATION

### 1. GET /stock - Get All Vehicles

**Request:**
```http
GET /api/stock?page=1&limit=20&fuelType=PETROL&availability=IN_STOCK
Authorization: Bearer {firebase-token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `fuelType` (optional): Filter by fuel type (PETROL, DIESEL, CNG, ELECTRIC)
- `transmission` (optional): Filter by transmission (MANUAL, AUTOMATIC)
- `availability` (optional): Filter by availability (IN_STOCK, OUT_OF_STOCK)
- `search` (optional): Search in variant name
- `dealerCode` (optional): Filter by dealer code

**Response:**
```json
{
  "success": true,
  "message": "Vehicles retrieved successfully",
  "data": {
    "vehicles": [
      {
        "id": "clx123abc",
        "variant": "Nexon XZ+",
        "modelYear": "2024",
        "color": "Red",
        "fuelType": "PETROL",
        "transmission": "MANUAL",
        "vinNumber": "ABC123XYZ789",
        "totalStock": 10,
        "availableStock": 8,
        "allocatedStock": 2,
        "dealerCode": "ZAWL",
        "location": "Zone A Warehouse Location",
        "isActive": true,
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-01-20T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### 2. GET /stock/stats - Get Stock Statistics

**Request:**
```http
GET /api/stock/stats
Authorization: Bearer {firebase-token}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock statistics retrieved successfully",
  "data": {
    "totalVehicles": 150,
    "inStock": 120,
    "outOfStock": 30,
    "stockByLocation": [
      { "location": "ZAWL", "total": 50 },
      { "location": "RAS", "total": 30 },
      { "location": "Regional", "total": 25 }
    ],
    "topModels": [
      { "variant": "Nexon XZ+", "totalStock": 25 },
      { "variant": "Safari XZ", "totalStock": 20 }
    ]
  }
}
```

### 3. GET /stock/:id - Get Vehicle Details

**Request:**
```http
GET /api/stock/clx123abc
Authorization: Bearer {firebase-token}
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle retrieved successfully",
  "data": {
    "vehicle": {
      "id": "clx123abc",
      "variant": "Nexon XZ+",
      // ... all vehicle fields
    }
  }
}
```

### 4. POST /stock - Create Vehicle (Admin only)

**Request:**
```http
POST /api/stock
Authorization: Bearer {firebase-token}
Content-Type: application/json

{
  "variant": "Nexon XZ+",
  "modelYear": "2024",
  "color": "Red",
  "fuelType": "PETROL",
  "transmission": "MANUAL",
  "vinNumber": "ABC123XYZ789",
  "totalStock": 10,
  "availableStock": 8,
  "allocatedStock": 2,
  "dealerCode": "ZAWL",
  "location": "Zone A Warehouse"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "vehicle": {
      "id": "clx123abc",
      // ... created vehicle data
    }
  }
}
```

### 5. PUT /stock/:id - Update Vehicle (Admin only)

**Request:**
```http
PUT /api/stock/clx123abc
Authorization: Bearer {firebase-token}
Content-Type: application/json

{
  "availableStock": 10,
  "allocatedStock": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "data": {
    "vehicle": {
      // ... updated vehicle data
    }
  }
}
```

### 6. DELETE /stock/:id - Delete Vehicle (Admin only)

**Request:**
```http
DELETE /api/stock/clx123abc
Authorization: Bearer {firebase-token}
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle deleted successfully"
}
```

---

## 🎯 IMPLEMENTATION CHECKLIST

Use this checklist while implementing:

**Setup:**
- [ ] Create stock folder structure
- [ ] Set up TypeScript types
- [ ] Create API client for stock endpoints

**Screens:**
- [ ] StockListScreen with list rendering
- [ ] StockDetailScreen with full info
- [ ] AddEditStockScreen with form (Admin only)

**Components:**
- [ ] StockCard component for list items
- [ ] StockStats component for statistics
- [ ] StockFilter component (optional)
- [ ] Empty state component
- [ ] Error state component
- [ ] Loading skeleton/spinner

**Features:**
- [ ] Fetch and display stock list
- [ ] Fetch and display statistics
- [ ] View vehicle details
- [ ] Add new vehicle (Admin)
- [ ] Edit vehicle (Admin)
- [ ] Delete vehicle (Admin)
- [ ] Search functionality
- [ ] Filter functionality
- [ ] Pull-to-refresh
- [ ] Pagination (if needed)

**Error Handling:**
- [ ] Network errors
- [ ] Auth errors (401)
- [ ] Permission errors (403)
- [ ] Server errors (500)
- [ ] Validation errors

**UX:**
- [ ] Loading states everywhere
- [ ] Empty states with actions
- [ ] Error messages with retry
- [ ] Success toasts/snackbars
- [ ] Confirmation dialogs
- [ ] Smooth animations/transitions

**Testing:**
- [ ] Works on iOS
- [ ] Works on Android
- [ ] Admin features hidden for non-admins
- [ ] All CRUD operations work
- [ ] Handles offline gracefully
- [ ] Performance is good with many items

---

## 💡 TIPS FOR IMPLEMENTATION

1. **Start Simple:** Implement basic list view first, then add features
2. **Reuse Components:** Create reusable components for consistency
3. **Handle Errors Early:** Implement error handling from the start
4. **Test Continuously:** Test on device/simulator after each feature
5. **Follow Patterns:** Match existing screens in your app
6. **Optimize Performance:** Use FlatList, memoization, lazy loading
7. **User Feedback:** Always show loading/success/error states
8. **Accessibility:** Add proper labels and touch targets

---

## 📝 EXAMPLE CODE SNIPPETS

### Stock API Service (stock.ts)
```typescript
import apiClient from './client';

export const stockAPI = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    fuelType?: string;
    search?: string;
  }) => {
    const response = await apiClient.get('/stock', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/stock/stats');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/stock/${id}`);
    return response.data;
  },

  create: async (data: CreateVehicleDTO) => {
    const response = await apiClient.post('/stock', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateVehicleDTO>) => {
    const response = await apiClient.put(`/stock/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/stock/${id}`);
    return response.data;
  },
};
```

---

Use this complete prompt with an AI assistant or give it to a developer to implement stock functionality in your Expo app!

