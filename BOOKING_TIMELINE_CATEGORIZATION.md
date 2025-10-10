# Booking Timeline Categorization

## Overview

The booking timeline categorization feature allows advisors to filter their bookings based on follow-up dates and delivery schedules. This helps advisors organize their daily tasks and prioritize bookings that need immediate attention.

## Implementation Date
October 8, 2025

## Feature Description

Bookings can be categorized into **4 dynamic timeline categories** based on date fields:

### 1. **Today** (📅)
**Purpose:** Bookings requiring action today

**Criteria:**
- File login date = today, OR
- Approval date = today, OR
- RTO date = today

**Use Case:** Daily task list for advisor to track all bookings with scheduled actions for the current day.

**API Endpoint:**
```
GET /api/bookings/advisor/my-bookings?timeline=today
```

---

### 2. **Delivery Today** (🚗)
**Purpose:** Vehicles to be delivered today

**Criteria:**
- Expected delivery date = today, AND
- Status is NOT `DELIVERED` or `CANCELLED`

**Use Case:** Track today's scheduled deliveries to ensure timely vehicle handover.

**API Endpoint:**
```
GET /api/bookings/advisor/my-bookings?timeline=delivery_today
```

---

### 3. **Pending Update** (⏰)
**Purpose:** Stale bookings needing status update

**Criteria:**
- Status is `PENDING` or `ASSIGNED`, AND
- Created more than 24 hours ago

**Use Case:** Identify bookings that haven't been progressed and need follow-up with customers.

**API Endpoint:**
```
GET /api/bookings/advisor/my-bookings?timeline=pending_update
```

---

### 4. **Overdue** (🔴)
**Purpose:** Late deliveries requiring escalation

**Criteria:**
- Expected delivery date < today (in the past), AND
- Status is NOT `DELIVERED` or `CANCELLED`

**Use Case:** Escalation list for delayed deliveries that need immediate attention.

**API Endpoint:**
```
GET /api/bookings/advisor/my-bookings?timeline=overdue
```

---

## API Usage

### Basic Request
```bash
GET /api/bookings/advisor/my-bookings?timeline={timeline_value}
```

### Parameters
| Parameter | Type | Required | Values | Description |
|-----------|------|----------|--------|-------------|
| `timeline` | string | No | `today`, `delivery_today`, `pending_update`, `overdue` | Filter bookings by timeline category |
| `page` | number | No | Default: 1 | Page number for pagination |
| `limit` | number | No | Default: 10 | Number of results per page |
| `status` | string | No | Any `BookingStatus` | Filter by booking status (can combine with timeline) |

### Response Format
```json
{
  "success": true,
  "message": "Bookings for timeline 'today' retrieved successfully",
  "data": {
    "bookings": [...],
    "timeline": "today",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### Error Response (Invalid Timeline)
```json
{
  "success": false,
  "message": "Invalid timeline filter. Valid values: today, delivery_today, pending_update, overdue"
}
```

---

## Code Implementation

### Controller Update
File: `src/controllers/bookings.controller.ts`

The `getAdvisorBookings` function was updated to include timeline filtering logic:

```typescript
// Timeline filtering logic
if (timeline) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch(timeline) {
    case 'today':
      where.OR = [
        { fileLoginDate: { gte: today, lt: tomorrow } },
        { approvalDate: { gte: today, lt: tomorrow } },
        { rtoDate: { gte: today, lt: tomorrow } }
      ];
      break;

    case 'delivery_today':
      where.expectedDeliveryDate = { gte: today, lt: tomorrow };
      where.status = { notIn: [BookingStatus.DELIVERED, BookingStatus.CANCELLED] };
      break;

    case 'pending_update':
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      where.status = { in: [BookingStatus.PENDING, BookingStatus.ASSIGNED] };
      where.createdAt = { lt: yesterday };
      break;

    case 'overdue':
      where.expectedDeliveryDate = { lt: today };
      where.status = { notIn: [BookingStatus.DELIVERED, BookingStatus.CANCELLED] };
      break;

    default:
      throw createError('Invalid timeline filter. Valid values: today, delivery_today, pending_update, overdue', 400);
  }
}
```

---

## Testing

### Test Results (October 8, 2025)

All timeline filters tested and working correctly:

✅ **ALL bookings** - Returns all advisor bookings  
✅ **TODAY** - Filters by today's action dates  
✅ **DELIVERY_TODAY** - Filters by today's delivery date  
✅ **PENDING_UPDATE** - Filters bookings >24h old with pending status  
✅ **OVERDUE** - Filters bookings with past delivery dates  
❌ **INVALID** - Properly rejects invalid timeline values with error message

### Sample Test Commands

```bash
# All bookings (no filter)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/bookings/advisor/my-bookings

# Today's actions
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/bookings/advisor/my-bookings?timeline=today"

# Today's deliveries
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/bookings/advisor/my-bookings?timeline=delivery_today"

# Pending updates
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/bookings/advisor/my-bookings?timeline=pending_update"

# Overdue deliveries
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/bookings/advisor/my-bookings?timeline=overdue"
```

---

## Frontend Integration

### TypeScript Interface

```typescript
type TimelineCategory = 'today' | 'delivery_today' | 'pending_update' | 'overdue';

interface BookingTimelineParams {
  timeline?: TimelineCategory;
  page?: number;
  limit?: number;
  status?: BookingStatus;
}
```

### Service Function

```typescript
export const bookingService = {
  async fetchBookingsByTimeline(params: BookingTimelineParams) {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    
    const queryParams = new URLSearchParams();
    if (params.timeline) queryParams.append('timeline', params.timeline);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    
    const response = await fetch(
      `${API_URL}/bookings/advisor/my-bookings?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    
    return data.data;
  }
};
```

### UI Component Example (React Native)

```typescript
const BookingsScreen = () => {
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineCategory | 'all'>('all');
  const [bookingsData, setBookingsData] = useState({
    bookings: [],
    loading: false,
    total: 0
  });

  const fetchBookings = async (timeline?: TimelineCategory) => {
    setBookingsData(prev => ({ ...prev, loading: true }));
    try {
      const data = await bookingService.fetchBookingsByTimeline({
        timeline,
        page: 1,
        limit: 100
      });
      setBookingsData({ 
        bookings: data.bookings, 
        loading: false,
        total: data.pagination.total
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch bookings');
      setBookingsData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (selectedTimeline === 'all') {
      fetchBookings();
    } else {
      fetchBookings(selectedTimeline);
    }
  }, [selectedTimeline]);

  return (
    <View style={styles.container}>
      {/* Timeline Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineTabs}>
        <TouchableOpacity 
          style={[styles.tab, selectedTimeline === 'today' && styles.activeTab]}
          onPress={() => setSelectedTimeline('today')}
        >
          <Text style={styles.tabIcon}>📅</Text>
          <Text style={styles.tabText}>Today</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, selectedTimeline === 'delivery_today' && styles.activeTab]}
          onPress={() => setSelectedTimeline('delivery_today')}
        >
          <Text style={styles.tabIcon}>🚗</Text>
          <Text style={styles.tabText}>Delivery</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, selectedTimeline === 'pending_update' && styles.activeTab]}
          onPress={() => setSelectedTimeline('pending_update')}
        >
          <Text style={styles.tabIcon}>⏰</Text>
          <Text style={styles.tabText}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, selectedTimeline === 'overdue' && styles.activeTab]}
          onPress={() => setSelectedTimeline('overdue')}
        >
          <Text style={styles.tabIcon}>🔴</Text>
          <Text style={styles.tabText}>Overdue</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, selectedTimeline === 'all' && styles.activeTab]}
          onPress={() => setSelectedTimeline('all')}
        >
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={styles.tabText}>All</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bookings List */}
      {bookingsData.loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={bookingsData.bookings}
          renderItem={({ item }) => <BookingCard booking={item} />}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No bookings found</Text>
          }
        />
      )}
    </View>
  );
};
```

---

## Benefits

### For Advisors
1. **Better Organization** - Clear view of daily tasks and priorities
2. **Improved Follow-up** - Identify stale bookings needing attention
3. **Delivery Tracking** - Monitor today's deliveries in one place
4. **Escalation Management** - Quick access to overdue deliveries

### For Management
1. **Performance Tracking** - Monitor advisor responsiveness to pending bookings
2. **Delivery Metrics** - Track on-time vs overdue deliveries
3. **Resource Allocation** - Identify bottlenecks in the booking process

---

## Database Fields Used

| Field | Description | Used In Timeline |
|-------|-------------|------------------|
| `fileLoginDate` | Date when finance file was logged | Today |
| `approvalDate` | Date when booking was approved | Today |
| `rtoDate` | Date of RTO registration | Today |
| `expectedDeliveryDate` | Expected vehicle delivery date | Delivery Today, Overdue |
| `status` | Current booking status | Delivery Today, Pending Update, Overdue |
| `createdAt` | Booking creation timestamp | Pending Update |

---

## Future Enhancements

### Potential Additions
1. **Custom Timeline** - Allow advisors to set custom follow-up dates
2. **Timeline Notifications** - Push notifications for timeline categories
3. **Timeline Analytics** - Dashboard showing booking distribution across timelines
4. **Multi-Timeline View** - Show counts for all timelines simultaneously
5. **Timeline Sorting** - Sort bookings within timeline by urgency

### Additional Timeline Categories (Future)
- **This Week** - Bookings with actions scheduled this week
- **Next Week** - Upcoming bookings for next week
- **Follow-up Required** - Bookings without recent activity
- **Finance Pending** - Bookings awaiting finance approval

---

## Related Documentation

- [Advisor Editable Fields Implementation](./ADVISOR_EDITABLE_FIELDS_IMPLEMENTATION.md)
- [Role-Specific Remarks Guide](./ROLE_SPECIFIC_REMARKS_GUIDE.md)
- [Enquiry Category Implementation](./ENQUIRY_CATEGORY_IMPLEMENTATION.md)
- [Auto Booking Conversion Guide](./AUTO_BOOKING_CONVERSION_GUIDE.md)

---

## Support

For issues or questions regarding booking timeline categorization:
- Check the API response for error messages
- Verify the timeline parameter value is valid
- Ensure proper authentication token is provided
- Review date fields in the database for correct values

---

**Last Updated:** October 8, 2025  
**Version:** 1.0.0  
**Author:** Car Dealership Backend Team

