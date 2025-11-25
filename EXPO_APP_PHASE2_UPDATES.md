# 📱 Expo App Updates - Phase 2 Implementation Guide

**Date:** January 2025  
**Status:** Complete Update Guide for Phase 2 Features

---

## 📋 Overview

This guide outlines all the changes needed in your Expo app to support the Phase 2 backend features that have been implemented.

---

## ✅ New Backend Features Implemented

1. **Lock Entry on Status Change** - Closed enquiries are locked
2. **Mandatory Reason for Lost** - Reason required when marking enquiry as LOST
3. **TL Dashboard Endpoint** - Team Leader dashboard metrics
4. **Escalation Matrix Alerts** - Automated notifications for inactivity, aging, retail delay
5. **Funnel Math Endpoint** - Bookings funnel calculation
6. **Vahan Date Capture** - Capture vahan date for bookings
7. **Enhanced Enquiry Filtering** - Auto-hide Booked/Lost from active view

---

## 🔧 Required Updates

### 1. Update Enquiry Update Logic (Task 10)

**File:** `src/screens/enquiries/UpdateEnquiryScreen.tsx` or similar

**Changes Needed:**

```typescript
// When updating enquiry category to "LOST"
const handleUpdateEnquiry = async (enquiryId: string, updates: any) => {
  try {
    // If marking as LOST, check if reason is provided
    if (updates.category === 'LOST') {
      if (!updates.lostReason || !updates.lostReason.trim()) {
        Alert.alert(
          'Reason Required',
          'Please provide a reason when marking enquiry as LOST.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const response = await api.put(`/enquiries/${enquiryId}`, {
      ...updates,
      // If LOST, send reason in both fields for compatibility
      lostReason: updates.lostReason || updates.caRemarks,
      caRemarks: updates.lostReason || updates.caRemarks
    });

    // Handle success
  } catch (error: any) {
    if (error.response?.status === 403 && error.response?.data?.message?.includes('locked')) {
      Alert.alert(
        'Entry Locked',
        'This enquiry is closed and cannot be updated.',
        [{ text: 'OK' }]
      );
    } else if (error.response?.status === 400 && error.response?.data?.message?.includes('Reason for lost')) {
      Alert.alert(
        'Reason Required',
        error.response.data.message,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update enquiry');
    }
  }
};
```

**Also Update:**
- Show error message when trying to edit closed enquiries
- Add "Reason for Lost" input field (required when category = LOST)
- Disable edit buttons for closed enquiries

---

### 2. Update Enquiry List to Auto-Hide Booked/Lost (Task 2)

**File:** `src/screens/enquiries/EnquiriesScreen.tsx`

**Changes Needed:**

```typescript
// Update API call to filter out Booked/Lost by default
const fetchEnquiries = async () => {
  try {
    // Only show active HOT enquiries by default
    const response = await api.get('/enquiries', {
      params: {
        category: 'HOT',
        status: 'OPEN',
        page: currentPage,
        limit: 20
      }
    });
    
    setEnquiries(response.data.data.enquiries);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
  }
};
```

**UI Updates:**
- Update page title to "Hot Enquiry Overview"
- Add subtitle: "TRACK & MANAGE YOUR ENQUIRY"
- Optionally add filter buttons to show Booked/Lost (for history)

---

### 3. Add TL Dashboard Screen (Module 5)

**New File:** `src/screens/dashboard/TeamLeaderDashboardScreen.tsx`

**Implementation:**

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card } from 'react-native-paper';
import api from '../../services/api';

interface TLDashboardData {
  teamSize: number;
  totalHotInquiryCount: number;
  pendingCAOnUpdate: number;
  pendingEnquiriesToUpdate: number;
  todaysBookingPlan: number;
}

export default function TeamLeaderDashboardScreen() {
  const [dashboardData, setDashboardData] = useState<TLDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/team-leader');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching TL dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!dashboardData) {
    return <ErrorView message="Failed to load dashboard" />;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Team Leader Dashboard</Text>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Team Size</Text>
          <Text style={styles.cardValue}>{dashboardData.teamSize}</Text>
          <Text style={styles.cardSubtitle}>Team Members</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Total Hot Inquiry Count</Text>
          <Text style={styles.cardValue}>{dashboardData.totalHotInquiryCount}</Text>
          <Text style={styles.cardSubtitle}>Active HOT Leads</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Pending CA on Update</Text>
          <Text style={[styles.cardValue, styles.urgent]}>
            {dashboardData.pendingCAOnUpdate}
          </Text>
          <Text style={styles.cardSubtitle}>CAs who missed updates today</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Pending Enquiries To Update</Text>
          <Text style={[styles.cardValue, styles.urgent]}>
            {dashboardData.pendingEnquiriesToUpdate}
          </Text>
          <Text style={styles.cardSubtitle}>Enquiries needing action</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Today's Booking Plan</Text>
          <Text style={styles.cardValue}>{dashboardData.todaysBookingPlan}</Text>
          <Text style={styles.cardSubtitle}>EDB = Today</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  urgent: {
    color: '#f44336',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
```

**Add Route:**
```typescript
// In your navigation file
import TeamLeaderDashboardScreen from './screens/dashboard/TeamLeaderDashboardScreen';

// Add route (only visible to Team Leads)
{role === 'TEAM_LEAD' && (
  <Stack.Screen 
    name="TeamLeaderDashboard" 
    component={TeamLeaderDashboardScreen} 
  />
)}
```

---

### 4. Add Vahan Date Update (Missing Feature)

**File:** `src/screens/bookings/BookingDetailScreen.tsx` or similar

**Changes Needed:**

```typescript
// Add vahan date update function
const updateVahanDate = async (bookingId: string, vahanDate: string) => {
  try {
    const response = await api.put(`/bookings/${bookingId}/vahan-date`, {
      vahanDate: vahanDate // ISO format: "2025-01-15T00:00:00Z"
    });
    
    Alert.alert('Success', 'Vahan date updated successfully');
    // Refresh booking details
    fetchBookingDetails();
  } catch (error: any) {
    Alert.alert('Error', error.response?.data?.message || 'Failed to update vahan date');
  }
};

// Add UI component for vahan date
<View style={styles.section}>
  <Text style={styles.label}>Vahan Date</Text>
  <DateTimePicker
    value={vahanDate || new Date()}
    mode="date"
    display="default"
    onChange={(event, date) => {
      if (date) {
        setVahanDate(date);
        updateVahanDate(booking.id, date.toISOString());
      }
    }}
  />
  {booking.vahanDate && (
    <Text style={styles.dateText}>
      {new Date(booking.vahanDate).toLocaleDateString()}
    </Text>
  )}
</View>
```

**Update Booking Type:**
```typescript
// In your types file
interface Booking {
  // ... existing fields
  vahanDate?: string; // ISO date string
}
```

---

### 5. Add Funnel Math Display (Task 15)

**File:** `src/screens/dashboard/DashboardScreen.tsx` or create new screen

**API Call:**
```typescript
const fetchBookingsFunnel = async () => {
  try {
    const response = await api.get('/dashboard/bookings/funnel');
    setFunnelData(response.data.data);
  } catch (error) {
    console.error('Error fetching funnel data:', error);
  }
};

// Response structure:
interface FunnelData {
  carryForward: number;
  newThisMonth: number;
  delivered: number;
  lost: number;
  actualLive: number; // = (carryForward + newThisMonth) - (delivered + lost)
}
```

**Display Component:**
```typescript
<Card style={styles.funnelCard}>
  <Card.Content>
    <Text style={styles.funnelTitle}>Bookings Funnel</Text>
    
    <View style={styles.funnelRow}>
      <Text>Carry Forward:</Text>
      <Text style={styles.funnelValue}>{funnelData.carryForward}</Text>
    </View>
    
    <View style={styles.funnelRow}>
      <Text>New This Month:</Text>
      <Text style={styles.funnelValue}>{funnelData.newThisMonth}</Text>
    </View>
    
    <View style={styles.funnelRow}>
      <Text>Delivered:</Text>
      <Text style={styles.funnelValue}>-{funnelData.delivered}</Text>
    </View>
    
    <View style={styles.funnelRow}>
      <Text>Lost:</Text>
      <Text style={styles.funnelValue}>-{funnelData.lost}</Text>
    </View>
    
    <Divider style={styles.divider} />
    
    <View style={styles.funnelRow}>
      <Text style={styles.actualLiveLabel}>Actual Live:</Text>
      <Text style={styles.actualLiveValue}>{funnelData.actualLive}</Text>
    </View>
  </Card.Content>
</Card>
```

---

### 6. Handle Escalation Alerts (Module 6)

**File:** `src/services/notifications.ts` or similar

**Notification Types to Handle:**
```typescript
// Add notification handlers for escalation alerts
const handleNotification = (notification: any) => {
  const { type, data } = notification;
  
  switch (type) {
    case 'inactivity_alert':
      // Show alert: "Enquiry has no updates for 5 days"
      navigation.navigate('EnquiryDetail', { enquiryId: data.entityId });
      break;
      
    case 'aging_alert':
      // Show alert: "Enquiry is 20-25 days old"
      navigation.navigate('EnquiryDetail', { enquiryId: data.entityId });
      break;
      
    case 'aging_alert_sm':
      // Show alert: "Enquiry is 30-35 days old" (for SM)
      navigation.navigate('EnquiryDetail', { enquiryId: data.entityId });
      break;
      
    case 'aging_alert_gm':
      // Show alert: "Enquiry is 40+ days old" (for GM)
      navigation.navigate('EnquiryDetail', { enquiryId: data.entityId });
      break;
      
    case 'retail_delay':
      // Show alert: "Booking not retailed within 15 days"
      navigation.navigate('BookingDetail', { bookingId: data.entityId });
      break;
      
    default:
      // Handle other notification types
      break;
  }
};
```

---

### 7. Update Header to Show Employee Info (Task 1)

**File:** `src/components/Header.tsx` or similar

**Changes Needed:**

```typescript
// Fetch user profile with dealership info
const { data: userProfile } = useQuery('userProfile', async () => {
  const response = await api.get('/auth/profile');
  return response.data.data.user;
});

// Display in header
<View style={styles.header}>
  <View style={styles.employeeInfo}>
    <Text style={styles.employeeName}>{userProfile?.name}</Text>
    <Text style={styles.employeeCode}>Code: {userProfile?.employeeId}</Text>
  </View>
  <View style={styles.dealershipInfo}>
    <Text style={styles.dealershipName}>
      {userProfile?.dealership?.name || 'No Dealership'}
    </Text>
  </View>
</View>
```

---

### 8. Update Enquiry Form Validation (Task 4, 6, 7, 12)

**File:** `src/screens/enquiries/CreateEnquiryScreen.tsx`

**Required Validations:**

```typescript
const validateEnquiryForm = (formData: any): string | null => {
  // Customer Name - Mandatory
  if (!formData.customerName?.trim()) {
    return 'Customer name is required';
  }

  // Contact Details - Mandatory
  if (!formData.customerContact?.trim()) {
    return 'Contact details are required';
  }

  // Email ID - Optional (no validation needed)

  // Expected Date of Booking (EDB) - Mandatory
  if (!formData.expectedBookingDate) {
    return 'Expected booking date is required';
  }

  // Validate EDB is not in past
  const edb = new Date(formData.expectedBookingDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (edb < today) {
    return 'Expected booking date cannot be in the past';
  }

  // Next Follow-up Date - Mandatory
  if (!formData.nextFollowUpDate) {
    return 'Next follow-up date is required';
  }

  // Validate Next Follow-up Date is not in past
  const nextFollowUp = new Date(formData.nextFollowUpDate);
  if (nextFollowUp < today) {
    return 'Next follow-up date cannot be in the past';
  }

  // CA Remark - Mandatory
  if (!formData.caRemarks?.trim()) {
    return 'CA remark is required';
  }

  return null; // All validations passed
};
```

**Add Source Dropdown:**
```typescript
const SOURCE_OPTIONS = [
  'WALK_IN',
  'DIGITAL',
  'BTL_ACTIVITY',
  'PHONE_CALL',
  'WEBSITE',
  'SOCIAL_MEDIA',
  'REFERRAL',
  'SHOWROOM_VISIT',
  'EVENT',
  'WHATSAPP',
  'OUTBOUND_CALL',
  'OTHER'
];

<Picker
  selectedValue={formData.source}
  onValueChange={(value) => setFormData({ ...formData, source: value })}
>
  {SOURCE_OPTIONS.map((option) => (
    <Picker.Item key={option} label={option.replace(/_/g, ' ')} value={option} />
  ))}
</Picker>
```

---

## 📝 Summary of Changes

### Files to Update/Create:

1. ✅ **Enquiry Update Screen** - Add Lost reason validation, handle locked entries
2. ✅ **Enquiry List Screen** - Filter to show only HOT/OPEN by default
3. ✅ **New: Team Leader Dashboard Screen** - Show TL metrics
4. ✅ **Booking Detail Screen** - Add vahan date update
5. ✅ **Dashboard Screen** - Add funnel math display
6. ✅ **Notification Handler** - Handle escalation alerts
7. ✅ **Header Component** - Show employee name, code, dealership
8. ✅ **Enquiry Form** - Update validations (EDB, Next Follow-up mandatory)

### API Endpoints to Use:

```typescript
// New endpoints
GET  /api/dashboard/team-leader          // TL Dashboard (TL only)
GET  /api/dashboard/bookings/funnel      // Funnel math
PUT  /api/bookings/:id/vahan-date        // Update vahan date

// Updated endpoints
PUT  /api/enquiries/:id                  // Now requires lostReason for LOST
                                         // Now blocks updates to closed enquiries
GET  /api/enquiries                      // Filter by category=HOT&status=OPEN
```

---

## 🧪 Testing Checklist

- [ ] Test marking enquiry as LOST without reason (should fail)
- [ ] Test marking enquiry as LOST with reason (should succeed)
- [ ] Test updating closed enquiry (should be blocked)
- [ ] Test TL Dashboard (should only be visible to TL)
- [ ] Test vahan date update
- [ ] Test funnel math display
- [ ] Test notification handling for escalation alerts
- [ ] Test enquiry list filtering (only HOT/OPEN shown)
- [ ] Test header displays employee info correctly
- [ ] Test form validations (EDB, Next Follow-up mandatory)

---

## 📚 Additional Resources

- Backend API Documentation: See `API_ENDPOINT_DOCUMENTATION.md`
- Phase 2 Verification: See `PHASE_2_VERIFICATION_REPORT.md`
- Missing Features Guide: See `PHASE_2_MISSING_FEATURES.md`

---

**Last Updated:** January 2025  
**Backend Version:** Latest

