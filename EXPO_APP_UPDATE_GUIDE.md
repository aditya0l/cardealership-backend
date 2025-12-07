# 📱 Expo App Update Guide - Backend Changes Integration

**Date:** December 3, 2025  
**Backend Version:** Updated with incremental tasks

---

## 🎯 Overview

This guide outlines all changes needed in the Expo app to work with the updated backend.

---

## 1. Source of Inquiry Dropdown (CRITICAL UPDATE)

### **Backend Change:**
- Source dropdown now restricted to **5 values only**
- Frontend labels must map to backend enum values

### **Expo App Updates Required:**

#### **A. Update Source Dropdown Options:**
```typescript
// OLD (Remove all other options):
const SOURCE_OPTIONS = [
  'WALK_IN',
  'PHONE_CALL',
  'WEBSITE',
  'DIGITAL',
  // ... many more
];

// NEW (Only these 5):
const SOURCE_OPTIONS = [
  'Showroom Walk-in',      // Maps to: SHOWROOM_VISIT
  'Digital',                // Maps to: DIGITAL
  'BTL Activity',          // Maps to: BTL_ACTIVITY
  'Tele-in',               // Maps to: PHONE_CALL
  'Referral'               // Maps to: REFERRAL
];
```

#### **B. Update Source Mapping (if sending enum values):**
```typescript
// If you're sending enum values, map them:
const SOURCE_MAPPING = {
  'Showroom Walk-in': 'SHOWROOM_VISIT',
  'Digital': 'DIGITAL',
  'BTL Activity': 'BTL_ACTIVITY',
  'Tele-in': 'PHONE_CALL',
  'Referral': 'REFERRAL'
};

// When creating/updating enquiry:
const payload = {
  ...otherFields,
  source: SOURCE_MAPPING[selectedSource] // Map before sending
};
```

#### **C. Error Handling:**
```typescript
// Backend will return 400 error if invalid source:
// "Invalid source. Allowed values: Showroom Walk-in, Digital, BTL Activity, Tele-in, Referral"

// Handle in your error handler:
if (error.message.includes('Invalid source')) {
  Alert.alert('Invalid Source', 'Please select a valid source from the dropdown');
}
```

**Files to Update:**
- `src/screens/EnquiryForm.tsx` (or similar)
- `src/components/SourceDropdown.tsx` (if separate component)
- `src/types/enquiry.ts` (update types)

---

## 2. Vehicle Details Auto-Population (NEW FEATURE)

### **Backend Change:**
- Added `fuelType` field to Enquiry model
- Quotation CSV import available
- Imported vehicle fields are **read-only**

### **Expo App Updates Required:**

#### **A. Add FuelType Field to Enquiry Form:**
```typescript
// Add to enquiry form state:
const [fuelType, setFuelType] = useState<string>('');

// Add to form UI (if manual entry needed):
<Picker
  selectedValue={fuelType}
  onValueChange={setFuelType}
  enabled={!isImportedFromQuotation} // Disable if imported
>
  <Picker.Item label="Select Fuel Type" value="" />
  <Picker.Item label="Petrol" value="Petrol" />
  <Picker.Item label="Diesel" value="Diesel" />
  <Picker.Item label="EV" value="EV" />
  <Picker.Item label="CNG" value="CNG" />
  <Picker.Item label="Petrol GDI" value="Petrol GDI" />
</Picker>
```

#### **B. Update Enquiry Type/Interface:**
```typescript
// src/types/enquiry.ts
export interface Enquiry {
  id: string;
  customerName: string;
  customerContact: string;
  model?: string;
  variant?: string;
  color?: string;
  fuelType?: string; // ✅ NEW FIELD
  source: string;
  expectedBookingDate: string;
  nextFollowUpDate: string;
  isImportedFromQuotation?: boolean; // ✅ NEW FIELD
  quotationImportedAt?: string; // ✅ NEW FIELD
  // ... other fields
}
```

#### **C. Handle Read-Only Fields:**
```typescript
// When displaying enquiry details:
const isVehicleFieldEditable = !enquiry.isImportedFromQuotation;

// Disable input fields if imported:
<TextInput
  value={enquiry.model}
  editable={isVehicleFieldEditable}
  style={[
    styles.input,
    !isVehicleFieldEditable && styles.inputDisabled
  ]}
/>

// Show indicator:
{enquiry.isImportedFromQuotation && (
  <Text style={styles.importedBadge}>
    📋 Imported from Quotation CSV (Read-only)
  </Text>
)}
```

#### **D. Update API Calls:**
```typescript
// When creating enquiry:
const createEnquiry = async (data: CreateEnquiryData) => {
  const payload = {
    ...data,
    fuelType: data.fuelType || undefined, // Include fuelType
  };
  
  const response = await api.post('/api/enquiries', payload);
  return response.data;
};

// When updating enquiry - handle read-only error:
try {
  await updateEnquiry(enquiryId, { model: newModel });
} catch (error) {
  if (error.message.includes('Cannot update vehicle details imported from quotation')) {
    Alert.alert(
      'Read-Only Field',
      'Vehicle details imported from quotation CSV cannot be modified.'
    );
  }
}
```

**Files to Update:**
- `src/types/enquiry.ts`
- `src/screens/EnquiryForm.tsx`
- `src/screens/EnquiryDetails.tsx`
- `src/services/enquiry.service.ts`

---

## 3. EDB & Follow-up Date Validation (MANDATORY FIELDS)

### **Backend Change:**
- **EDB (Expected Booking Date)** is now **MANDATORY**
- **Follow-up Date** is now **MANDATORY**
- **Past dates are NOT allowed**

### **Expo App Updates Required:**

#### **A. Make Fields Required in Form:**
```typescript
// Update form validation:
const validateEnquiryForm = (data: EnquiryFormData) => {
  const errors: Record<string, string> = {};
  
  // ... other validations
  
  // ✅ EDB is mandatory
  if (!data.expectedBookingDate) {
    errors.expectedBookingDate = 'Expected booking date is required';
  } else {
    const edbDate = new Date(data.expectedBookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (edbDate < today) {
      errors.expectedBookingDate = 'Expected booking date cannot be in the past';
    }
  }
  
  // ✅ Follow-up date is mandatory
  if (!data.nextFollowUpDate) {
    errors.nextFollowUpDate = 'Follow-up date is required';
  } else {
    const followUpDate = new Date(data.nextFollowUpDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (followUpDate < today) {
      errors.nextFollowUpDate = 'Follow-up date cannot be in the past';
    }
  }
  
  return errors;
};
```

#### **B. Update Form UI:**
```typescript
// Mark fields as required:
<Text style={styles.label}>
  Expected Booking Date (EDB) <Text style={styles.required}>*</Text>
</Text>
<DatePicker
  value={expectedBookingDate}
  onChange={setExpectedBookingDate}
  minimumDate={new Date()} // ✅ Block past dates
  required // ✅ Mark as required
/>

<Text style={styles.label}>
  Follow-up Date <Text style={styles.required}>*</Text>
</Text>
<DatePicker
  value={nextFollowUpDate}
  onChange={setNextFollowUpDate}
  minimumDate={new Date()} // ✅ Block past dates
  required // ✅ Mark as required
/>
```

#### **C. Handle Backend Validation Errors:**
```typescript
// Backend will return 400 if dates are missing or in past:
// "Expected booking date (EDB) is mandatory"
// "Follow-up date is mandatory"
// "Expected booking date cannot be in the past"
// "Follow-up date cannot be in the past"

try {
  await createEnquiry(data);
} catch (error) {
  if (error.message.includes('EDB') || error.message.includes('Expected booking date')) {
    Alert.alert('Validation Error', error.message);
    // Focus on EDB field
  }
  if (error.message.includes('Follow-up date')) {
    Alert.alert('Validation Error', error.message);
    // Focus on follow-up date field
  }
}
```

**Files to Update:**
- `src/screens/EnquiryForm.tsx`
- `src/utils/validation.ts` (if separate validation file)
- `src/components/DatePicker.tsx` (ensure past dates blocked)

---

## 4. Remarks System Enhancements (UI UPDATES)

### **Backend Change:**
- Shows **last 3-5 remarks** (chronological, not by date)
- **20 remark limit** per enquiry
- Older remarks marked as **non-editable**

### **Expo App Updates Required:**

#### **A. Update Remarks Display:**
```typescript
// OLD (showing last 3 days):
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
const recentRemarks = remarks.filter(r => 
  new Date(r.createdAt) >= threeDaysAgo
);

// NEW (show last 3-5 remarks):
// Backend already returns last 5 remarks, just display them:
const displayedRemarks = enquiry.remarkHistory.slice(0, 5); // Show last 5
```

#### **B. Handle 20 Remark Limit:**
```typescript
// Before adding remark, check limit:
const addRemark = async (enquiryId: string, remark: string) => {
  try {
    await api.post(`/api/remarks/enquiry/${enquiryId}`, { remark });
  } catch (error) {
    if (error.message.includes('Maximum 20 remarks allowed')) {
      Alert.alert(
        'Limit Reached',
        'Maximum 20 remarks allowed per enquiry. Please contact admin to remove old remarks.'
      );
      return;
    }
    throw error;
  }
};
```

#### **C. Show Non-Editable Indicator:**
```typescript
// Display remarks with editability status:
{enquiry.remarkHistory.map((remark, index) => (
  <View key={remark.id} style={styles.remarkItem}>
    <Text>{remark.remark}</Text>
    <Text style={styles.remarkMeta}>
      {remark.createdBy.name} • {formatDate(remark.createdAt)}
    </Text>
    
    {/* Show non-editable indicator for older remarks */}
    {!remark.isEditable && (
      <Text style={styles.nonEditableBadge}>
        🔒 Read-only (older remark)
      </Text>
    )}
    
    {/* Only show edit button for editable remarks */}
    {remark.isEditable && (
      <TouchableOpacity onPress={() => editRemark(remark.id)}>
        <Text>Edit</Text>
      </TouchableOpacity>
    )}
  </View>
))}
```

#### **D. Update Remark Type:**
```typescript
// src/types/remark.ts
export interface Remark {
  id: string;
  remark: string;
  remarkType: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    role: {
      id: string;
      name: string;
    };
  };
  isEditable?: boolean; // ✅ NEW FIELD
  cancelled?: boolean;
  cancellationReason?: string;
}
```

**Files to Update:**
- `src/screens/EnquiryDetails.tsx` (remarks display)
- `src/components/RemarksList.tsx` (if separate component)
- `src/types/remark.ts`
- `src/services/remark.service.ts`

---

## 5. Conversion Logic (HOT → BOOKED / LOST)

### **Backend Change:**
- HOT → BOOKED: Locks enquiry, notifies TL
- HOT → LOST: Locks enquiry, requires reason, notifies TL + SM

### **Expo App Updates Required:**

#### **A. Handle Locked Enquiries:**
```typescript
// Check if enquiry is locked:
const isEnquiryLocked = (enquiry: Enquiry) => {
  return enquiry.status === 'CLOSED' || 
         enquiry.category === 'BOOKED' || 
         enquiry.category === 'LOST';
};

// Disable edit button if locked:
{!isEnquiryLocked(enquiry) && (
  <TouchableOpacity onPress={handleEdit}>
    <Text>Edit Enquiry</Text>
  </TouchableOpacity>
)}

// Show locked indicator:
{isEnquiryLocked(enquiry) && (
  <View style={styles.lockedBadge}>
    <Text>🔒 Locked ({enquiry.category})</Text>
  </View>
)}
```

#### **B. Mandatory Reason for LOST:**
```typescript
// When changing to LOST, require reason:
const handleMarkAsLost = async () => {
  Alert.prompt(
    'Reason for Lost',
    'Please provide a reason for marking this enquiry as lost:',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async (reason) => {
          if (!reason || !reason.trim()) {
            Alert.alert('Error', 'Reason is required');
            return;
          }
          
          try {
            await api.put(`/api/enquiries/${enquiryId}`, {
              category: 'LOST',
              lostReason: reason.trim() // ✅ Required field
            });
            Alert.alert('Success', 'Enquiry marked as lost');
          } catch (error) {
            if (error.message.includes('Reason for lost is required')) {
              Alert.alert('Error', 'Please provide a reason');
            }
          }
        }
      }
    ],
    'plain-text'
  );
};
```

#### **C. Handle Conversion Errors:**
```typescript
// When converting HOT → BOOKED:
try {
  await api.put(`/api/enquiries/${enquiryId}`, {
    category: 'BOOKED'
  });
  // Success - enquiry is now locked
  Alert.alert('Success', 'Enquiry converted to booking');
} catch (error) {
  if (error.message.includes('not in stock')) {
    Alert.alert('Stock Error', 'Vehicle variant is not in stock');
  }
  if (error.message.includes('locked')) {
    Alert.alert('Error', 'Enquiry is locked and cannot be updated');
  }
}
```

**Files to Update:**
- `src/screens/EnquiryDetails.tsx`
- `src/components/EnquiryActions.tsx` (if separate component)
- `src/services/enquiry.service.ts`

---

## 6. Enhanced Locking Logic (BOOKED/LOST)

### **Backend Change:**
- Booked/Lost enquiries: **Only remarks can be added**
- All other fields are locked

### **Expo App Updates Required:**

#### **A. Disable All Fields Except Remarks:**
```typescript
// When enquiry is BOOKED or LOST:
const canEditFields = (enquiry: Enquiry) => {
  return enquiry.category !== 'BOOKED' && 
         enquiry.category !== 'LOST' && 
         enquiry.status !== 'CLOSED';
};

// In form:
<TextInput
  value={customerName}
  onChangeText={setCustomerName}
  editable={canEditFields(enquiry)} // ✅ Disable if locked
/>

// Only allow remarks:
{enquiry.category === 'BOOKED' || enquiry.category === 'LOST' ? (
  <View>
    <Text style={styles.lockedMessage}>
      🔒 Enquiry is locked. Only remarks can be added.
    </Text>
    <RemarksInput enquiryId={enquiry.id} />
  </View>
) : (
  <EnquiryForm enquiry={enquiry} />
)}
```

#### **B. Handle Update Errors:**
```typescript
// When trying to update locked enquiry:
try {
  await updateEnquiry(enquiryId, { customerName: newName });
} catch (error) {
  if (error.message.includes('Cannot update booked/lost enquiry')) {
    Alert.alert(
      'Locked Enquiry',
      'This enquiry is locked. Only remarks can be added.',
      [
        { text: 'OK' },
        { 
          text: 'Add Remark', 
          onPress: () => navigation.navigate('AddRemark', { enquiryId })
        }
      ]
    );
  }
}
```

**Files to Update:**
- `src/screens/EnquiryForm.tsx`
- `src/screens/EnquiryDetails.tsx`
- `src/utils/enquiryHelpers.ts` (if helper functions)

---

## 7. API Endpoint Updates

### **New Endpoints:**

#### **A. Quotation Import (Admin Only):**
```typescript
// POST /api/quotation-import/upload
// Admin can import quotation CSV to create enquiries
// Not needed in Expo app (admin feature)
```

### **Updated Endpoints:**

#### **B. Create Enquiry:**
```typescript
// POST /api/enquiries
// Now requires:
{
  expectedBookingDate: string; // ✅ MANDATORY
  nextFollowUpDate: string;    // ✅ MANDATORY
  source: string;              // ✅ Restricted to 5 values
  fuelType?: string;           // ✅ NEW FIELD (optional)
  // ... other fields
}
```

#### **C. Update Enquiry:**
```typescript
// PUT /api/enquiries/:id
// Now validates:
// - Dates cannot be in past
// - Dates are mandatory
// - Source must be from allowed list
// - Vehicle fields locked if imported from quotation
// - All fields locked if BOOKED/LOST (except remarks)
```

---

## 8. TypeScript Type Updates

### **Update Enquiry Interface:**
```typescript
// src/types/enquiry.ts
export interface Enquiry {
  id: string;
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  model?: string;
  variant?: string;
  color?: string;
  fuelType?: string; // ✅ NEW
  source: string;
  expectedBookingDate: string; // ✅ Now mandatory
  nextFollowUpDate: string;     // ✅ Now mandatory
  category: 'HOT' | 'LOST' | 'BOOKED';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  isImportedFromQuotation?: boolean; // ✅ NEW
  quotationImportedAt?: string;     // ✅ NEW
  remarkHistory: Remark[]; // ✅ Now shows last 3-5, includes isEditable
  // ... other fields
}

export interface CreateEnquiryData {
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  model?: string;
  variant?: string;
  color?: string;
  fuelType?: string; // ✅ NEW
  source: 'Showroom Walk-in' | 'Digital' | 'BTL Activity' | 'Tele-in' | 'Referral'; // ✅ Restricted
  expectedBookingDate: string; // ✅ MANDATORY
  nextFollowUpDate: string;     // ✅ MANDATORY
  caRemarks?: string;
  // ... other fields
}
```

### **Update Remark Interface:**
```typescript
// src/types/remark.ts
export interface Remark {
  id: string;
  remark: string;
  remarkType: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    role: {
      id: string;
      name: string;
    };
  };
  isEditable?: boolean; // ✅ NEW
  cancelled?: boolean;
  cancellationReason?: string;
}
```

---

## 9. Error Handling Updates

### **New Error Messages to Handle:**
```typescript
// Error message constants:
const ERROR_MESSAGES = {
  INVALID_SOURCE: 'Invalid source. Allowed values: Showroom Walk-in, Digital, BTL Activity, Tele-in, Referral',
  MANDATORY_EDB: 'Expected booking date (EDB) is mandatory',
  MANDATORY_FOLLOWUP: 'Follow-up date is mandatory',
  PAST_DATE_EDB: 'Expected booking date cannot be in the past',
  PAST_DATE_FOLLOWUP: 'Follow-up date cannot be in the past',
  LOCKED_ENQUIRY: 'Cannot update booked/lost enquiry. Entry is locked. Only remarks can be added.',
  READ_ONLY_VEHICLE: 'Cannot update vehicle details imported from quotation CSV. Fields are read-only.',
  REMARK_LIMIT: 'Maximum 20 remarks allowed per enquiry',
  LOST_REASON_REQUIRED: 'Reason for lost is required. Please provide a reason when marking enquiry as lost.'
};

// Error handler:
const handleEnquiryError = (error: any) => {
  const message = error.response?.data?.message || error.message;
  
  if (message.includes('Invalid source')) {
    Alert.alert('Invalid Source', ERROR_MESSAGES.INVALID_SOURCE);
  } else if (message.includes('EDB') || message.includes('Expected booking date')) {
    Alert.alert('Date Required', message);
  } else if (message.includes('Follow-up date')) {
    Alert.alert('Date Required', message);
  } else if (message.includes('locked')) {
    Alert.alert('Locked Enquiry', message);
  } else if (message.includes('read-only') || message.includes('imported from quotation')) {
    Alert.alert('Read-Only Field', message);
  } else if (message.includes('Maximum 20 remarks')) {
    Alert.alert('Limit Reached', message);
  } else if (message.includes('Reason for lost')) {
    Alert.alert('Reason Required', message);
  } else {
    Alert.alert('Error', message);
  }
};
```

---

## 10. UI/UX Updates Summary

### **Visual Indicators to Add:**
1. ✅ **Required field indicator** (*) for EDB and Follow-up Date
2. ✅ **Read-only badge** for imported vehicle fields
3. ✅ **Locked badge** for BOOKED/LOST enquiries
4. ✅ **Non-editable badge** for older remarks
5. ✅ **20 remark limit warning** when approaching limit

### **Form Validation:**
1. ✅ Block past dates in date pickers
2. ✅ Require EDB and Follow-up Date
3. ✅ Validate source selection
4. ✅ Show error messages inline

### **Disabled States:**
1. ✅ Disable vehicle fields if `isImportedFromQuotation = true`
2. ✅ Disable all fields (except remarks) if `category = BOOKED/LOST`
3. ✅ Disable edit button for non-editable remarks

---

## 📋 Checklist for Expo App Updates

- [ ] **1. Source Dropdown:** Update to 5 values only
- [ ] **2. FuelType Field:** Add to form and types
- [ ] **3. Date Validation:** Make EDB and Follow-up mandatory, block past dates
- [ ] **4. Remarks Display:** Show last 3-5, handle 20 limit, show non-editable
- [ ] **5. Conversion Logic:** Handle BOOKED/LOST locking, require reason for LOST
- [ ] **6. Locking Logic:** Disable fields for BOOKED/LOST, allow only remarks
- [ ] **7. Error Handling:** Add new error messages
- [ ] **8. TypeScript Types:** Update Enquiry and Remark interfaces
- [ ] **9. UI Indicators:** Add badges for locked/read-only states
- [ ] **10. Testing:** Test all new validations and error cases

---

## 🚀 Priority Order

1. **HIGH PRIORITY:**
   - Source dropdown restriction (will break if not updated)
   - Date validation (mandatory fields)
   - Locking logic (user experience)

2. **MEDIUM PRIORITY:**
   - FuelType field
   - Remarks enhancements
   - Error handling

3. **LOW PRIORITY:**
   - UI indicators (can be added incrementally)
   - Read-only vehicle fields (if not using quotation import)

---

**Last Updated:** December 3, 2025

