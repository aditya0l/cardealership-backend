# 🎯 MASTER INTEGRATION PROMPT - COPY THIS TO YOUR EXPO APP

## 📱 Use This Prompt in Your Frontend Development Environment

Copy the entire content below and paste it into Cursor AI in your Expo/React Native project:

---

```
I'm integrating my React Native/Expo app with a car dealership management backend API. The backend is fully implemented and running. I need you to help me create the complete frontend integration.

## 🔗 BACKEND DETAILS

**API Base URL:** http://10.69.245.247:4000/api

**Authentication:** Firebase Auth with ID tokens
```typescript
headers: {
  'Authorization': `Bearer ${firebaseIdToken}`,
  'Content-Type': 'application/json'
}
```

**Test Credentials:**
- Email: advisor@test.com
- Password: TestPass123!
- Role: CUSTOMER_ADVISOR

---

## 📋 REQUIRED FEATURES

### 1. ENQUIRY MANAGEMENT

**Create Enquiry:**
- Endpoint: POST /api/enquiries
- Required Fields: customerName, customerContact, model, source
- Optional: customerEmail, variant, color, caRemarks, dealerCode
- Source MUST be UPPERCASE enum: SHOWROOM, WEBSITE, PHONE, REFERRAL, WALK_IN
- Auto-creates with category = "HOT"

**View Enquiries by Category:**
- GET /api/enquiries?category=HOT (Active enquiries)
- GET /api/enquiries?category=LOST (Lost customers)
- GET /api/enquiries?category=BOOKED (Converted to bookings)

**Update Enquiry:**
- PUT /api/enquiries/:id
- Can update any field including category

**AUTO-BOOKING CONVERSION:**
When category is set to "BOOKED":
- System validates stock availability
- If IN STOCK → Auto-creates booking
- If OUT OF STOCK → Returns error
- Response includes both enquiry and booking data + stock validation

**UI Required:**
- Enquiry creation form
- Three category tabs: HOT 🔥, LOST ❌, BOOKED ✅
- Each enquiry card shows:
  - Customer name, contact, model, variant
  - Category badge
  - "Convert to Booking" button (sets category to BOOKED)
  - Edit button
- Handle stock validation errors gracefully

---

### 2. BOOKING MANAGEMENT

**View My Bookings:**
- Endpoint: GET /api/bookings/advisor/my-bookings
- Advisor sees ONLY bookings assigned to them
- Supports timeline filtering

**Timeline Filters:**
- today: Actions scheduled for today (fileLoginDate, approvalDate, rtoDate = today)
- delivery_today: Expected delivery = today
- pending_update: Status PENDING/ASSIGNED, created >24h ago
- overdue: Expected delivery < today, not delivered/cancelled

**Update Booking:**
- Endpoint: PUT /api/bookings/:id/update-status
- Advisor can update:
  - status (PENDING, ASSIGNED, CONFIRMED, CANCELLED, DELIVERED)
  - expectedDeliveryDate (ISO DateTime)
  - financeRequired (boolean)
  - financerName (string)
  - fileLoginDate (ISO DateTime)
  - approvalDate (ISO DateTime)
  - stockAvailability (VNA or VEHICLE_AVAILABLE)
  - backOrderStatus (boolean)
  - rtoDate (ISO DateTime)
  - advisorRemarks (string - advisor's notes)

**UI Required:**
- Timeline tabs: 📅 Today, 🚗 Delivery, ⏰ Pending, 🔴 Overdue, 📋 All
- Booking cards showing all details
- Update booking form with:
  - Status dropdown
  - Date pickers (convert to ISO format using toISOString())
  - Finance toggle + financer input
  - Stock availability dropdown
  - Remarks text area
- Source indicator (MOBILE = auto-converted from enquiry, BULK_IMPORT = from Excel)

---

### 3. QUOTATIONS

**View Quotations:**
- GET /api/quotations?page=1&limit=10
- All advisors can view

**Create Quotation** (Currently Team Lead+ only):
- POST /api/quotations
- Required: enquiryId, amount
- Optional: pdfUrl

**UI Required:**
- List of quotations with enquiry details
- Create quotation form (if advisor permission added)
- PDF viewer for quotation links

---

## ⚠️ CRITICAL REQUIREMENTS

### 1. Date Format
ALL dates MUST use ISO-8601 format:
```typescript
// ✅ CORRECT
const date = new Date("2025-11-15").toISOString();
// Result: "2025-11-15T00:00:00.000Z"

// ❌ WRONG
const date = "2025-11-15";  // Will cause validation error
```

### 2. Enum Values
ALL enums MUST be UPPERCASE:
```typescript
// ✅ CORRECT
{ source: "WEBSITE", category: "HOT", status: "PENDING" }

// ❌ WRONG
{ source: "website", category: "hot", status: "pending" }
```

### 3. API Response Structure
Backend returns nested structure:
```typescript
// ✅ CORRECT: Access nested data
const enquiries = response.data.enquiries;

// ❌ WRONG: Direct access
const enquiries = response.data.filter(...);  // data is NOT array!
```

---

## 📦 IMPLEMENTATION TASKS

### Task 1: Create Service Layer
Create these files:
- services/api.config.ts (base API config)
- services/enquiry.service.ts (enquiry operations)
- services/booking.service.ts (booking operations)
- services/quotation.service.ts (quotation operations)
- services/types.ts (TypeScript interfaces)

### Task 2: Create Screens
- screens/EnquiriesScreen.tsx (with category tabs)
- screens/CreateEnquiryScreen.tsx
- screens/BookingsScreen.tsx (with timeline tabs)
- screens/BookingDetailScreen.tsx
- screens/UpdateBookingScreen.tsx
- screens/QuotationsScreen.tsx

### Task 3: Create Components
- components/EnquiryCard.tsx
- components/BookingCard.tsx
- components/TimelineTab.tsx
- components/CategoryTab.tsx
- components/DatePickerISO.tsx (wraps DateTimePicker, outputs ISO format)

### Task 4: Error Handling
- Handle 401 (unauthorized - refresh token)
- Handle 403 (forbidden - show permission error)
- Handle 404 (not found)
- Handle 400 (validation errors - show field errors)
- Handle stock validation errors

### Task 5: State Management
Use React Query or Context for:
- Enquiries by category
- Bookings by timeline
- Quotations list
- Auto-refresh on updates

---

## 🧪 TESTING STEPS

1. **Test Enquiry Creation:**
   - Create with all fields
   - Create with minimum fields
   - Verify category defaults to HOT

2. **Test Category Filtering:**
   - View HOT enquiries
   - View LOST enquiries
   - View BOOKED enquiries
   - Verify counts are correct

3. **Test Auto-Booking:**
   - Convert in-stock variant → should succeed
   - Convert out-of-stock variant → should show error
   - Verify booking appears in bookings list

4. **Test Timeline Filtering:**
   - Set booking dates to today
   - Check "Today" timeline shows it
   - Check "Delivery Today" timeline shows it
   - Create old booking, check "Pending Update"

5. **Test Field Updates:**
   - Update all advisor-editable fields
   - Verify dates convert to ISO format
   - Check advisor remarks appear
   - Verify other role remarks are read-only

---

## 📊 EXPECTED SCREENS LAYOUT

### Enquiries Screen:
```
┌─────────────────────────────────────┐
│  [🔥 HOT]  [❌ LOST]  [✅ BOOKED]    │ ← Category Tabs
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 📝 John Doe                          │
│    +919876543210                     │
│    Tata Nexon XZ+                   │
│    [Convert to Booking] [Edit]      │
└─────────────────────────────────────┘
```

### Bookings Screen:
```
┌─────────────────────────────────────────────┐
│ [📅Today] [🚗Delivery] [⏰Pending] [🔴Overdue] [📋All] │ ← Timeline
└─────────────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 🚗 Test Booking Customer             │
│    Tata Harrier EV Adventure        │
│    Status: CONFIRMED                │
│    Delivery: Nov 15, 2025           │
│    Finance: HDFC Bank ✓             │
│    [Update] [View Details]          │
└─────────────────────────────────────┘
```

---

## 🎨 STYLING RECOMMENDATIONS

- Use Material Design or your existing design system
- Category badges: HOT (red), LOST (gray), BOOKED (green)
- Timeline tabs: Active tab highlighted
- Status chips with colors:
  - PENDING: yellow
  - CONFIRMED: green
  - CANCELLED: red
  - DELIVERED: blue
- Date pickers with clear format display
- Loading skeletons while fetching

---

## 🚀 QUICK START CODE

### Step 1: Install Dependencies
```bash
npm install @react-native-firebase/auth date-fns
```

### Step 2: Create API Config
```typescript
// services/api.config.ts
import { getAuth } from '@react-native-firebase/auth';

export const API_URL = 'http://10.69.245.247:4000/api';

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getAuth().currentUser?.getIdToken();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
  
  const result = await response.json();
  if (!result.success) throw new Error(result.message);
  return result.data;
}
```

### Step 3: Copy Service Files
Use the service files provided in EXPO_APP_COMPLETE_INTEGRATION_GUIDE.md

### Step 4: Create Screens
Implement the UI screens based on the examples provided

---

## ✅ SUCCESS CRITERIA

Your app should:
- ✅ Create enquiries with proper enum values (UPPERCASE)
- ✅ Display enquiries in 3 category tabs
- ✅ Convert HOT enquiries to bookings (with stock validation)
- ✅ Show bookings in 5 timeline categories
- ✅ Update booking fields with ISO date format
- ✅ Handle all error scenarios gracefully
- ✅ Show loading and empty states
- ✅ Refresh data after updates

---

## 🎯 DELIVERABLES

After implementation, your app should have:
1. ✅ Enquiry creation flow
2. ✅ Enquiry category tabs (HOT, LOST, BOOKED)
3. ✅ Auto-booking conversion with stock validation
4. ✅ Booking timeline tabs (Today, Delivery, Pending, Overdue, All)
5. ✅ Booking update form with all advisor-editable fields
6. ✅ Quotation viewing (creation if permission added)
7. ✅ Proper error handling
8. ✅ Loading states
9. ✅ Empty states
10. ✅ Pull-to-refresh

---

**Copy this entire prompt and paste it into Cursor AI in your Expo project to implement the complete integration!**
```

---

## 📚 Additional Resources

The following files contain detailed implementation guides:
1. `EXPO_APP_COMPLETE_INTEGRATION_GUIDE.md` - Full API specs
2. `COMPLETE_SYSTEM_SUMMARY.md` - System overview
3. `BOOKING_TIMELINE_CATEGORIZATION.md` - Timeline feature details
4. `AUTO_BOOKING_CONVERSION_GUIDE.md` - Auto-conversion logic
5. `STOCK_VALIDATION_GUIDE.md` - Stock validation details

---

**Last Updated:** October 9, 2025  
**For:** React Native / Expo App Integration  
**Backend:** Car Dealership Management System v1.5.0

