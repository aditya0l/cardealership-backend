# 🎨 Phase 2 UI Changes Summary

**Date:** January 2025  
**Status:** Complete UI Update Guide

---

## 📱 Expo App UI Changes

### 1. **Enquiry Update Screen** - Locked Entries & Lost Reason
**File:** `src/screens/enquiries/UpdateEnquiryScreen.tsx`

**UI Changes:**
- ✅ Add "Reason for Lost" input field (required when category = LOST)
- ✅ Disable edit buttons for closed enquiries
- ✅ Show error message: "This enquiry is closed and cannot be updated"
- ✅ Show validation error when marking LOST without reason
- ✅ Add confirmation dialog before marking as LOST

**Visual Elements:**
```
[Category Dropdown] → Select "LOST" → [Reason Dialog Appears]
[Reason Input] (required, multiline)
[Cancel] [Confirm] buttons
```

---

### 2. **Enquiry List Screen** - Auto-Hide Booked/Lost
**File:** `src/screens/enquiries/EnquiriesScreen.tsx`

**UI Changes:**
- ✅ Change page title to **"Hot Enquiry Overview"**
- ✅ Add subtitle: **"TRACK & MANAGE YOUR ENQUIRY"**
- ✅ Filter by default: `category=HOT&status=OPEN`
- ✅ Optionally add filter buttons to show Booked/Lost (for history view)

**Visual Elements:**
```
┌─────────────────────────────────────┐
│  Hot Enquiry Overview              │
│  TRACK & MANAGE YOUR ENQUIRY       │
│                                     │
│  [Filter: HOT | BOOKED | LOST]    │ ← Optional
│                                     │
│  [Enquiry List - Only HOT/OPEN]   │
└─────────────────────────────────────┘
```

---

### 3. **NEW: Team Leader Dashboard Screen**
**File:** `src/screens/dashboard/TeamLeaderDashboardScreen.tsx` (NEW)

**UI Components:**
- ✅ **Team Size** card - Total team members
- ✅ **Total Hot Inquiry Count** card - Active hot leads
- ✅ **Pending CA on Update** card - CAs who missed updates today
- ✅ **Pending Enquiries To Update** card - Enquiries needing action
- ✅ **Today's Booking Plan** card - Sum of EDB == Today

**Visual Layout:**
```
┌─────────────────────────────────────────┐
│  Team Leader Dashboard                 │
├─────────────────────────────────────────┤
│  [Team Size]      [Hot Inquiry Count]  │
│       5                  12             │
├─────────────────────────────────────────┤
│  [Pending CA]     [Pending Enquiries]  │
│       3                  8              │
├─────────────────────────────────────────┤
│  [Today's Booking Plan]                │
│       5                                 │
└─────────────────────────────────────────┘
```

**Navigation:**
- Add route: `TeamLeaderDashboardScreen`
- Add menu item for Team Leads only

---

### 4. **Booking Detail Screen** - Vahan Date Field
**File:** `src/screens/bookings/BookingDetailScreen.tsx`

**UI Changes:**
- ✅ Add **"Vahan Date"** date picker field
- ✅ Show current vahan date (if exists)
- ✅ Update button to save vahan date
- ✅ Success/error messages for update

**Visual Elements:**
```
┌─────────────────────────────────┐
│  Booking Details               │
│                                 │
│  Vahan Date: [Date Picker]    │ ← NEW
│  [📅 Select Date]              │
│                                 │
│  [Save Vahan Date]             │ ← NEW
└─────────────────────────────────┘
```

**API Call:**
```typescript
PUT /api/bookings/:id/vahan-date
Body: { "vahanDate": "2025-01-15T00:00:00Z" }
```

---

### 5. **Dashboard Screen** - Funnel Math Display
**File:** `src/screens/dashboard/DashboardScreen.tsx`

**UI Changes:**
- ✅ Add **"Bookings Funnel"** section/widget
- ✅ Display: Carry Forward, New This Month, Delivered, Lost, Actual Live

**Visual Layout:**
```
┌─────────────────────────────────┐
│  Bookings Funnel                │
├─────────────────────────────────┤
│  Carry Forward:        25       │
│  New This Month:       10       │
│  Delivered:            5        │
│  Lost:                 2        │
│  ─────────────────────────      │
│  Actual Live:          28       │ ← Calculated
└─────────────────────────────────┘
```

---

### 6. **Header Component** - Employee Info Display
**File:** `src/components/Header.tsx` or similar

**UI Changes:**
- ✅ Display **Employee ID** (e.g., "ADV001")
- ✅ Display **Dealership Name** (from user profile)
- ✅ Update profile info display

**Visual Elements:**
```
┌─────────────────────────────────┐
│  [Logo]  Employee: ADV001      │ ← NEW
│          Dealership: ABC Motors │ ← NEW
│          [Profile] [Logout]     │
└─────────────────────────────────┘
```

---

### 7. **Enquiry Form** - Enhanced Validations
**File:** `src/screens/enquiries/CreateEnquiryScreen.tsx`

**UI Changes:**
- ✅ **Expected Booking Date (EDB)** - Make mandatory (required)
- ✅ **Next Follow-up Date** - Make mandatory (required)
- ✅ **CA Remarks** - Make mandatory (required)
- ✅ **Source Dropdown** - Must select from list (required)
- ✅ Add validation messages for all required fields
- ✅ Prevent past dates for EDB and Next Follow-up

**Visual Elements:**
```
┌─────────────────────────────────┐
│  Create Enquiry                │
│                                 │
│  Customer Name: *[Required]    │
│  Contact: *[Required]          │
│  Source: *[Dropdown Required]  │ ← Enhanced
│  EDB: *[Date Required]         │ ← NEW mandatory
│  Next Follow-up: *[Required]   │ ← NEW mandatory
│  CA Remarks: *[Required]       │ ← Enhanced
│                                 │
│  [Create] [Cancel]             │
└─────────────────────────────────┘
```

---

### 8. **Notification Handler** - Escalation Alerts
**File:** Notification handler/service

**UI Changes:**
- ✅ Handle **Inactivity Alert** (5 days no update)
- ✅ Handle **Aging Alerts** (20-25, 30-35, 40+ days)
- ✅ Handle **Retail Delay Alert** (15 days not retailed)
- ✅ Show notification with alert type and message
- ✅ Navigate to enquiry detail on tap

**Visual Elements:**
```
┌─────────────────────────────────┐
│  🚨 Inactivity Alert            │
│  Enquiry for John (Honda)      │
│  has no updates for 5 days     │
│                                 │
│  [View Enquiry] [Dismiss]      │
└─────────────────────────────────┘
```

---

## 🖥️ Dashboard (React) UI Changes

### 1. **Enquiry Detail/Edit Page** - Lost Reason Dialog
**File:** `src/pages/enquiries/EnquiryDetailPage.tsx` or `EditEnquiryDialog.tsx`

**UI Changes:**
- ✅ Add **"Reason for Lost" Dialog** (Material-UI Dialog)
- ✅ Show dialog when changing category to LOST
- ✅ Multiline text field for reason (required)
- ✅ Disable edit buttons when enquiry status = CLOSED
- ✅ Show error banner: "This enquiry is closed and cannot be updated"

**Visual Elements:**
```
[Category Dropdown] → Select "LOST"
    ↓
┌─────────────────────────────────┐
│  Reason for Lost               │
├─────────────────────────────────┤
│  Please provide a reason:      │
│  ┌───────────────────────────┐ │
│  │ [Multiline Text Field]   │ │
│  │                           │ │
│  └───────────────────────────┘ │
│                                 │
│  [Cancel]  [Confirm Lost]      │
└─────────────────────────────────┘
```

---

### 2. **Enquiry List Page** - Title & Filtering
**File:** `src/pages/enquiries/EnquiriesPage.tsx`

**UI Changes:**
- ✅ Change page title to **"Hot Enquiry Overview"**
- ✅ Add subtitle: **"TRACK & MANAGE YOUR ENQUIRY"**
- ✅ Default filter: `category=HOT&status=OPEN`
- ✅ Add filter chips/buttons: HOT | BOOKED | LOST

**Visual Elements:**
```
┌─────────────────────────────────────┐
│  Hot Enquiry Overview              │
│  TRACK & MANAGE YOUR ENQUIRY       │
│                                     │
│  [HOT] [BOOKED] [LOST]            │ ← Filter chips
│                                     │
│  [Enquiry Table - Only HOT/OPEN]  │
└─────────────────────────────────────┘
```

---

### 3. **NEW: Team Leader Dashboard Page**
**File:** `src/pages/dashboard/TeamLeaderDashboardPage.tsx` (NEW)

**UI Components:**
- ✅ Material-UI Grid layout with Cards
- ✅ **Team Size** card with large number display
- ✅ **Total Hot Inquiry Count** card (primary color)
- ✅ **Pending CA on Update** card (error color)
- ✅ **Pending Enquiries To Update** card (warning color)
- ✅ **Today's Booking Plan** card (success color)

**Visual Layout:**
```
┌─────────────────────────────────────────────┐
│  Team Leader Dashboard                     │
├─────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐           │
│  │ Team Size  │  │ Hot Inq.   │           │
│  │     5      │  │    12      │           │
│  └────────────┘  └────────────┘           │
│                                             │
│  ┌────────────┐  ┌────────────┐           │
│  │ Pending CA │  │ Pending    │           │
│  │     3      │  │ Enquiries  │           │
│  └────────────┘  └────────────┘           │
│                                             │
│  ┌─────────────────────────────┐           │
│  │ Today's Booking Plan        │           │
│  │         5                   │           │
│  └─────────────────────────────┘           │
└─────────────────────────────────────────────┘
```

**Navigation:**
- Add route: `/dashboard/team-leader`
- Add menu item in navigation (Team Lead role only)

---

### 4. **Booking Detail Page** - Vahan Date Field
**File:** `src/pages/bookings/BookingDetailPage.tsx`

**UI Changes:**
- ✅ Add **"Vahan Date"** field with Material-UI DatePicker
- ✅ Use `@mui/x-date-pickers` DatePicker component
- ✅ Show current vahan date (if exists)
- ✅ Update button to save vahan date
- ✅ Success/error snackbar messages

**Visual Elements:**
```
┌─────────────────────────────────┐
│  Booking Details               │
│                                 │
│  Customer: John Doe            │
│  Vehicle: Honda City           │
│                                 │
│  Vahan Date:                   │ ← NEW
│  ┌───────────────────────────┐ │
│  │ [📅 Date Picker]         │ │
│  └───────────────────────────┘ │
│                                 │
│  [Save Vahan Date]             │ ← NEW
└─────────────────────────────────┘
```

**Dependencies:**
```bash
npm install @mui/x-date-pickers date-fns
```

---

### 5. **Dashboard Page** - Funnel Math Widget
**File:** `src/pages/dashboard/DashboardPage.tsx`

**UI Changes:**
- ✅ Add **"Bookings Funnel"** table/widget
- ✅ Material-UI Table component
- ✅ Display: Carry Forward, New This Month, Delivered, Lost, Actual Live

**Visual Layout:**
```
┌─────────────────────────────────┐
│  Bookings Funnel                │
├─────────────────────────────────┤
│  Metric            │   Count   │
├────────────────────┼───────────┤
│  Carry Forward     │     25    │
│  New This Month    │     10    │
│  Delivered         │      5    │
│  Lost              │      2    │
├────────────────────┼───────────┤
│  Actual Live       │     28    │ ← Bold
└─────────────────────────────────┘
```

---

### 6. **Header Component** - Employee Info
**File:** `src/components/Header.tsx` or `src/layouts/MainLayout.tsx`

**UI Changes:**
- ✅ Display **Employee ID** in header (Typography component)
- ✅ Display **Dealership Name** (from user profile)
- ✅ Update profile menu to show employee info

**Visual Elements:**
```
┌─────────────────────────────────────────┐
│  [Logo]  AutoQuik                      │
│          Employee: ADV001              │ ← NEW
│          Dealership: ABC Motors        │ ← NEW
│                       [Profile] [Logout]│
└─────────────────────────────────────────┘
```

---

### 7. **Enquiry Form** - Enhanced Validations
**File:** `src/pages/enquiries/CreateEnquiryDialog.tsx` or `EnquiryForm.tsx`

**UI Changes:**
- ✅ Use `react-hook-form` + `yup` for validation
- ✅ **Expected Booking Date (EDB)** - Required, DatePicker
- ✅ **Next Follow-up Date** - Required, DatePicker
- ✅ **CA Remarks** - Required, multiline TextField
- ✅ **Source** - Required, Select dropdown
- ✅ Validation error messages below each field
- ✅ Disable submit until all validations pass

**Visual Elements:**
```
┌─────────────────────────────────┐
│  Create Enquiry                │
│                                 │
│  Customer Name *               │
│  [TextField]                   │
│                                 │
│  Source *                      │
│  [Select Dropdown ▼]          │ ← Required
│                                 │
│  Expected Booking Date *       │ ← NEW mandatory
│  [📅 DatePicker]              │
│                                 │
│  Next Follow-up Date *         │ ← NEW mandatory
│  [📅 DatePicker]              │
│                                 │
│  CA Remarks *                  │ ← Required
│  [Multiline TextField]         │
│                                 │
│  [Create Enquiry] [Cancel]     │
└─────────────────────────────────┘
```

**Dependencies:**
```bash
npm install react-hook-form @hookform/resolvers yup
```

---

### 8. **Notification Handler** - Escalation Alerts
**File:** Notification service/handler

**UI Changes:**
- ✅ Handle FCM notification types: `inactivity_alert`, `aging_alert`, `retail_delay_alert`
- ✅ Show Material-UI Snackbar or Alert for each notification
- ✅ Navigate to enquiry/booking detail on click
- ✅ Different colors/severity for different alert types

**Visual Elements:**
```
┌─────────────────────────────────┐
│  🚨 Inactivity Alert            │
│  Enquiry for John (Honda)      │
│  has no updates for 5 days     │
│                                 │
│  [View Enquiry] [Dismiss]      │
└─────────────────────────────────┘
```

**Notification Types:**
- 🔴 **High Priority:** Inactivity (5 days), Retail Delay (15 days)
- 🟡 **Medium Priority:** Aging 20-25 days
- 🟠 **High Priority:** Aging 30-35 days
- 🔴 **Critical:** Aging 40+ days

---

## 📋 Summary Checklist

### Expo App UI Updates:
- [ ] Update Enquiry Update Screen (Lost reason, locked entries)
- [ ] Update Enquiry List Screen (title, filtering)
- [ ] Create Team Leader Dashboard Screen (NEW)
- [ ] Add Vahan Date field to Booking Detail
- [ ] Add Funnel Math to Dashboard Screen
- [ ] Update Header Component (employee info)
- [ ] Update Enquiry Form (validations)
- [ ] Handle Escalation Alert notifications

### Dashboard UI Updates:
- [ ] Update Enquiry Detail Page (Lost reason dialog, locked entries)
- [ ] Update Enquiry List Page (title, filtering)
- [ ] Create Team Leader Dashboard Page (NEW)
- [ ] Add Vahan Date field to Booking Detail
- [ ] Add Funnel Math widget to Dashboard
- [ ] Update Header Component (employee info)
- [ ] Update Enquiry Form (validations with react-hook-form)
- [ ] Handle Escalation Alert notifications

---

## 🔗 Related Documentation


- **Expo App Guide:** `EXPO_APP_PHASE2_UPDATES.md`
- **Dashboard Guide:** `DASHBOARD_PHASE2_UPDATES.md`
- **Backend API:** `API_ENDPOINT_DOCUMENTATION.md`
- **Verification:** `PHASE_2_VERIFICATION_REPORT.md`

---

**Last Updated:** January 2025

