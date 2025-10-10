# Auto-Booking Conversion Feature - Complete Guide

## 🎯 Overview

When an enquiry is marked as **BOOKED**, the system automatically:
1. ✅ Creates a booking record
2. ✅ Links the booking to the enquiry
3. ✅ Closes the enquiry (status = CLOSED)
4. ✅ Assigns booking to the enquiry creator
5. ✅ Populates booking with enquiry data

---

## 🔄 Automatic Conversion Workflow

### **Step-by-Step Process:**

```
1. Advisor creates enquiry
   → category: HOT (default)
   → status: OPEN
   
2. Advisor follows up with customer
   → category: Still HOT
   → status: IN_PROGRESS
   
3. Customer confirms booking
   → Advisor marks enquiry as BOOKED
   
4. 🎯 AUTOMATIC ACTIONS:
   ✅ Booking created with enquiry data
   ✅ Enquiry status → CLOSED
   ✅ Booking linked to enquiry (enquiryId)
   ✅ Booking assigned to advisor
   ✅ Booking appears in "My Bookings"
```

---

## 📋 Schema Changes

### New Field Added to Enquiry:

```prisma
model Enquiry {
  // ... existing fields
  dealerCode  String?  @map("dealer_code")  // ✅ NEW FIELD
  // ... rest
}
```

**Purpose:** Store dealer information for automatic booking creation.

---

## 🌐 API Usage

### 1. Create Enquiry with Dealer Code

**Endpoint:** `POST /api/enquiries`

```json
{
  "customerName": "John Doe",
  "customerContact": "+1234567890",
  "customerEmail": "john@example.com",
  "model": "Tata Nexon EV",
  "variant": "Max",
  "color": "Blue",
  "source": "WEBSITE",
  "dealerCode": "TATA001",  // ✅ NEW FIELD (optional, defaults to DEFAULT001)
  "caRemarks": "Customer interested in electric vehicle"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiry created successfully",
  "data": {
    "enquiry": {
      "id": "cmg...",
      "category": "HOT",
      "status": "OPEN",
      "dealerCode": "TATA001",
      // ... other fields
    }
  }
}
```

---

### 2. Mark Enquiry as BOOKED (Auto-Creates Booking)

**Endpoint:** `PUT /api/enquiries/:id`

```json
{
  "category": "BOOKED",
  "caRemarks": "Customer confirmed. Payment received."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiry updated and booking created successfully",
  "data": {
    "enquiry": {
      "id": "cmg...",
      "category": "BOOKED",
      "status": "CLOSED",  // ✅ Auto-closed
      // ... other fields
    },
    "booking": {  // ✅ Auto-created booking
      "id": "cmg...",
      "customerName": "John Doe",
      "customerPhone": "+1234567890",
      "customerEmail": "john@example.com",
      "variant": "Max",
      "color": "Blue",
      "dealerCode": "TATA001",
      "advisorId": "kryT...",  // Same as enquiry creator
      "enquiryId": "cmg...",  // Linked to source enquiry
      "status": "PENDING",
      "source": "MOBILE",
      "bookingDate": "2025-10-08T20:01:10.567Z",
      "remarks": "Auto-created from enquiry: cmg... Customer confirmed. Payment received."
    }
  }
}
```

---

## 📊 Data Mapping (Enquiry → Booking)

| Enquiry Field | → | Booking Field | Notes |
|---------------|---|---------------|-------|
| `customerName` | → | `customerName` | Direct copy |
| `customerContact` | → | `customerPhone` | Renamed |
| `customerEmail` | → | `customerEmail` | Direct copy |
| `variant` | → | `variant` | Direct copy |
| `color` | → | `color` | Direct copy |
| `dealerCode` | → | `dealerCode` | Direct copy |
| `createdByUserId` | → | `advisorId` | Enquiry creator becomes advisor |
| `id` | → | `enquiryId` | Link to source enquiry |
| `expectedBookingDate` | → | `expectedDeliveryDate` | Renamed |
| `caRemarks` | → | `remarks` | Appended to auto-message |
| - | → | `source` | Set to 'MOBILE' |
| - | → | `status` | Set to 'PENDING' |
| - | → | `bookingDate` | Set to current timestamp |

---

## ✅ Business Rules

### 1. **One Booking Per Enquiry**
- If a booking already exists for an enquiry, no new booking is created
- Prevents duplicate bookings from the same enquiry

### 2. **Enquiry Auto-Closure**
- When booking is created, enquiry status automatically changes to `CLOSED`
- BOOKED enquiries should not be actively worked on (converted already)

### 3. **Default Dealer Code**
- If enquiry doesn't have `dealerCode`, uses `DEFAULT001`
- Best practice: Always provide dealerCode when creating enquiry

### 4. **Advisor Assignment**
- Booking is automatically assigned to the enquiry creator
- Ensures continuity - same advisor manages enquiry and booking

---

## 🧪 Test Results

### Test Case: Auto-Create Booking from Enquiry

**Step 1: Create Enquiry**
```bash
POST /api/enquiries
{
  "customerName": "Auto Booking Test",
  "customerContact": "+9999999999",
  "customerEmail": "autotest@example.com",
  "model": "Tata Nexon EV",
  "variant": "Max",
  "color": "Blue",
  "dealerCode": "TATA001"
}
```
**Result:** ✅ Enquiry created with category=HOT, status=OPEN

**Step 2: Mark as BOOKED**
```bash
PUT /api/enquiries/cmg...
{
  "category": "BOOKED",
  "caRemarks": "Customer confirmed booking. Payment done."
}
```

**Result:** ✅ 
- Enquiry: category=BOOKED, status=CLOSED
- Booking: Auto-created with enquiry data
- Booking: enquiryId links back to enquiry
- Booking: advisorId = enquiry creator
- Booking: Appears in advisor's "My Bookings"

**Database Verification:**
```sql
-- Enquiry:
id: cmgieyr5500061308nwvkudde
customer_name: Auto Booking Test
status: CLOSED
category: BOOKED
dealer_code: TATA001

-- Booking:
id: cmgiez3c800081308ca0ae4qx
customer_name: Auto Booking Test
status: PENDING
enquiry_id: cmgieyr5500061308nwvkudde
dealer_code: TATA001
advisor_id: kryTfSsgR7MRqZW5qYMGE9liI9s1
```

✅ **All tests passed!**

---

## 📱 Expo App Integration

### Updated enquiryService.ts:

```typescript
// Update enquiry to BOOKED (auto-creates booking)
async markAsBooked(enquiryId: string, remarks: string) {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch(`${API_URL}/enquiries/${enquiryId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      category: 'BOOKED',
      caRemarks: remarks
    })
  });
  
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  
  // Returns both enquiry and auto-created booking
  return {
    enquiry: data.data.enquiry,
    booking: data.data.booking  // ✅ Auto-created booking
  };
}
```

### UI Component - Mark as Booked:

```typescript
const EnquiryDetailsScreen = ({ route, navigation }) => {
  const { enquiry } = route.params;
  const [remarksText, setRemarksText] = useState('');

  const handleMarkAsBooked = async () => {
    Alert.alert(
      '🎉 Convert to Booking?',
      'This will:\n• Create a booking record\n• Close this enquiry\n• Move to your Bookings tab\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Create Booking',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Mark as BOOKED - backend auto-creates booking
              const result = await enquiryService.markAsBooked(
                enquiry.id,
                remarksText || 'Customer confirmed booking.'
              );
              
              Alert.alert(
                '✅ Success!',
                'Booking created successfully! Check your Bookings tab.',
                [
                  {
                    text: 'View Booking',
                    onPress: () => navigation.navigate('BookingDetails', {
                      bookingId: result.booking.id
                    })
                  },
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView>
      {/* ... enquiry details ... */}
      
      {/* Show "Mark as Booked" button only for HOT or LOST enquiries */}
      {(enquiry.category === 'HOT' || enquiry.category === 'LOST') && (
        <View style={styles.actionSection}>
          <TextInput
            placeholder="Add final remarks before booking..."
            value={remarksText}
            onChangeText={setRemarksText}
            multiline
            style={styles.remarksInput}
          />
          <Button
            title="✅ Mark as Booked & Create Booking"
            onPress={handleMarkAsBooked}
            disabled={loading}
            color="#2ECC71"
          />
        </View>
      )}

      {/* Show booking link if already booked */}
      {enquiry.category === 'BOOKED' && (
        <View style={styles.bookedBanner}>
          <Text style={styles.bookedText}>
            ✅ This enquiry has been converted to a booking
          </Text>
          <Button
            title="View Booking"
            onPress={() => {
              // Fetch booking by enquiryId and navigate
              navigation.navigate('Bookings');
            }}
          />
        </View>
      )}
    </ScrollView>
  );
};
```

---

## 🎨 UI Flow

### Before (Without Auto-Conversion):
```
Enquiries Tab → Mark as BOOKED → Enquiry shows "BOOKED" badge
❌ Advisor must manually go to Bookings and create booking
❌ No link between enquiry and booking
```

### After (With Auto-Conversion):
```
Enquiries Tab → Mark as BOOKED → 
  ✅ Booking auto-created
  ✅ Popup: "Booking created! View now?"
  ✅ Navigate to booking details OR
  ✅ Navigate to Bookings tab
  ✅ Enquiry shows "BOOKED & CLOSED"
```

---

## ⚠️ Important Notes

### 1. Dealer Code Handling
- **Recommended**: Always provide `dealerCode` when creating enquiry
- **Fallback**: If not provided, uses `DEFAULT001`
- **Update**: Can update dealerCode before marking as BOOKED

### 2. Duplicate Prevention
- System checks if booking already exists for enquiry
- If exists, no new booking is created
- Safe to call multiple times

### 3. Enquiry Closure
- BOOKED enquiries are automatically CLOSED
- Should not appear in active enquiry lists
- Can still be viewed in BOOKED category filter

### 4. Booking Status
- New bookings start as `PENDING`
- Advisor can then update status (IN_PROGRESS, CONFIRMED, etc.)

---

## 📊 Database Relationships

```sql
-- Enquiry → Booking relationship
SELECT 
  e.id as enquiry_id,
  e.customer_name,
  e.category::text,
  e.status::text as enquiry_status,
  b.id as booking_id,
  b.status::text as booking_status,
  b.advisor_id
FROM enquiries e
LEFT JOIN bookings b ON b.enquiry_id = e.id
WHERE e.category = 'BOOKED';
```

**Result:**
```
       enquiry_id        |   customer_name   | category | enquiry_status |        booking_id         | booking_status |       advisor_id        
-------------------------+-------------------+----------+----------------+---------------------------+----------------+-------------------------
 cmgieyr5500061308...    | Auto Booking Test | BOOKED   | CLOSED         | cmgiez3c800081308...      | PENDING        | kryTfSsgR7MRqZW5...
```

---

## 🔧 Implementation Details

### Auto-Booking Creation Logic (Backend):

```typescript
// In src/controllers/enquiries.controller.ts - updateEnquiry function

if (category === EnquiryCategory.BOOKED) {
  // Check if booking already exists
  const existingBooking = await prisma.booking.findFirst({
    where: { enquiryId: id }
  });

  if (!existingBooking) {
    // Create booking from enquiry data
    booking = await prisma.booking.create({
      data: {
        customerName: enquiry.customerName,
        customerPhone: enquiry.customerContact,
        customerEmail: enquiry.customerEmail,
        variant: enquiry.variant,
        color: enquiry.color,
        dealerCode: enquiry.dealerCode || 'DEFAULT001',
        advisorId: enquiry.createdByUserId,
        enquiryId: enquiry.id,
        source: 'MOBILE',
        status: 'PENDING',
        bookingDate: new Date(),
        expectedDeliveryDate: enquiry.expectedBookingDate,
        remarks: `Auto-created from enquiry: ${enquiry.id}. ${enquiry.caRemarks}`
      }
    });

    // Close the enquiry
    await prisma.enquiry.update({
      where: { id },
      data: { status: EnquiryStatus.CLOSED }
    });
  }
}
```

---

## ✨ Benefits

### 1. **Seamless Workflow**
- No need to manually create booking
- Automatic data transfer
- Reduced data entry errors

### 2. **Better Tracking**
- Clear link between enquiry and booking
- Full audit trail from enquiry to delivery
- Easy to trace conversion history

### 3. **Time Saving**
- One action (mark as BOOKED) instead of two
- No manual data copying
- Faster conversion process

### 4. **Data Integrity**
- Booking always linked to source enquiry
- No orphan bookings
- Consistent data across modules

---

## 🧪 Complete Test Scenario

### Test: End-to-End Enquiry to Booking Conversion

```bash
# 1. Create enquiry
curl -X POST http://localhost:4000/api/enquiries \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test Customer",
    "customerContact": "+1234567890",
    "customerEmail": "test@example.com",
    "model": "Tata Nexon",
    "variant": "XZ Plus",
    "dealerCode": "TATA001",
    "source": "WEBSITE"
  }'

# Result: Enquiry created with category=HOT

# 2. Mark as BOOKED
curl -X PUT http://localhost:4000/api/enquiries/ENQUIRY_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "BOOKED",
    "caRemarks": "Customer paid advance"
  }'

# Result: 
# - Enquiry: status=CLOSED, category=BOOKED
# - Booking: Auto-created and linked
# - Response includes both enquiry and booking objects

# 3. Verify in My Bookings
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4000/api/bookings/advisor/my-bookings"

# Result: New booking appears in list
```

---

## 📝 Files Modified

1. ✅ `prisma/schema.prisma` - Added dealerCode to Enquiry model
2. ✅ `src/controllers/enquiries.controller.ts` - Implemented auto-booking creation
3. ✅ Database schema updated via `npx prisma db push`

---

## 🎯 Summary

The auto-booking conversion feature provides:

1. ✅ **Automatic workflow** - Mark as BOOKED → Booking created
2. ✅ **Data linking** - Enquiry and Booking connected via enquiryId
3. ✅ **Enquiry closure** - BOOKED enquiries auto-closed
4. ✅ **Advisor assignment** - Creator becomes booking advisor
5. ✅ **Duplicate prevention** - Won't create multiple bookings
6. ✅ **Complete data transfer** - All enquiry data copied to booking
7. ✅ **Audit trail** - Full history preserved

**Implementation Date**: October 8, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete & Tested

