# 🖥️ Dashboard Frontend Changes Needed

Based on the backend fixes, here are the changes you need to make in your React Dashboard.

---

## 📋 Summary of Backend Changes

The backend now has these database columns available:
- ✅ `enquiries.location` - Location field for enquiries
- ✅ `enquiries.next_follow_up_date` - Next follow-up date for enquiries  
- ✅ `bookings.next_follow_up_date` - Next follow-up date for bookings
- ✅ `bookings.chassis_number` - Chassis number for bookings
- ✅ `bookings.allocation_order_number` - Allocation order number for bookings

---

## 🔧 Required Dashboard Changes

### 1. Update Type Definitions (TypeScript)

If you're using TypeScript, update your type definitions to include these optional fields:

**File: `src/types/enquiry.ts`** (or wherever you define Enquiry types)

```typescript
export interface Enquiry {
  id: string;
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  model?: string;
  variant?: string;
  color?: string;
  source?: string;
  expectedBookingDate?: string;
  category: 'HOT' | 'LOST' | 'BOOKED';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  
  // ✅ NEW/OPTIONAL FIELDS - Add these
  location?: string | null;
  nextFollowUpDate?: string | null;
  dealerCode?: string | null;
  caRemarks?: string | null;
  
  assignedTo?: {
    firebaseUid: string;
    name: string;
    email: string;
  };
  createdBy?: {
    firebaseUid: string;
    name: string;
    email: string;
  };
  _count?: {
    bookings: number;
    quotations: number;
  };
}
```

**File: `src/types/booking.ts`** (or wherever you define Booking types)

```typescript
export interface Booking {
  id: string;
  customerName: string;
  customerPhone?: string;
  variant?: string;
  expectedDeliveryDate?: string;
  advisorId?: string;
  stockAvailability?: 'VNA' | 'VEHICLE_AVAILABLE';
  
  // ✅ NEW/OPTIONAL FIELDS - Add these
  chassisNumber?: string | null;
  allocationOrderNumber?: string | null;
  nextFollowUpDate?: string | null;
}
```

---

### 2. Update API Response Handlers

Make sure your API response handlers handle these fields gracefully (they may be `null` or `undefined`):

**File: `src/api/enquiries.ts`** (or similar)

```typescript
// Example: When fetching enquiries, handle optional fields
export const getEnquiries = async (params: {
  limit?: number;
  page?: number;
  status?: string;
  category?: string;
}): Promise<{
  enquiries: Enquiry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await apiClient.get('/enquiries', { params });
  
  // ✅ Handle optional fields safely
  const enquiries = response.data.data.enquiries.map((enquiry: any) => ({
    ...enquiry,
    location: enquiry.location || null,
    nextFollowUpDate: enquiry.nextFollowUpDate || null,
    dealerCode: enquiry.dealerCode || null,
  }));
  
  return {
    enquiries,
    pagination: response.data.data.pagination,
  };
};
```

**File: `src/api/dashboard.ts`** (or similar)

```typescript
// Example: When fetching booking plan, handle optional fields
export const getTodayBookingPlan = async (): Promise<{
  enquiries: Enquiry[];
  bookings: Booking[];
  enquiriesDueToday: number;
  bookingsDueToday: number;
}> => {
  const response = await apiClient.get('/dashboard/booking-plan/today');
  
  const bookings = response.data.data.bookings.map((booking: any) => ({
    ...booking,
    chassisNumber: booking.chassisNumber || null,
    allocationOrderNumber: booking.allocationOrderNumber || null,
    nextFollowUpDate: booking.nextFollowUpDate || null,
  }));
  
  return {
    enquiries: response.data.data.enquiries,
    bookings,
    enquiriesDueToday: response.data.data.enquiriesDueToday,
    bookingsDueToday: response.data.data.bookingsDueToday,
  };
};
```

---

### 3. Update UI Components to Display New Fields

#### 3.1 Enquiries List/Table

**File: `src/components/EnquiriesTable.tsx`** (or similar)

```typescript
// Add location column if you want to display it
const EnquiriesTable = ({ enquiries }: { enquiries: Enquiry[] }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Customer Name</TableCell>
          <TableCell>Contact</TableCell>
          <TableCell>Model</TableCell>
          <TableCell>Variant</TableCell>
          {/* ✅ Add location column if needed */}
          {enquiries.some(e => e.location) && (
            <TableCell>Location</TableCell>
          )}
          <TableCell>Status</TableCell>
          <TableCell>Category</TableCell>
          {/* ✅ Add next follow-up date if needed */}
          {enquiries.some(e => e.nextFollowUpDate) && (
            <TableCell>Next Follow-up</TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {enquiries.map((enquiry) => (
          <TableRow key={enquiry.id}>
            <TableCell>{enquiry.customerName}</TableCell>
            <TableCell>{enquiry.customerContact}</TableCell>
            <TableCell>{enquiry.model || '-'}</TableCell>
            <TableCell>{enquiry.variant || '-'}</TableCell>
            {/* ✅ Display location safely */}
            {enquiries.some(e => e.location) && (
              <TableCell>{enquiry.location || '-'}</TableCell>
            )}
            <TableCell>{enquiry.status}</TableCell>
            <TableCell>{enquiry.category}</TableCell>
            {/* ✅ Display next follow-up date safely */}
            {enquiries.some(e => e.nextFollowUpDate) && (
              <TableCell>
                {enquiry.nextFollowUpDate
                  ? new Date(enquiry.nextFollowUpDate).toLocaleDateString()
                  : '-'}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

#### 3.2 Booking Plan Component

**File: `src/components/BookingPlan.tsx`** (or similar)

```typescript
const BookingPlan = ({ bookings }: { bookings: Booking[] }) => {
  return (
    <div>
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardContent>
            <Typography variant="h6">{booking.customerName}</Typography>
            <Typography>Variant: {booking.variant || '-'}</Typography>
            <Typography>
              Delivery Date: {booking.expectedDeliveryDate
                ? new Date(booking.expectedDeliveryDate).toLocaleDateString()
                : '-'}
            </Typography>
            
            {/* ✅ Display chassis number if available */}
            {booking.chassisNumber && (
              <Typography>Chassis: {booking.chassisNumber}</Typography>
            )}
            
            {/* ✅ Display allocation order number if chassis not available */}
            {booking.stockAvailability === 'VNA' && booking.allocationOrderNumber && (
              <Typography>Order: {booking.allocationOrderNumber}</Typography>
            )}
            
            {/* ✅ Display next follow-up date if available */}
            {booking.nextFollowUpDate && (
              <Typography>
                Next Follow-up: {new Date(booking.nextFollowUpDate).toLocaleDateString()}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

---

### 4. Update Form Components (Optional)

If you have forms for creating/editing enquiries or bookings, you can now add fields for:

#### 4.1 Create Enquiry Form

**File: `src/components/CreateEnquiryForm.tsx`** (or similar)

```typescript
// Add location and nextFollowUpDate fields if you want users to input them
const CreateEnquiryForm = () => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerContact: '',
    // ... other fields
    location: '', // ✅ Add location field
    nextFollowUpDate: '', // ✅ Add next follow-up date field
  });

  return (
    <form>
      {/* Existing fields... */}
      
      {/* ✅ Add location field (optional) */}
      <TextField
        label="Location"
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        fullWidth
        margin="normal"
      />
      
      {/* ✅ Add next follow-up date field (optional) */}
      <TextField
        label="Next Follow-up Date"
        type="date"
        value={formData.nextFollowUpDate}
        onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
        InputLabelProps={{ shrink: true }}
        fullWidth
        margin="normal"
      />
    </form>
  );
};
```

---

### 5. Handle Null/Undefined Values Safely

**Important**: Always handle these fields as optional since they may be `null` or `undefined`:

```typescript
// ✅ GOOD: Safe handling
const location = enquiry.location || 'Not specified';
const chassisNumber = booking.chassisNumber ?? 'N/A';

// ✅ GOOD: Conditional rendering
{enquiry.location && <span>{enquiry.location}</span>}

// ❌ BAD: Will crash if null/undefined
const location = enquiry.location.toUpperCase(); // Don't do this!
```

---

### 6. Update Error Handling

If you have error handling for the API calls that were failing, you can now remove workarounds:

**File: `src/api/client.ts`** (or similar)

```typescript
// If you had error handling that was catching 400 errors for these endpoints,
// you can now remove special cases since the backend should work correctly

// Before (if you had this):
if (error.response?.status === 400 && error.response?.config?.url?.includes('/enquiries')) {
  // Special handling for missing columns...
}

// After: Normal error handling should work
```

---

### 7. Test the Changes

After making these changes:

1. **Test Enquiries List**: Verify that enquiries load without errors
2. **Test Booking Plan**: Verify that booking plan loads and displays correctly
3. **Test Pending Summary**: Verify that pending remarks summary loads
4. **Test Forms**: If you added form fields, test creating/updating enquiries

---

## 📝 Quick Checklist

- [ ] Update TypeScript types to include optional fields (`location`, `nextFollowUpDate`, `chassisNumber`, `allocationOrderNumber`)
- [ ] Update API response handlers to handle optional fields safely
- [ ] Update UI components to display new fields (if needed)
- [ ] Add null/undefined checks where these fields are used
- [ ] Test all affected endpoints
- [ ] Update form components if you want users to input these fields

---

## 🎯 Key Points

1. **All new fields are optional** - They may be `null` or `undefined`, so always handle them safely
2. **No breaking changes** - Existing code should continue to work; you're just adding support for new fields
3. **Progressive enhancement** - Only display/use these fields if they're available
4. **Backend is fixed** - The 400 errors should be resolved, so API calls should work normally now

---

## 🚀 Next Steps

1. Update your types (if using TypeScript)
2. Test the API endpoints in your browser/Postman to see the response format
3. Update UI components gradually to use new fields
4. Test thoroughly before deploying

---

## 📚 Reference

- See `API_ENDPOINT_DOCUMENTATION.md` for complete API documentation
- See `DASHBOARD_COMPLETE_CONFIG.md` for full dashboard setup guide
- See `docs/frontend-api-guide.md` for frontend integration examples

---

**Note**: If you encounter any issues after making these changes, check:
1. Browser console for errors
2. Network tab for API response format
3. Backend logs for any errors

The backend should now return these fields in the API responses, so your dashboard should work correctly once you handle them properly!

