# Enquiry Category Implementation - Complete Guide

## 🎯 Overview

The enquiry system now supports categorization into **3 categories**: HOT, LOST, and BOOKED. This allows advisors to track and manage enquiries based on their conversion likelihood and status.

---

## 📋 Category Definitions

| Category | Icon | Meaning | When to Use |
|----------|------|---------|-------------|
| **HOT** 🔥 | 🔥 | High priority, likely to convert | Customer very interested, ready to book soon |
| **LOST** ❌ | ❌ | Customer lost/not interested | Customer went to competitor or lost interest |
| **BOOKED** ✅ | ✅ | Successfully converted to booking | Enquiry resulted in a confirmed booking |

---

## 🗂️ Database Schema

### Enquiry Model - New Field

```prisma
model Enquiry {
  id                  String          @id @default(cuid())
  status              EnquiryStatus   @default(OPEN)
  category            EnquiryCategory @default(HOT)  // ✅ NEW FIELD
  // ... other fields
}
```

### EnquiryCategory Enum

```prisma
enum EnquiryCategory {
  HOT     // High priority, likely to convert
  LOST    // Customer lost/not interested
  BOOKED  // Converted to booking
}
```

### Default Value
- All new enquiries default to **HOT** category
- Advisors can change category as the enquiry progresses

---

## 🌐 API Usage

### 1. Create Enquiry with Category

**Endpoint**: `POST /api/enquiries`

**Request:**
```json
{
  "customerName": "John Doe",
  "customerContact": "+1234567890",
  "customerEmail": "john@example.com",
  "model": "Tata Nexon",
  "variant": "XZ Plus",
  "source": "WEBSITE",
  "category": "HOT"
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
      "customerName": "John Doe",
      // ... other fields
    }
  }
}
```

**Note:** If category is not provided, it defaults to `HOT`.

---

### 2. Update Enquiry Category

**Endpoint**: `PUT /api/enquiries/:id`

**Request:**
```json
{
  "category": "LOST",
  "caRemarks": "Customer went with competitor - lower price"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiry updated successfully",
  "data": {
    "enquiry": {
      "id": "cmg...",
      "category": "LOST",
      "caRemarks": "Customer went with competitor - lower price",
      "updatedAt": "2025-10-08T19:42:40.391Z"
    }
  }
}
```

---

### 3. Filter Enquiries by Category

**Endpoint**: `GET /api/enquiries?category=CATEGORY_VALUE`

#### Get All HOT Enquiries:
```bash
GET /api/enquiries?category=HOT&page=1&limit=100
```

#### Get All LOST Enquiries:
```bash
GET /api/enquiries?category=LOST&page=1&limit=100
```

#### Get All BOOKED Enquiries:
```bash
GET /api/enquiries?category=BOOKED&page=1&limit=100
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiries retrieved successfully",
  "data": {
    "enquiries": [
      {
        "id": "cmg...",
        "customerName": "Hot Lead Customer",
        "category": "HOT",
        "status": "OPEN"
        // ... other fields
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 4. Combine Filters (Category + Status)

```bash
GET /api/enquiries?category=HOT&status=IN_PROGRESS
```

This returns all HOT category enquiries that are IN_PROGRESS.

---

## ✅ Validation Rules

### Category Validation
- ✅ Must be one of: `HOT`, `LOST`, `BOOKED`
- ✅ Case-sensitive (must be UPPERCASE)
- ✅ Invalid values return 400 error

**Valid:**
```json
{ "category": "HOT" }
{ "category": "LOST" }
{ "category": "BOOKED" }
```

**Invalid:**
```json
{ "category": "hot" }      // ❌ Lowercase
{ "category": "WARM" }     // ❌ Not in enum
{ "category": "pending" }  // ❌ Wrong value
```

---

## 🔐 Permissions

### Customer Advisor
- ✅ Can CREATE enquiries with any category
- ✅ Can UPDATE category on their own enquiries
- ✅ Can VIEW only their own enquiries filtered by category
- ❌ Cannot update other advisors' enquiries

### Team Lead / Manager / Admin
- ✅ Can CREATE enquiries
- ✅ Can UPDATE any enquiry's category
- ✅ Can VIEW all enquiries filtered by category

---

## 🧪 Testing Examples

### Test 1: Create HOT Enquiry
```bash
curl -X POST http://localhost:4000/api/enquiries \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Hot Lead",
    "customerContact": "+1234567890",
    "customerEmail": "hot@example.com",
    "model": "Tata Harrier",
    "source": "WEBSITE",
    "category": "HOT"
  }'
```

### Test 2: Mark Enquiry as LOST
```bash
curl -X PUT http://localhost:4000/api/enquiries/ENQUIRY_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "LOST",
    "caRemarks": "Customer not interested anymore"
  }'
```

### Test 3: Mark Enquiry as BOOKED
```bash
curl -X PUT http://localhost:4000/api/enquiries/ENQUIRY_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "BOOKED",
    "status": "CLOSED",
    "caRemarks": "Booking completed successfully!"
  }'
```

### Test 4: Get HOT Enquiries Only
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/enquiries?category=HOT"
```

### Test 5: Get All Categories Count
```bash
# HOT
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/enquiries?category=HOT" | jq '.data.pagination.total'

# LOST  
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/enquiries?category=LOST" | jq '.data.pagination.total'

# BOOKED
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/enquiries?category=BOOKED" | jq '.data.pagination.total'
```

---

## 📱 Expo App Integration

### TypeScript Interface

```typescript
interface Enquiry {
  id: string;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  model?: string;
  variant?: string;
  color?: string;
  source: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  category: 'HOT' | 'LOST' | 'BOOKED';  // ✅ NEW FIELD
  caRemarks?: string;
  expectedBookingDate?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Create Enquiry with Category

```typescript
const createEnquiry = async (enquiryData: any) => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch(`${API_URL}/enquiries`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...enquiryData,
      category: 'HOT'  // Default to HOT
    })
  });
  
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  
  return data.data.enquiry;
};
```

### Update Enquiry Category

```typescript
const updateEnquiryCategory = async (
  enquiryId: string, 
  category: 'HOT' | 'LOST' | 'BOOKED',
  remarks?: string
) => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch(`${API_URL}/enquiries/${enquiryId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      category,
      ...(remarks && { caRemarks: remarks })
    })
  });
  
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  
  return data.data.enquiry;
};
```

### Fetch Enquiries by Category

```typescript
const fetchEnquiriesByCategory = async (category: string) => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch(
    `${API_URL}/enquiries?category=${category}&page=1&limit=100`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  
  return data.data.enquiries;
};
```

### Category Tabs UI Component

```typescript
const EnquiriesScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState('HOT');
  const [enquiries, setEnquiries] = useState([]);
  
  // Fetch enquiries by category
  useEffect(() => {
    fetchEnquiriesByCategory(selectedCategory)
      .then(setEnquiries)
      .catch(console.error);
  }, [selectedCategory]);
  
  // Get counts for each category
  const categoryCounts = {
    HOT: enquiries.filter(e => e.category === 'HOT').length,
    LOST: enquiries.filter(e => e.category === 'LOST').length,
    BOOKED: enquiries.filter(e => e.category === 'BOOKED').length
  };
  
  return (
    <View>
      {/* Category Tabs */}
      <View style={styles.categoryTabs}>
        <TouchableOpacity 
          onPress={() => setSelectedCategory('HOT')}
          style={[
            styles.tab,
            selectedCategory === 'HOT' && styles.activeTab
          ]}
        >
          <Text style={styles.tabIcon}>🔥</Text>
          <Text>HOT</Text>
          <Text style={styles.badge}>{categoryCounts.HOT}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setSelectedCategory('LOST')}
          style={[
            styles.tab,
            selectedCategory === 'LOST' && styles.activeTab
          ]}
        >
          <Text style={styles.tabIcon}>❌</Text>
          <Text>LOST</Text>
          <Text style={styles.badge}>{categoryCounts.LOST}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setSelectedCategory('BOOKED')}
          style={[
            styles.tab,
            selectedCategory === 'BOOKED' && styles.activeTab
          ]}
        >
          <Text style={styles.tabIcon}>✅</Text>
          <Text>BOOKED</Text>
          <Text style={styles.badge}>{categoryCounts.BOOKED}</Text>
        </TouchableOpacity>
      </View>

      {/* Enquiries List */}
      <FlatList
        data={enquiries}
        renderItem={({ item }) => <EnquiryCard enquiry={item} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};
```

### Category Picker Component

```typescript
const CategoryPicker = ({ 
  currentCategory, 
  onCategoryChange 
}: { 
  currentCategory: string;
  onCategoryChange: (category: string) => void;
}) => {
  const categories = [
    { value: 'HOT', label: '🔥 Hot Lead', color: '#FF6B6B' },
    { value: 'LOST', label: '❌ Lost', color: '#95A5A6' },
    { value: 'BOOKED', label: '✅ Booked', color: '#2ECC71' }
  ];
  
  return (
    <View style={styles.pickerContainer}>
      {categories.map(cat => (
        <TouchableOpacity
          key={cat.value}
          onPress={() => onCategoryChange(cat.value)}
          style={[
            styles.categoryButton,
            { 
              backgroundColor: currentCategory === cat.value 
                ? cat.color 
                : '#f0f0f0'
            }
          ]}
        >
          <Text style={styles.categoryLabel}>{cat.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

---

## 📊 Database Queries

### Get Category Counts

```sql
SELECT 
  category::text,
  COUNT(*) as count
FROM enquiries
WHERE "createdByUserId" = 'YOUR_USER_ID'
GROUP BY category
ORDER BY category;
```

**Result:**
```
 category | count 
----------+-------
 BOOKED   |     1
 HOT      |     0
 LOST     |     1
```

### Get HOT Enquiries

```sql
SELECT 
  customer_name,
  category::text,
  status::text,
  source::text,
  "createdAt"
FROM enquiries
WHERE category = 'HOT'
ORDER BY "createdAt" DESC;
```

### Find All BOOKED Enquiries

```sql
SELECT 
  customer_name,
  category::text,
  model,
  ca_remarks
FROM enquiries
WHERE category = 'BOOKED';
```

---

## 🔄 Category Workflow

### Typical Enquiry Lifecycle:

```
1. NEW ENQUIRY CREATED
   ↓
   category: HOT (default)
   status: OPEN
   
2. ADVISOR FOLLOWS UP
   ↓
   Options:
   - Keep as HOT if progressing well
   - Mark as LOST if customer not interested
   - Mark as BOOKED when booking confirmed
   
3. FINAL STATE
   ↓
   Either: LOST or BOOKED
```

### Example Scenario 1: Successful Conversion
```
Day 1: Create enquiry → category: HOT, status: OPEN
Day 2: Follow up → category: HOT, status: IN_PROGRESS  
Day 5: Booking confirmed → category: BOOKED, status: CLOSED
```

### Example Scenario 2: Lost Lead
```
Day 1: Create enquiry → category: HOT, status: OPEN
Day 3: Follow up, no response → category: HOT, status: IN_PROGRESS
Day 7: Customer bought elsewhere → category: LOST, status: CLOSED
```

---

## 🎨 UI Color Coding Suggestions

```typescript
const getCategoryColor = (category: string) => {
  switch(category) {
    case 'HOT':
      return {
        bg: '#FFE5E5',
        text: '#FF6B6B',
        icon: '🔥'
      };
    case 'LOST':
      return {
        bg: '#E8E8E8',
        text: '#95A5A6',
        icon: '❌'
      };
    case 'BOOKED':
      return {
        bg: '#E8F8F0',
        text: '#2ECC71',
        icon: '✅'
      };
    default:
      return {
        bg: '#F0F0F0',
        text: '#333',
        icon: '📋'
      };
  }
};
```

---

## 📈 Analytics & Reporting

### Get Category Statistics

You can query category distribution:

```sql
SELECT 
  category::text,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM enquiries
WHERE "createdByUserId" = 'YOUR_USER_ID'
GROUP BY category
ORDER BY total DESC;
```

**Example Output:**
```
 category | total | percentage 
----------+-------+------------
 HOT      |    45 |      75.00
 LOST     |    10 |      16.67
 BOOKED   |     5 |       8.33
```

---

## 🧪 Test Results

### ✅ All Tests Passed:

1. ✅ **Create with HOT category** - Success
   ```
   Category: HOT
   Customer: Hot Lead Customer
   ```

2. ✅ **Create with LOST category** - Success
   ```
   Category: LOST
   Customer: Lost Lead Customer
   ```

3. ✅ **Update category from HOT to BOOKED** - Success
   ```
   Updated Category: BOOKED
   Remarks: Customer completed booking!
   ```

4. ✅ **Filter by HOT category** - Success
   ```
   Total HOT enquiries: 1
   ```

5. ✅ **Filter by LOST category** - Success
   ```
   Total LOST enquiries: 1
   ```

6. ✅ **Filter by BOOKED category** - Success
   ```
   Total BOOKED enquiries: 1
   ```

---

## 🔧 Files Modified

1. ✅ `prisma/schema.prisma` - Added EnquiryCategory enum and category field
2. ✅ `src/controllers/enquiries.controller.ts` - Added category CRUD operations
3. ✅ `src/routes/enquiries.routes.ts` - Added CUSTOMER_ADVISOR to update permissions
4. ✅ Database updated via `npx prisma db push`

---

## 💡 Best Practices

### 1. Default to HOT
- All new enquiries start as HOT
- Advisor reviews and recategorizes as needed

### 2. Update Category with Remarks
- Always add remarks when changing category
- Especially important for LOST (explain why)

```json
{
  "category": "LOST",
  "caRemarks": "Customer found better price at competitor. Lost to XYZ Dealership."
}
```

### 3. Auto-Update to BOOKED
- When creating a booking from enquiry, update category to BOOKED
- This can be automated in the backend

### 4. Use for Filtering
- Show only HOT enquiries for daily follow-ups
- Review LOST enquiries for patterns
- Track BOOKED conversion rate

---

## 📊 Sample Data in Database

Current test data:
```
   customer_name    | category | status |   source   
--------------------+----------+--------+------------
 Lost Lead Customer | LOST     | OPEN   | PHONE_CALL
 Hot Lead Customer  | BOOKED   | OPEN   | WEBSITE
```

---

## ✨ Summary

The enquiry categorization system provides:

1. ✅ **3 Clear Categories** - HOT, LOST, BOOKED
2. ✅ **Full CRUD Support** - Create, read, update categories
3. ✅ **Filtering** - Filter enquiries by category
4. ✅ **Validation** - Proper enum validation
5. ✅ **RBAC Integration** - Role-based permissions
6. ✅ **Default Values** - Auto-defaults to HOT
7. ✅ **Backward Compatible** - Existing enquiries get HOT by default

**Implementation Date**: October 8, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete & Tested

