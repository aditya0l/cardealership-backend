# Stock Validation for Enquiry-to-Booking Conversion - Complete Guide

## 🎯 Overview

The system now performs **automatic stock validation** before converting enquiries to bookings. This prevents booking vehicles that are out of stock and ensures better inventory management.

---

## ✅ Stock Validation Rules

### **When Converting Enquiry to Booking:**

1. **Stock Check Performed:**
   - System checks if the enquired vehicle variant is in stock
   - Checks across all stock locations (ZAWL, RAS, Regional, Plant)
   - Only allows conversion if vehicle is available

2. **Validation Criteria:**
   ```sql
   Vehicle must match:
   - variant = enquiry.variant
   - isActive = true
   - AND (zawlStock = true OR rasStock = true OR regionalStock = true OR plantStock = true)
   ```

3. **If Stock Available:**
   - ✅ Booking created successfully
   - ✅ stockAvailability set to 'VEHICLE_AVAILABLE'
   - ✅ backOrderStatus set to false
   - ✅ Response includes stock validation details

4. **If Stock NOT Available:**
   - ❌ Booking NOT created
   - ❌ Error returned with clear message
   - ❌ Enquiry remains in current status
   - ❌ Advisor must check stock or mark as back-order

---

## 📋 Stock Locations

The system checks stock in 4 locations:

| Location | Field | Description |
|----------|-------|-------------|
| **ZAWL** | `zawlStock` | Zaveri & Associates Warehouse Ltd |
| **RAS** | `rasStock` | Retail & Autoparts Showroom |
| **Regional** | `regionalStock` | Regional warehouse |
| **Plant** | `plantStock` | Manufacturing plant stock |

**Vehicle is considered "in stock" if available in ANY of these locations.**

---

## 🌐 API Behavior

### Success Case: Vehicle In Stock

**Request:**
```bash
PUT /api/enquiries/:id
{
  "category": "BOOKED",
  "caRemarks": "Customer confirmed booking"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiry updated and booking created successfully. Stock validated.",
  "data": {
    "enquiry": {
      "id": "cmg...",
      "category": "BOOKED",
      "status": "CLOSED",
      "variant": "Tata Harrier EV Adventure"
    },
    "booking": {
      "id": "cmg...",
      "variant": "Tata Harrier EV Adventure",
      "stockAvailability": "VEHICLE_AVAILABLE",
      "backOrderStatus": false,
      "remarks": "Auto-created from enquiry... Stock validated: Vehicle available in inventory."
    },
    "stockValidation": {
      "variant": "Tata Harrier EV Adventure",
      "available": true,
      "stockLocations": {
        "zawl": true,
        "ras": null,
        "regional": true,
        "plant": null
      }
    }
  }
}
```

---

### Error Case: Vehicle Out of Stock

**Request:**
```bash
PUT /api/enquiries/:id
{
  "category": "BOOKED"
}
```

**Response (400 Error):**
```json
{
  "success": false,
  "message": "Vehicle variant \"BMW X5 M Sport\" is not in stock. Cannot convert to booking. Please check stock availability or create with back-order status."
}
```

**What Happens:**
- ❌ No booking created
- ❌ Enquiry stays in current category/status
- ❌ Advisor is notified of stock issue

---

## 🔄 Complete Workflow

### Scenario 1: In-Stock Vehicle

```
1. Create Enquiry
   → variant: "Tata Harrier EV Adventure"
   → category: HOT
   
2. Mark as BOOKED
   → Stock Check: ✅ Available (ZAWL + Regional stock)
   → Booking Created: ✅ Success
   → stockAvailability: VEHICLE_AVAILABLE
   → backOrderStatus: false
   → Enquiry Status: CLOSED
```

### Scenario 2: Out-of-Stock Vehicle

```
1. Create Enquiry
   → variant: "BMW X5 M Sport"
   → category: HOT
   
2. Mark as BOOKED
   → Stock Check: ❌ Not Available
   → Error: "Vehicle variant not in stock"
   → Booking: NOT created
   → Enquiry: Remains OPEN/HOT
   
3. Advisor Options:
   a) Wait for stock and try again later
   b) Change variant to available model
   c) Contact manager for back-order approval
```

---

## 🧪 Test Results

### Test 1: ❌ Out-of-Stock Vehicle
```bash
Enquiry: variant="BMW X5 M Sport"
Action: Mark as BOOKED
Result: ERROR - "Vehicle variant not in stock"
Status: Enquiry NOT converted, remains HOT
```

### Test 2: ✅ In-Stock Vehicle
```bash
Enquiry: variant="Tata Harrier EV Adventure"
Stock: ZAWL=true, Regional=true
Action: Mark as BOOKED
Result: SUCCESS
Created Booking:
  - stockAvailability: VEHICLE_AVAILABLE
  - backOrderStatus: false
  - remarks: "Stock validated: Vehicle available"
Stock Info Returned:
  {
    "variant": "Tata Harrier EV Adventure",
    "available": true,
    "stockLocations": {
      "zawl": true,
      "ras": null,
      "regional": true,
      "plant": null
    }
  }
```

---

## 📊 Database Queries

### Check Stock Availability for a Variant:

```sql
SELECT 
  variant,
  color,
  zawl_stock,
  ras_stock,
  regional_stock,
  plant_stock,
  dealer_id
FROM vehicles
WHERE variant = 'Tata Harrier EV Adventure'
  AND is_active = true
  AND (
    zawl_stock = true OR 
    ras_stock = true OR 
    regional_stock = true OR 
    plant_stock = true
  );
```

### View All Available Variants:

```sql
SELECT 
  variant,
  COUNT(*) as stock_count,
  SUM(CASE WHEN zawl_stock THEN 1 ELSE 0 END) as zawl_count,
  SUM(CASE WHEN ras_stock THEN 1 ELSE 0 END) as ras_count,
  SUM(CASE WHEN regional_stock THEN 1 ELSE 0 END) as regional_count,
  SUM(CASE WHEN plant_stock THEN 1 ELSE 0 END) as plant_count
FROM vehicles
WHERE is_active = true
GROUP BY variant;
```

---

## 📱 Expo App Integration

### Updated enquiryService.ts:

```typescript
// Mark as BOOKED with stock validation
async markAsBooked(enquiryId: string, remarks: string) {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  try {
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
    
    if (!data.success) {
      // Check if it's a stock error
      if (data.message.includes('not in stock')) {
        throw new Error('STOCK_UNAVAILABLE: ' + data.message);
      }
      throw new Error(data.message);
    }
    
    return {
      enquiry: data.data.enquiry,
      booking: data.data.booking,
      stockValidation: data.data.stockValidation  // Stock info
    };
  } catch (error) {
    throw error;
  }
}
```

### UI Component with Stock Validation:

```typescript
const handleMarkAsBooked = async () => {
  try {
    setLoading(true);
    
    const result = await enquiryService.markAsBooked(
      enquiry.id,
      remarksText || 'Customer confirmed booking.'
    );
    
    // Show success with stock info
    Alert.alert(
      '✅ Booking Created!',
      `Stock Validated: ${result.stockValidation.variant}\n\n` +
      `Available in:\n` +
      `${result.stockValidation.stockLocations.zawl ? '✓ ZAWL Stock\n' : ''}` +
      `${result.stockValidation.stockLocations.regional ? '✓ Regional Stock\n' : ''}` +
      `${result.stockValidation.stockLocations.plant ? '✓ Plant Stock\n' : ''}` +
      `\nBooking ID: ${result.booking.id}`,
      [
        {
          text: 'View Booking',
          onPress: () => navigation.navigate('BookingDetails', {
            bookingId: result.booking.id
          })
        }
      ]
    );
  } catch (error) {
    if (error.message.startsWith('STOCK_UNAVAILABLE:')) {
      // Handle stock error specifically
      Alert.alert(
        '⚠️ Vehicle Not In Stock',
        error.message.replace('STOCK_UNAVAILABLE: ', ''),
        [
          { text: 'OK' },
          {
            text: 'Check Other Variants',
            onPress: () => navigation.navigate('StockAvailability')
          }
        ]
      );
    } else {
      Alert.alert('Error', error.message);
    }
  } finally {
    setLoading(false);
  }
};
```

---

## ⚠️ Important Notes

### 1. Stock Validation Only for Variants
- If enquiry doesn't have a `variant` specified, stock check is skipped
- Best practice: Always capture variant information in enquiry

### 2. Default Behavior if No Variant
- If no variant specified, booking is created WITHOUT stock validation
- Advisor can add variant to booking later
- Stock can be checked manually

### 3. Multiple Stock Locations
- Vehicle can be in one or more stock locations
- System accepts if available in ANY location
- Stock location details returned in response

### 4. Back-Order Alternative
- If vehicle not in stock, advisor can:
  - Contact manager for back-order approval
  - Manually create booking with `backOrderStatus: true`
  - Wait for stock and try again later

---

## 🔧 Implementation Details

### Stock Validation Logic:

```typescript
if (enquiry.variant) {
  const vehicleInStock = await prisma.vehicle.findFirst({
    where: {
      variant: enquiry.variant,
      isActive: true,
      OR: [
        { zawlStock: true },
        { rasStock: true },
        { regionalStock: true },
        { plantStock: true }
      ]
    }
  });

  if (!vehicleInStock) {
    throw createError(
      `Vehicle variant "${enquiry.variant}" is not in stock...`,
      400
    );
  }

  // Use stock info in booking creation
  stockInfo = vehicleInStock;
}
```

### Booking Creation with Stock Info:

```typescript
booking = await prisma.booking.create({
  data: {
    // ... customer & vehicle data
    stockAvailability: stockInfo ? 'VEHICLE_AVAILABLE' : undefined,
    backOrderStatus: false,  // Not a back order
    remarks: `... Stock validated: Vehicle available in inventory.`
  }
});
```

---

## 📊 Benefits

1. **Prevent Invalid Bookings** - No bookings for unavailable vehicles
2. **Better Inventory Management** - Real-time stock validation
3. **Clear Communication** - Advisor knows stock status immediately
4. **Audit Trail** - Stock validation logged in booking remarks
5. **Flexible Handling** - Can still process back-orders manually

---

## ✨ Summary

The stock validation feature provides:

- ✅ **Automatic stock checking** before booking creation
- ✅ **Multi-location validation** (ZAWL, RAS, Regional, Plant)
- ✅ **Clear error messages** when stock unavailable
- ✅ **Stock info in response** for transparency
- ✅ **Booking marked as VEHICLE_AVAILABLE** when created
- ✅ **Prevents invalid conversions** automatically

**Implementation Date**: October 8, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete & Tested

