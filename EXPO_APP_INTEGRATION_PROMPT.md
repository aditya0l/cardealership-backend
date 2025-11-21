# 📱 EXPO APP INTEGRATION PROMPT - COPY THIS TO YOUR FRONTEND

## 🎯 Use This Prompt in Your Expo/React Native Development Environment

Copy the entire content below and paste it into Cursor AI or your IDE in your Expo/React Native project to get comprehensive integration help.

---

```
I'm building a React Native/Expo mobile app for a car dealership management system. The backend API is fully implemented and ready. I need you to help me create a complete frontend integration with all the features.

## 🔗 BACKEND API DETAILS

**API Base URL (Production):**
```
https://automotive-backend-frqe.onrender.com/api
```

**API Base URL (Development):**
```
http://localhost:4000/api
// OR
http://10.69.245.247:4000/api (if on local network)
```

**Authentication:**
- Uses Firebase Authentication with ID tokens
- All requests require: `Authorization: Bearer <firebase_id_token>`
- Token must be obtained from Firebase Auth: `await getAuth().currentUser?.getIdToken()`

**Response Format:**
```typescript
{
  success: boolean;
  message: string;
  data: any; // Response data
}
```

---

## 🔐 AUTHENTICATION & USER MANAGEMENT

### Required Features:

1. **Login Screen**
   - Firebase email/password authentication
   - Endpoint: `POST /api/auth/login` (with Firebase credentials)
   - After login, call: `POST /api/auth/sync` to sync user to backend
   - Store token and user profile

2. **User Profile**
   - Endpoint: `GET /api/auth/profile` or `GET /api/auth/me`
   - Returns: user details, role, dealership, employee ID
   - Display: name, email, role badge, employee ID (e.g., ADV001, GM001)

3. **Roles (5 types):**
   - `ADMIN` - Full access (employee ID: ADM001, ADM002...)
   - `GENERAL_MANAGER` - Manager access (GM001, GM002...)
   - `SALES_MANAGER` - Department access (SM001, SM002...)
   - `TEAM_LEAD` - Team access (TL001, TL002...)
   - `CUSTOMER_ADVISOR` - Own records only (ADV001, ADV002...)

**Implementation Notes:**
- Always fetch user profile from `/api/auth/me` (don't rely on Firebase token claims)
- Cache user profile with refresh capability
- Show role-specific UI elements based on user role
- Advisors can only see/edit their own bookings and enquiries

---

## 📋 1. ENQUIRIES MANAGEMENT

### Features to Implement:

#### A. Create Enquiry
**Endpoint:** `POST /api/enquiries`

**Required Fields:**
- `customerName` (string) - REQUIRED
- `customerContact` (string) - REQUIRED (with country code: +919876543210)
- `expectedBookingDate` (string) - REQUIRED (ISO date format)
- `model` (string) - REQUIRED
- `source` (EnquirySource enum) - REQUIRED (UPPERCASE)

**Optional Fields:**
- `customerEmail` (string)
- `variant` (string)
- `color` (string)
- `caRemarks` (string)
- `dealerCode` (string) - defaults to DEFAULT001
- `assignedToUserId` (string)
- `category` (EnquiryCategory) - defaults to HOT
- `nextFollowUpDate` (string) - ISO date format

**EnquirySource Enum (MUST BE UPPERCASE):**
```typescript
enum EnquirySource {
  WALK_IN = 'WALK_IN',
  PHONE_CALL = 'PHONE_CALL',
  WEBSITE = 'WEBSITE',
  DIGITAL = 'DIGITAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  REFERRAL = 'REFERRAL',
  ADVERTISEMENT = 'ADVERTISEMENT',
  EMAIL = 'EMAIL',
  SHOWROOM_VISIT = 'SHOWROOM_VISIT',
  EVENT = 'EVENT',
  BTL_ACTIVITY = 'BTL_ACTIVITY',
  WHATSAPP = 'WHATSAPP',
  OUTBOUND_CALL = 'OUTBOUND_CALL',
  OTHER = 'OTHER'
}
```

**UI Requirements:**
- Create enquiry form with validation
- Source dropdown with all 15+ options
- Date picker for expected booking date
- Auto-fill advisor as creator

#### B. View Enquiries
**Endpoint:** `GET /api/enquiries`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)
- `category` ('HOT' | 'LOST' | 'BOOKED')
- `status` ('OPEN' | 'IN_PROGRESS' | 'CLOSED')
- `search` (string) - search by customer name
- `sortBy` (string, default: 'createdAt')
- `sortOrder` ('asc' | 'desc', default: 'desc')

**Response:**
```typescript
{
  success: true,
  data: {
    enquiries: Array<{
      id: string;
      customerName: string;
      customerContact: string;
      customerEmail?: string;
      model?: string;
      variant?: string;
      color?: string;
      source: EnquirySource;
      status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
      category: 'HOT' | 'LOST' | 'BOOKED';
      caRemarks?: string;
      expectedBookingDate?: Date;
      lastFollowUpDate?: Date;
      followUpCount: number;
      nextFollowUpDate?: Date;
      assignedToUserId?: string;
      createdByUserId: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }
}
```

**UI Requirements:**
- Three tabs: HOT 🔥, LOST ❌, BOOKED ✅
- Filter by status (OPEN, IN_PROGRESS, CLOSED)
- Search by customer name
- Pull-to-refresh
- Infinite scroll or pagination
- Show follow-up indicators (red badge if overdue follow-up)

#### C. Update Enquiry / Convert to Booking
**Endpoint:** `PUT /api/enquiries/:id`

**Auto-Booking Conversion:**
When you set `category: 'BOOKED'`:
- System validates stock availability
- If stock available → Auto-creates booking
- If stock unavailable → Returns error with message
- Response includes both enquiry AND booking data

**UI Requirements:**
- Edit enquiry form (pre-filled)
- "Convert to Booking" button (sets category to BOOKED)
- Show loading state during conversion
- Display success message with booking details
- Handle stock validation errors gracefully

#### D. Delete Enquiry (Manager+)
**Endpoint:** `DELETE /api/enquiries/:id`

Only available for GENERAL_MANAGER and ADMIN roles.

#### E. Enquiry Helpers/Dropdowns
**Endpoints:**
- `GET /api/enquiries/models` - Available models
- `GET /api/enquiries/variants` - Available variants
- `GET /api/enquiries/colors` - Available colors
- `GET /api/enquiries/sources` - All enquiry sources

**UI Requirements:**
- Use these for dropdown options in forms
- Cache results for better performance

---

## 🚗 2. BOOKINGS MANAGEMENT

### Features to Implement:

#### A. View My Bookings (Advisor)
**Endpoint:** `GET /api/bookings/advisor/my-bookings`

**Query Parameters:**
- `timeline` ('today' | 'delivery_today' | 'pending_update' | 'overdue') - REQUIRED for filtering
- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)
- `status` (BookingStatus) - optional additional filter

**Timeline Categories:**
1. **today** - Bookings with actions scheduled for today (file login, approval, or RTO date = today)
2. **delivery_today** - Vehicles to be delivered today (expected delivery date = today, not delivered)
3. **pending_update** - Stale bookings needing status update (PENDING/ASSIGNED status, created >24h ago)
4. **overdue** - Late deliveries (expected delivery date < today, not delivered/cancelled)

**Response:**
```typescript
{
  success: true,
  data: {
    bookings: Array<{
      id: string;
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      variant?: string;
      vcCode?: string;
      color?: string;
      fuelType?: string;
      transmission?: string;
      status: BookingStatus;
      bookingDate?: Date;
      expectedDeliveryDate?: Date;
      fileLoginDate?: Date;
      approvalDate?: Date;
      rtoDate?: Date;
      financeRequired?: boolean;
      financerName?: string;
      stockAvailability?: 'VNA' | 'VEHICLE_AVAILABLE';
      chassisNumber?: string;
      allocationOrderNumber?: string;
      advisorRemarks?: string;
      teamLeadRemarks?: string;
      salesManagerRemarks?: string;
      generalManagerRemarks?: string;
      adminRemarks?: string;
      advisorId?: string;
      dealerCode: string;
      zone?: string;
      region?: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    timeline: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }
}
```

**UI Requirements:**
- **Timeline Tabs**: 
  - 📅 Today (actions today)
  - 🚗 Delivery Today
  - ⏰ Pending Update
  - 🔴 Overdue
  - 📋 All
- Each booking card shows:
  - Customer name, phone
  - Variant, color
  - Status badge
  - Expected delivery date
  - Stock availability badge (green/red/gray)
  - Follow-up indicator
- Pull-to-refresh
- Infinite scroll or pagination

#### B. Update Booking Status & Fields (Advisor)
**Endpoint:** `PUT /api/bookings/:id/update-status`

**Advisor-Editable Fields:**
- `status` (BookingStatus)
- `expectedDeliveryDate` (string, ISO format)
- `financeRequired` (boolean)
- `financerName` (string)
- `fileLoginDate` (string, ISO format)
- `approvalDate` (string, ISO format)
- `rtoDate` (string, ISO format)
- `advisorRemarks` (string)

**BookingStatus Enum:**
```typescript
enum BookingStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  CONFIRMED = 'CONFIRMED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  WAITLISTED = 'WAITLISTED',
  RESCHEDULED = 'RESCHEDULED',
  BACK_ORDER = 'BACK_ORDER',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}
```

**UI Requirements:**
- Update booking form (pre-filled)
- Date pickers for date fields
- Status dropdown
- Remarks text input
- Save button with loading state
- Show success/error messages

#### C. View All Bookings (Managers)
**Endpoint:** `GET /api/bookings`

**Query Parameters:**
- Same as advisor bookings + additional filters:
  - `advisorId` - Filter by advisor
  - `dealerCode` - Filter by dealer
  - `status` - Filter by status
  - `dateFrom`, `dateTo` - Date range

**UI Requirements:**
- Available only to TEAM_LEAD, SALES_MANAGER, GENERAL_MANAGER, ADMIN
- Show advisor name on booking card
- Additional filters in header
- Export/download option (for managers)

#### D. Booking Assignment (Managers)
**Endpoint:** `PATCH /api/bookings/:id/assign`

**Request:**
```json
{
  "advisorId": "firebase_uid_of_advisor"
}
```

**UI Requirements:**
- "Assign Advisor" button on booking card (for managers)
- Advisor selection dropdown/modal
- Show current advisor if assigned

#### E. Booking Audit Log (Managers)
**Endpoint:** `GET /api/bookings/:id/audit`

**Response:**
```typescript
{
  success: true,
  data: {
    auditLogs: Array<{
      id: string;
      action: string;
      changedBy: string;
      user: {
        name: string;
        email: string;
        role: { name: string };
      };
      oldValue: any;
      newValue: any;
      changeReason?: string;
      ipAddress?: string;
      userAgent?: string;
      createdAt: Date;
    }>;
  }
}
```

**UI Requirements:**
- "View History" button on booking detail screen
- Timeline view of changes
- Show who changed what and when
- Color code changes (added/updated/removed)

---

## 💰 3. QUOTATIONS MANAGEMENT

### Features to Implement:

#### A. View Quotations
**Endpoint:** `GET /api/quotations`

**Query Parameters:**
- `page`, `limit`, `status`, `enquiryId`

#### B. Create Quotation (Team Lead+)
**Endpoint:** `POST /api/quotations`

**Required:**
- `enquiryId` (string)
- `amount` (number)

**Optional:**
- `status` ('PENDING' | 'APPROVED' | 'REJECTED')
- `pdfUrl` (string)

**UI Requirements:**
- Link quotation to enquiry
- PDF upload/view functionality
- Status badges

---

## 📦 4. STOCK/VEHICLE MANAGEMENT

### Features to Implement:

#### A. View Stock
**Endpoint:** `GET /api/stock`

**Query Parameters:**
- `variant`, `model`, `dealerCode`, `isActive`

**Response includes:**
- `zawlStock` (number) - ZAWL warehouse stock
- `rasStock` (number) - RAS stock
- `regionalStock` (number) - Regional stock
- `plantStock` (number) - Plant stock
- `totalStock` (number) - Auto-calculated total

**UI Requirements:**
- Stock list with quantity indicators
- Stock badges:
  - 🟢 Green: Total > 0 (Available)
  - 🟠 Orange: Total = 0, any location > 0 (Limited)
  - 🔴 Red: Total = 0 (Out of Stock)
  - ⚫ Gray: No stock data
- Filter by variant/model
- Show stock breakdown by location

---

## 📊 5. DASHBOARD & STATISTICS

### Features to Implement:

#### A. Dashboard Stats
**Endpoint:** `GET /api/dashboard/stats`

**Response:**
```typescript
{
  success: true,
  data: {
    totalEmployees: number;
    activeEnquiries: number;
    pendingQuotations: number;
    totalBookings: number;
    stockCount: number;
    revenue: number;
    enquiryStats: {
      total: number;
      byCategory: { HOT: number; LOST: number; BOOKED: number };
      byStatus: { OPEN: number; CLOSED: number };
    };
    quotationStats: {
      total: number;
      byStatus: { PENDING: number; APPROVED: number; REJECTED: number };
    };
  }
}
```

**UI Requirements:**
- Dashboard screen with stat cards
- Category breakdown charts
- Revenue chart (if available)
- Refresh on pull

#### B. Today's Booking Plan
**Endpoint:** `GET /api/dashboard/booking-plan/today`

**Response:**
```typescript
{
  success: true,
  data: {
    date: string;
    enquiriesDueToday: number;
    bookingsDueToday: number;
    enquiries: Array<Enquiry>;
    bookings: Array<Booking>;
  }
}
```

**UI Requirements:**
- "Today" tab on dashboard
- List of enquiries due today
- List of bookings due today
- Quick action buttons

---

## 🔔 6. NOTIFICATIONS

### Features to Implement:

#### A. FCM Push Notifications
- Setup Firebase Cloud Messaging
- Register FCM token: Send token to backend (separate endpoint if available)
- Handle incoming notifications
- Show notification badges on screens

#### B. Notification Types:
- New enquiry assignment
- Booking assignment
- Follow-up reminders
- Status updates
- Overdue delivery alerts

**UI Requirements:**
- Notification center/screen
- In-app notification badges
- Push notification handling
- Mark as read functionality

---

## 🎨 7. UI/UX REQUIREMENTS

### Design Guidelines:

1. **Role-Based UI:**
   - Show/hide features based on user role
   - Advisors see: "My Bookings", "My Enquiries"
   - Managers see: "All Bookings", "All Enquiries", "Team Stats"
   - Admins see: Everything + "User Management"

2. **Color Coding:**
   - **Status Colors:**
     - HOT: Red/Orange
     - BOOKED: Green
     - LOST: Gray
     - PENDING: Yellow
     - CONFIRMED: Blue
     - DELIVERED: Green
   - **Stock Badges:**
     - Available: Green
     - Limited: Orange
     - Out of Stock: Red
     - No Data: Gray

3. **Loading States:**
   - Skeleton loaders
   - Pull-to-refresh indicators
   - Loading buttons with spinners

4. **Error Handling:**
   - Network error messages
   - Validation errors
   - Stock validation errors (for booking conversion)
   - 401 redirect to login

5. **Navigation:**
   - Bottom tab navigation:
     - Home (Dashboard)
     - Enquiries
     - Bookings
     - Profile
   - Stack navigation for detail screens

---

## 📱 8. IMPLEMENTATION PRIORITIES

### Phase 1 (MVP):
1. ✅ Authentication (Login, Profile)
2. ✅ Create Enquiry
3. ✅ View My Enquiries (HOT/LOST/BOOKED tabs)
4. ✅ View My Bookings (with timeline tabs)
5. ✅ Update Booking Status & Fields

### Phase 2:
6. ✅ Convert Enquiry to Booking
7. ✅ View All Bookings (Managers)
8. ✅ Dashboard Stats
9. ✅ Stock View

### Phase 3:
10. ✅ Notifications
11. ✅ Quotations
12. ✅ Audit Logs
13. ✅ Advanced Filters

---

## 🔧 9. TECHNICAL REQUIREMENTS

### Required Libraries:
```json
{
  "dependencies": {
    "@react-navigation/native": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    "@react-navigation/stack": "^6.x",
    "react-native-firebase": "^18.x",
    "@react-native-async-storage/async-storage": "^1.x",
    "axios": "^1.x",
    "date-fns": "^2.x",
    "@react-native-community/datetimepicker": "^7.x"
  }
}
```

### File Structure Suggestion:
```
src/
  api/
    client.ts          # Axios instance with auth
    enquiries.ts       # Enquiry API calls
    bookings.ts        # Booking API calls
    auth.ts            # Auth API calls
    dashboard.ts       # Dashboard API calls
  components/
    EnquiryCard.tsx
    BookingCard.tsx
    StatusBadge.tsx
    StockBadge.tsx
  screens/
    LoginScreen.tsx
    DashboardScreen.tsx
    EnquiriesScreen.tsx
    BookingsScreen.tsx
    ProfileScreen.tsx
  context/
    AuthContext.tsx    # User auth state
  types/
    index.ts           # TypeScript types
  utils/
    dateHelpers.ts     # Date formatting
    validators.ts      # Form validation
```

---

## ✅ 10. TESTING CHECKLIST

Before deploying, test:
- [ ] Login with different roles
- [ ] Create enquiry
- [ ] View enquiries by category
- [ ] Convert enquiry to booking (with stock validation)
- [ ] View bookings with timeline filters
- [ ] Update booking status and fields
- [ ] Dashboard stats display correctly
- [ ] Stock badges show correct colors
- [ ] Role-based UI shows/hides correctly
- [ ] Notifications work
- [ ] Offline handling (if implemented)

---

## 🚀 START IMPLEMENTATION

I need you to help me:
1. Setup the API client with Firebase authentication
2. Create the authentication context and login flow
3. Build the enquiry management screens (create, list, update)
4. Build the booking management screens (list with timeline, update)
5. Implement role-based UI logic
6. Add dashboard statistics
7. Setup push notifications
8. Style everything with a modern, professional design

Please start with Phase 1 (Authentication and basic enquiry/booking viewing) and we'll iterate from there.

```
