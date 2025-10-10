# Frontend Integration Prompt: Booking Timeline Categorization

## 🎯 Purpose
This prompt will help you integrate the **Booking Timeline Categorization** feature into your Expo/React Native app. Copy this entire prompt and paste it into your frontend development environment (Cursor/IDE) to implement the timeline filtering UI.

---

## 📋 Copy This Entire Prompt to Your Frontend Machine

```
I need to integrate a booking timeline categorization feature into my React Native/Expo app. The backend API now supports filtering bookings by timeline categories.

## Backend API Details

**Endpoint:** `GET /api/bookings/advisor/my-bookings?timeline={value}`

**Timeline Values:**
- `today` - Bookings with actions scheduled for today (file login, approval, RTO)
- `delivery_today` - Vehicles to be delivered today
- `pending_update` - Stale bookings >24h old needing status update
- `overdue` - Deliveries past their expected delivery date

**API Response Format:**
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

## What I Need You To Do

### 1. **Update the Booking Service**

Add timeline filtering support to the existing booking service:

```typescript
// In your bookingService.ts or similar file

type TimelineCategory = 'today' | 'delivery_today' | 'pending_update' | 'overdue';

interface BookingTimelineParams {
  timeline?: TimelineCategory;
  page?: number;
  limit?: number;
  status?: string;
}

// Add or update this function
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

### 2. **Create Timeline Tab UI Component**

Add a horizontal scrollable timeline selector at the top of the bookings screen:

**Features Needed:**
- 5 tabs: Today (📅), Delivery (🚗), Pending (⏰), Overdue (🔴), All (📋)
- Active tab should have different styling (highlighted background/border)
- Show count badge on each tab with number of bookings
- Horizontal scrolling for mobile devices

**Design Guidelines:**
- Use your existing app's color scheme
- Make active tab visually distinct
- Include emoji icons for quick visual identification
- Add smooth transition when switching tabs

### 3. **Update Bookings Screen**

Modify the main bookings screen to:
- Add timeline tab selector at the top
- Load bookings based on selected timeline
- Show loading state while fetching
- Display empty state when no bookings found for selected timeline
- Keep existing features (pull to refresh, search, etc.)

**State Management:**
```typescript
const [selectedTimeline, setSelectedTimeline] = useState<TimelineCategory | 'all'>('all');
const [bookingsData, setBookingsData] = useState({
  bookings: [],
  loading: false,
  total: 0
});
```

### 4. **Implement Timeline Switching Logic**

When a timeline tab is clicked:
1. Set the selected timeline state
2. Show loading indicator
3. Fetch bookings for that timeline from API
4. Update the bookings list
5. Handle errors gracefully

### 5. **Add Timeline Counts**

Optionally, fetch counts for all timelines to show on tabs:
- Make separate API calls for each timeline to get counts
- Display count badges on each tab
- Update counts when bookings are modified

### 6. **Handle Empty States**

Show appropriate messages when no bookings found:
- "No actions scheduled for today" (today)
- "No deliveries scheduled for today" (delivery_today)
- "All bookings are up to date!" (pending_update)
- "No overdue deliveries" (overdue)
- "No bookings found" (all)

### 7. **Error Handling**

Handle these scenarios:
- Network errors
- Invalid timeline values
- Authentication errors
- Empty responses

## UI/UX Suggestions

### Timeline Tab Design Example

```
┌─────────────────────────────────────────────────────┐
│  [📅 Today]  [🚗 Delivery]  [⏰ Pending]  [🔴 Overdue]  [📋 All]  │
│      3            1            5             2          15   │
└─────────────────────────────────────────────────────┘
```

### Styling Recommendations

**Active Tab:**
- Background: Primary color or light tint
- Border: 2px solid primary color
- Text: Bold, primary color

**Inactive Tab:**
- Background: Transparent or light gray
- Border: 1px solid light gray
- Text: Normal weight, gray color

**Count Badge:**
- Small circular badge on top-right of tab
- Background: Accent color (red for overdue, blue for others)
- White text

### Sample StyleSheet

```typescript
const styles = StyleSheet.create({
  timelineTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
```

## Implementation Checklist

- [ ] Update booking service to support timeline parameter
- [ ] Add timeline type definitions (TypeScript)
- [ ] Create timeline tab selector component
- [ ] Update bookings screen to use timeline selector
- [ ] Implement timeline switching logic
- [ ] Add loading states
- [ ] Add empty states with appropriate messages
- [ ] Add error handling
- [ ] Test all timeline filters
- [ ] Add pull-to-refresh support
- [ ] Ensure proper authentication token is sent
- [ ] Test on both iOS and Android
- [ ] Verify timeline counts are accurate

## Testing Steps

After implementation, test:

1. **All Timelines:**
   - Click each timeline tab
   - Verify correct bookings are displayed
   - Check that counts match the bookings shown

2. **Edge Cases:**
   - Test with no bookings in a timeline
   - Test with many bookings (>10)
   - Test switching rapidly between timelines

3. **Error Cases:**
   - Test with no internet connection
   - Test with expired auth token
   - Test with invalid timeline value (should not happen in UI)

4. **Performance:**
   - Verify smooth transitions between tabs
   - Check that loading states appear quickly
   - Ensure no lag when switching timelines

## API Base URL

Make sure your `API_URL` environment variable is set correctly:
```
http://YOUR_BACKEND_IP:4000/api
```

For local development on same network:
```
http://10.69.245.247:4000/api
```

## Authentication

All requests must include Firebase ID token:
```typescript
headers: {
  'Authorization': `Bearer ${idToken}`
}
```

## Additional Features (Optional Enhancements)

Consider adding:
1. **Timeline Filters Combination** - Allow filtering by both timeline AND status
2. **Timeline Notifications** - Push notifications for overdue bookings
3. **Timeline Dashboard** - Show all timeline counts on home screen
4. **Timeline Sorting** - Sort bookings within each timeline by urgency
5. **Timeline Refresh** - Auto-refresh timeline counts every 5 minutes
6. **Timeline Search** - Search within selected timeline
7. **Timeline Badges** - Show visual indicators on booking cards

## Common Issues & Solutions

**Issue:** Bookings not loading  
**Solution:** Check API_URL, verify auth token is valid, check network connection

**Issue:** Timeline counts don't match  
**Solution:** Ensure pagination is handling all results, check API response

**Issue:** Active tab not highlighting  
**Solution:** Verify state management, check conditional styling logic

**Issue:** Timeline switching is slow  
**Solution:** Implement loading states, consider caching previous timeline results

## Support

If you encounter issues:
1. Check browser/Metro console for errors
2. Verify API responses using network inspector
3. Check that backend server is running on port 4000
4. Verify Firebase authentication is working
5. Test API endpoints directly using curl/Postman

## Expected Outcome

After implementation, advisors should be able to:
- ✅ See 5 timeline tabs at the top of bookings screen
- ✅ Click any tab to filter bookings by timeline
- ✅ See count of bookings in each timeline
- ✅ View appropriate empty state messages
- ✅ Switch between timelines smoothly
- ✅ Pull to refresh timeline data
- ✅ See loading states during fetch

---

**Please implement this feature following your existing app's design patterns and component structure. Maintain consistency with the current UI/UX while adding these new timeline filtering capabilities.**
```

---

## 📝 Instructions for Using This Prompt

1. **Open your Expo/React Native project** in your code editor
2. **Copy the entire prompt above** (everything in the code block)
3. **Paste it into Cursor/your AI coding assistant** in the frontend project
4. **The AI will implement** the timeline filtering UI based on this specification
5. **Review and test** the implementation
6. **Customize colors/styling** to match your app's design

---

## 🔄 Quick Start Commands

After the frontend is implemented, you can test it with your backend:

```bash
# Make sure backend is running
cd /Users/adityajaif/car-dealership-backend
npm run dev

# Backend will be available at:
http://localhost:4000
# Or from other devices:
http://10.69.245.247:4000
```

---

## 📚 Related Backend Documentation

- [Booking Timeline Categorization](./BOOKING_TIMELINE_CATEGORIZATION.md)
- [Advisor Editable Fields](./ADVISOR_EDITABLE_FIELDS_IMPLEMENTATION.md)
- [Role-Specific Remarks](./ROLE_SPECIFIC_REMARKS_GUIDE.md)

---

**Last Updated:** October 8, 2025  
**Backend Version:** 1.0.0  
**Compatible Frontend:** Expo/React Native

