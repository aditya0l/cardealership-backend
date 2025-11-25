# 📊 CSV Format Comparison: Stock File vs Booking Import File

## ❌ Your Current File (Stock/Inventory File)

**File:** `Himawari +shin - Himawari +shin.csv (1).csv`

**Columns:**
```
Active VC, ZAWL Stock, RAS Stock, Regional stock, Plant stock, PPL, FUEL, Trim, Color, 
AMT/ MT, EX-SHOWROOM, Consumer Discount, Green Bonus, Existing TATA ICE user, 
Existing TATA EV user, Intervention, Exchange/Scrappage, Unknown w, Unknown x, 
Unknown y, Unknown z, Top 20 Corporate/Alliance, TOI/Rural govt/Top 10, 
Aditional discount, Final Billing Price, INSURANCE 75%, By Dealer, Self, 
Normal RTO, TRC, BH, TCS @ 1%, Fastag, On Road Price
```

**Problem:**
- ❌ This is a **STOCK/INVENTORY** file, NOT a booking file
- ❌ Missing **REQUIRED** columns: `dealer_code`, `customer_name`
- ❌ Contains stock/pricing data, not customer booking data
- ❌ All 27 rows failed validation

---

## ✅ Required Booking Import Format

**Required Columns (MUST HAVE):**
1. `dealer_code` - Dealer code (e.g., "TATA001")
2. `customer_name` - Customer's full name (e.g., "John Doe")

**Optional Columns (Can include):**
- `customer_phone` - Customer phone number
- `customer_email` - Customer email
- `variant` - Vehicle variant (e.g., "Tata Harrier EV Adventure")
- `color` - Vehicle color (e.g., "Blue")
- `zone` - Zone (e.g., "NORTH")
- `region` - Region (e.g., "Delhi")
- `booking_date` - Booking date (YYYY-MM-DD)
- `expected_delivery_date` - Expected delivery date (YYYY-MM-DD)
- `advisor_id` - Advisor Firebase UID
- `finance_required` - true/false
- `financer_name` - Financer name
- `stock_availability` - "VEHICLE_AVAILABLE" or "VNA"
- `chassis_number` - Chassis number (required if stock_availability = VEHICLE_AVAILABLE)
- `allocation_order_number` - Order number (required if stock_availability = VNA)
- `fuel_type` - Fuel type (e.g., "Electric", "Diesel")
- `transmission` - Transmission (e.g., "Automatic", "MT", "DCA")

---

## 📋 Example Correct Booking Import CSV

```csv
customer_name,customer_phone,customer_email,dealer_code,variant,color,zone,region,booking_date,expected_delivery_date,advisor_id,finance_required,financer_name,stock_availability,chassis_number,allocation_order_number,fuel_type,transmission
Rajesh Kumar,+919876543210,rajesh.kumar@example.com,TATA001,Tata Harrier EV Adventure,Blue,NORTH,Delhi,2025-10-09,2025-10-25,bPqDAnO0o6WGNR4WR19l7TLEz2d2,true,HDFC Bank,VEHICLE_AVAILABLE,CH123456789,,Electric,Automatic
Priya Sharma,+919876543211,priya.sharma@example.com,TATA001,Tata Nexon EV Max,Red,SOUTH,Bangalore,2025-10-09,2025-10-30,bPqDAnO0o6WGNR4WR19l7TLEz2d2,false,,VNA,,ORD123456,Electric,Automatic
```

---

## 🔧 What You Need to Do

### Option 1: Get the Correct Booking File
You need a CSV file with **customer booking data**, not stock data. The file should contain:
- Customer names
- Dealer codes
- Booking dates
- Customer contact information

### Option 2: Transform Your Stock File (If It Contains Booking Data)
If your stock file somehow contains booking information, you would need to:
1. Extract customer information (if present)
2. Add `dealer_code` column
3. Add `customer_name` column
4. Map stock data to booking format
5. Add required fields

**However, your current file appears to be pure stock/inventory data with no customer information.**

### Option 3: Use the Template
Use `fixtures/bulk_import_test.csv` as a template and fill in your actual booking data.

---

## 📊 Current Import Status

**Your Last Import:**
- Status: COMPLETED
- Successful: **0 rows** ❌
- Failed: **27 rows** ❌
- Errors: Missing `dealer_code`, `customer_name`, `chassis_number`, `allocation_order_number`

---

## ✅ Solution

**You need a different file with booking data, not stock data.**

The booking import system expects:
1. **Customer information** (name, phone, email)
2. **Dealer information** (dealer_code)
3. **Booking details** (dates, status)
4. **Vehicle information** (variant, color)
5. **Stock information** (availability, chassis/order number)

Your current file only has stock/pricing data, which cannot be converted to bookings without customer information.

---

**Date:** November 22, 2025
**Issue:** Stock file uploaded instead of booking file
**Solution:** Need booking file with customer and dealer information

