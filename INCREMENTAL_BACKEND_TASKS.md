# 🔧 Incremental Backend Tasks - AutoQuik CRM Updates

**Date:** December 2025  
**Status:** New Features Only - Incremental Changes

---

## 📋 Task Summary

This document outlines **ONLY the new backend changes** required. Existing functionality is preserved.

---

## 1. Source of Inquiry Dropdown (Backend Sync)

**Task Name:** Restrict EnquirySource Enum to Final List  
**Priority:** High  
**Status:** ⚠️ Requires Enum Mapping

### Description
Backend currently supports 15+ EnquirySource values. Need to restrict to final list and map frontend labels to backend enum values.

### Current State
- Enum has: `WALK_IN`, `PHONE_CALL`, `WEBSITE`, `DIGITAL`, `SOCIAL_MEDIA`, `REFERRAL`, `ADVERTISEMENT`, `EMAIL`, `SHOWROOM_VISIT`, `EVENT`, `BTL_ACTIVITY`, `WHATSAPP`, `OUTBOUND_CALL`, `OTHER`
- Frontend wants: `["Showroom Walk-in", "Digital", "BTL Activity", "Tele-in", "Referral"]`

### Changes Required

**Files to Update:**
- `src/controllers/enquiries.controller.ts` - Add validation/mapping
- `src/services/enquiry-import.service.ts` - Update CSV import mapping (if applicable)

**Data Model Changes:**
- None (use existing enum values with mapping)

**Implementation:**
```typescript
// Add mapping in enquiries.controller.ts
const SOURCE_MAPPING = {
  'Showroom Walk-in': 'SHOWROOM_VISIT',
  'Digital': 'DIGITAL',
  'BTL Activity': 'BTL_ACTIVITY',
  'Tele-in': 'PHONE_CALL',
  'Referral': 'REFERRAL'
};

// Validate and map in createEnquiry/updateEnquiry
const mappedSource = SOURCE_MAPPING[source] || source;
if (!Object.values(SOURCE_MAPPING).includes(mappedSource)) {
  throw createError('Invalid source. Allowed: Showroom Walk-in, Digital, BTL Activity, Tele-in, Referral', 400);
}
```

**Notes:**
- Keep existing enum values in DB (no migration needed)
- Add validation layer to restrict accepted values
- Return user-friendly error messages

---

## 2. Vehicle Details Auto-Population (CSV → Inquiry)

**Task Name:** Add FuelType Field & Quotation CSV Import Logic  
**Priority:** High  
**Status:** ⚠️ Partial - Missing fuelType field

### Description
Parse 4 fields from Quotation CSV and store in Inquiry table. Mark fields as read-only after import.

### CSV Format (Confirmed)
The quotation CSV has the following structure:
```
Active VC,Model,FUEL,Variant,Color,Transmissions
54710926AIJR,Curvv,Diesel,Curvv Creative S DCA 1.5,PRISTINE WHITE,DCA
...
```

**Columns to Parse:**
- `Model` → `enquiry.model`
- `Variant` → `enquiry.variant`
- `FUEL` → `enquiry.fuelType` (NEW FIELD)
- `Color` → `enquiry.color`

**Note:** `Active VC` and `Transmissions` are not required for enquiry creation.

### Current State
- Enquiry model has: `model`, `variant`, `color` ✅
- Missing: `fuelType` field ❌
- No quotation CSV import service exists ❌
- Existing `EnquiryImportService` handles different CSV format

### Changes Required

**Files to Update:**
- `prisma/schema.prisma` - Add `fuelType` field to Enquiry model
- `src/services/quotation-import.service.ts` - **NEW FILE** - Create service to parse quotation CSV
- `src/controllers/quotation-import.controller.ts` - **NEW FILE** - Create controller for quotation import endpoint
- `src/routes/quotation-import.routes.ts` - **NEW FILE** - Create routes
- `src/controllers/enquiries.controller.ts` - Add read-only validation for imported fields
- `src/app.ts` - Register new routes
- Create migration: `prisma/migrations/YYYYMMDD_add_fuel_type_to_enquiry/migration.sql`

**Data Model Changes:**
```prisma
model Enquiry {
  // ... existing fields
  fuelType String? @map("fuel_type")  // NEW FIELD
  // Add flag to mark as imported from quotation CSV
  isImportedFromQuotation Boolean @default(false) @map("is_imported_from_quotation")  // NEW FIELD
  quotationImportedAt DateTime? @map("quotation_imported_at")  // NEW FIELD
}
```

**Implementation Steps:**

1. **Add `fuelType` field to schema:**
   ```prisma
   model Enquiry {
     fuelType String? @map("fuel_type")
     isImportedFromQuotation Boolean @default(false) @map("is_imported_from_quotation")
     quotationImportedAt DateTime? @map("quotation_imported_at")
   }
   ```

2. **Create `QuotationImportService`** (similar to `BookingImportService`):
   ```typescript
   export interface QuotationImportRow {
     model: string;
     variant: string;
     fuel: string;  // Maps to fuelType
     color: string;
   }
   
   static async parseCSV(filePath: string): Promise<ImportResult> {
     // Parse CSV with headers: Active VC, Model, FUEL, Variant, Color, Transmissions
     // Extract only: Model, Variant, FUEL, Color
   }
   ```

3. **Create import endpoint:**
   ```
   POST /api/quotation-import/upload
   ```
   - Accepts CSV/Excel file
   - Parses rows
   - Creates enquiries with vehicle details
   - Sets `isImportedFromQuotation = true`
   - Sets `quotationImportedAt = new Date()`

4. **Block updates to imported fields:**
   ```typescript
   // In updateEnquiry
   if (existingEnquiry.isImportedFromQuotation) {
     const protectedFields = ['model', 'variant', 'color', 'fuelType'];
     const updateKeys = Object.keys(updateFields);
     const hasProtectedFields = updateKeys.some(key => protectedFields.includes(key));
     
     if (hasProtectedFields) {
       throw createError('Cannot update vehicle details imported from quotation CSV. These fields are read-only.', 403);
     }
   }
   ```

**Notes:**
- Follow the same pattern as `BookingImportService` for consistency
- CSV may have inconsistent column names (FUEL vs Fuel, Color vs Colour) - handle case-insensitive matching
- Consider creating `QuotationImport` model to track import history (similar to `BookingImport`)

---

## 3. EDB & Follow-up Date Validation (Server-Side)

**Task Name:** Enforce Mandatory Dates & Past Date Validation  
**Priority:** High  
**Status:** ⚠️ Partial - Validation exists but not strict enough

### Description
Make EDB and Follow-up Date mandatory. Block past dates.

### Current State
- `expectedBookingDate` exists but is optional (`DateTime?`)
- `nextFollowUpDate` exists but is optional (`DateTime?`)
- Basic past date validation exists in create, but not in update

### Changes Required

**Files to Update:**
- `prisma/schema.prisma` - Make fields required (BREAKING CHANGE - needs migration strategy)
- `src/controllers/enquiries.controller.ts` - Add strict validation in create & update
- `src/services/enquiry-import.service.ts` - Validate dates in CSV import

**Data Model Changes:**
```prisma
model Enquiry {
  // Change from optional to required
  expectedBookingDate DateTime @map("expected_booking_date")  // Remove ?
  nextFollowUpDate DateTime @map("next_follow_up_date")  // Remove ?
}
```

**Implementation:**
```typescript
// In createEnquiry & updateEnquiry
if (!expectedBookingDate) {
  throw createError('Expected booking date (EDB) is mandatory', 400);
}

if (!nextFollowUpDate) {
  throw createError('Follow-up date is mandatory', 400);
}

const today = new Date();
today.setHours(0, 0, 0, 0);

if (new Date(expectedBookingDate) < today) {
  throw createError('Expected booking date cannot be in the past', 400);
}

if (new Date(nextFollowUpDate) < today) {
  throw createError('Follow-up date cannot be in the past', 400);
}
```

**Migration Strategy:**
- For existing records: Set default dates (e.g., today + 7 days) before making field required
- Create migration script to backfill dates

**Notes:**
- This is a breaking change - existing enquiries without dates need migration
- Consider soft validation first (warnings) then hard validation

---

## 4. Remarks System Enhancements

**Task Name:** Enhance Remarks Retrieval & Limits  
**Priority:** Medium  
**Status:** ⚠️ Partial - Basic remarks exist

### Description
Retrieve last 3-5 remarks chronologically. Support CA, TL, SM authors. Limit total to 20. Mark older as non-editable.

### Current State
- Remarks model exists ✅
- Currently retrieves last 3 days of remarks (not last 3-5 remarks)
- `cancellationReason` field exists ✅
- No limit on total remarks
- No "non-editable" flag

### Changes Required

**Files to Update:**
- `src/controllers/enquiries.controller.ts` - Update `getEnquiryById` to get last 3-5 remarks (not by date)
- `src/controllers/remark.controller.ts` - Add total remark limit (20 max)
- `prisma/schema.prisma` - Add `isEditable` field (optional, defaults to true)

**Data Model Changes:**
```prisma
model Remark {
  // ... existing fields
  isEditable Boolean @default(true) @map("is_editable")  // NEW FIELD
}
```

**Implementation:**
```typescript
// In getEnquiryById - change from date-based to count-based
const remarks = await prisma.remark.findMany({
  where: {
    enquiryId: id,
    isCancelled: false
  },
  orderBy: { createdAt: 'desc' },
  take: 5,  // Last 5 remarks
  include: { user: { ... } }
});

// In addEnquiryRemark - check total limit
const totalRemarks = await prisma.remark.count({
  where: { enquiryId, isCancelled: false }
});

if (totalRemarks >= 20) {
  throw createError('Maximum 20 remarks allowed per enquiry', 400);
}

// Mark older remarks as non-editable (keep last 5 editable)
const allRemarks = await prisma.remark.findMany({
  where: { enquiryId, isCancelled: false },
  orderBy: { createdAt: 'desc' }
});

for (let i = 5; i < allRemarks.length; i++) {
  await prisma.remark.update({
    where: { id: allRemarks[i].id },
    data: { isEditable: false }
  });
}
```

**Notes:**
- Author support (CA, TL, SM) already exists via `createdBy` relation
- Consider adding batch update job to mark old remarks as non-editable

---

## 5. Conversion Logic (Hot → Booking / Lost)

**Task Name:** Enhance Locking & Notification Logic  
**Priority:** High  
**Status:** ⚠️ Partial - Basic conversion exists

### Description
Lock enquiry on conversion. Trigger appropriate notifications.

### Current State
- HOT → BOOKED: Creates booking, closes enquiry ✅
- HOT → LOST: Requires reason, closes enquiry ✅
- Locking exists for CLOSED status ✅
- Notifications exist but may need enhancement

### Changes Required

**Files to Update:**
- `src/controllers/enquiries.controller.ts` - Enhance locking logic in `updateEnquiry`
- `src/services/notification-trigger.service.ts` - Ensure TL/SM notifications fire correctly

**Implementation:**
```typescript
// In updateEnquiry - when category changes to BOOKED
if (category === EnquiryCategory.BOOKED && existingEnquiry.category !== EnquiryCategory.BOOKED) {
  // Existing booking creation logic...
  
  // ✅ Lock enquiry (already done via status = CLOSED)
  // ✅ Trigger TL notification (verify this works)
  await NotificationTriggerService.triggerEnquiryBookedNotification(enquiry, booking);
}

// In updateEnquiry - when category changes to LOST
if (category === EnquiryCategory.LOST && existingEnquiry.category !== EnquiryCategory.LOST) {
  // Existing lost reason logic...
  
  // ✅ Lock enquiry (already done via status = CLOSED)
  // ✅ Trigger TL + SM notification
  await NotificationTriggerService.triggerEnquiryLostNotification(enquiry, lostReason);
}
```

**Notes:**
- Verify notification triggers exist and work correctly
- May need to add new notification methods if missing

---

## 6. TL Dashboard Backend Updates

**Task Name:** Verify All Metrics Are Correct  
**Priority:** Low  
**Status:** ✅ Already Implemented

### Description
All required metrics already exist in `getTeamLeaderDashboard` endpoint.

### Current State
- ✅ Team Size
- ✅ Total Hot Inquiries
- ✅ Pending CA Updates
- ✅ Pending Enquiries
- ✅ Today's Booking Plan (EDB == Today)

### Changes Required
**None** - All metrics are already implemented in `src/controllers/dashboard.controller.ts`

**Notes:**
- Endpoint: `GET /api/dashboard/team-leader`
- Verify calculations match frontend expectations

---

## 7. Escalation Matrix (New Cron Jobs)

**Task Name:** Verify Escalation Cron Jobs  
**Priority:** Medium  
**Status:** ✅ Already Implemented

### Description
All escalation rules already exist in cron service.

### Current State
- ✅ 5 days no activity → Notify TL (in `processInactivityAlerts`)
- ✅ 20-25 day lead age → Notify CA + TL (in `processAgingAlerts`)
- ✅ 30-35 days → Notify SM (in `processAgingAlerts`)
- ✅ 40+ days → Notify GM (in `processAgingAlerts`)
- ✅ 15-day post-booking retail delay → Notify CA + TL (in `processRetailDelayAlerts`)

### Changes Required
**None** - All escalation jobs are implemented in `src/services/followup-notification.service.ts`

**Notes:**
- Runs daily at 8:00 AM via `src/services/cron.service.ts`
- Verify notification recipients are correct

---

## 8. Locking Logic

**Task Name:** Enhance Update Blocking for Booked/Lost Enquiries  
**Priority:** High  
**Status:** ⚠️ Partial - Basic locking exists

### Description
Block all update API calls for Booked/Lost enquiries except remark additions.

### Current State
- Locking exists for `status = CLOSED` ✅
- But category-based locking may need enhancement

### Changes Required

**Files to Update:**
- `src/controllers/enquiries.controller.ts` - Enhance `updateEnquiry` to check category
- `src/controllers/remark.controller.ts` - Ensure remarks can still be added to locked enquiries

**Implementation:**
```typescript
// In updateEnquiry - before processing updates
if (existingEnquiry.status === EnquiryStatus.CLOSED) {
  // Allow only remark additions
  const allowedFields = ['caRemarks']; // Only allow adding remarks
  const updateKeys = Object.keys(updateFields);
  const hasOnlyRemarks = updateKeys.every(key => allowedFields.includes(key));
  
  if (!hasOnlyRemarks) {
    throw createError('Cannot update closed enquiry. Entry is locked. Only remarks can be added.', 403);
  }
}

// Also check category
if (existingEnquiry.category === EnquiryCategory.BOOKED || 
    existingEnquiry.category === EnquiryCategory.LOST) {
  // Same logic - only allow remarks
  const allowedFields = ['caRemarks'];
  const updateKeys = Object.keys(updateFields);
  const hasOnlyRemarks = updateKeys.every(key => allowedFields.includes(key));
  
  if (!hasOnlyRemarks) {
    throw createError('Cannot update booked/lost enquiry. Entry is locked. Only remarks can be added.', 403);
  }
}
```

**Notes:**
- Remarks endpoint should work independently (not blocked)
- Consider adding `isLocked` computed field in response

---

## 📊 Implementation Priority Summary

| Task | Priority | Complexity | Estimated Effort |
|------|----------|------------|------------------|
| 1. Source Dropdown Mapping | High | Low | 2 hours |
| 2. Vehicle Details + CSV Import | High | Medium | 8 hours |
| 3. EDB/Follow-up Validation | High | Medium | 4 hours |
| 4. Remarks Enhancements | Medium | Low | 4 hours |
| 5. Conversion Logic | High | Low | 2 hours |
| 6. TL Dashboard | Low | None | 0 hours (verify only) |
| 7. Escalation Matrix | Medium | None | 0 hours (verify only) |
| 8. Locking Logic | High | Low | 2 hours |

**Total Estimated Effort:** ~22 hours

---

## 🔄 Migration Strategy

1. **Phase 1 (Non-Breaking):**
   - Task 1: Source mapping (no DB changes)
   - Task 4: Remarks enhancements (additive)
   - Task 5: Conversion logic (enhancement)
   - Task 8: Locking logic (enhancement)

2. **Phase 2 (Requires Migration):**
   - Task 2: Add fuelType field (additive, safe)
   - Task 3: Make dates required (BREAKING - needs backfill)

3. **Phase 3 (Verification):**
   - Task 6: TL Dashboard (verify)
   - Task 7: Escalation Matrix (verify)

---

## 📝 Notes

- All existing functionality is preserved
- Only incremental changes are documented
- Database migrations needed for Tasks 2 & 3
- No changes needed for Tasks 6 & 7 (already implemented)

