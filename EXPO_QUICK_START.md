# 📱 Expo App - Quick Start Guide
**5-Minute Integration**

## 🚀 Step 1: Install Dependencies

```bash
npm install axios
# or
yarn add axios
```

## 🔧 Step 2: Create API Service (api/client.ts)

```typescript
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_URL = 'http://10.69.245.247:4000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      // navigation.navigate('Login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

## 📋 Step 3: Create Booking Service (api/bookings.ts)

```typescript
import apiClient from './client';

export const bookingAPI = {
  // Get advisor bookings with timeline filter
  getMyBookings: async (timeline?: 'today' | 'delivery_today' | 'pending_update' | 'overdue') => {
    const params = new URLSearchParams({ limit: '100' });
    if (timeline) params.append('timeline', timeline);
    
    const response = await apiClient.get(`/bookings/advisor/my-bookings?${params}`);
    return response.data;
  },

  // Update booking status
  updateBooking: async (id: string, data: {
    status?: string;
    expectedDeliveryDate?: string;  // ISO format!
    financeRequired?: boolean;
    financerName?: string;
    advisorRemarks?: string;
    stockAvailability?: 'VNA' | 'VEHICLE_AVAILABLE';
  }) => {
    const response = await apiClient.put(`/bookings/${id}/update-status`, data);
    return response.data;
  },
};
```

## 🔥 Step 4: Create Enquiry Service (api/enquiries.ts)

```typescript
import apiClient from './client';

export const enquiryAPI = {
  // Create enquiry
  createEnquiry: async (data: {
    customerName: string;
    customerContact: string;
    customerEmail?: string;
    model: string;
    variant?: string;
    source: 'SHOWROOM' | 'WEBSITE' | 'PHONE' | 'REFERRAL' | 'WALK_IN';  // UPPERCASE!
    caRemarks?: string;
  }) => {
    const response = await apiClient.post('/enquiries', data);
    return response.data;
  },

  // Get my enquiries by category
  getMyEnquiries: async (category?: 'HOT' | 'LOST' | 'BOOKED') => {
    const params = new URLSearchParams({ limit: '100' });
    if (category) params.append('category', category);
    
    const response = await apiClient.get(`/enquiries?${params}`);
    return response.data;
  },

  // Convert to booking (auto-creates booking if in stock)
  convertToBooking: async (enquiryId: string) => {
    const response = await apiClient.put(`/enquiries/${enquiryId}`, {
      category: 'BOOKED'
    });
    return response.data;
  },
};
```

## 🎨 Step 5: Example Screen (CreateEnquiry.tsx)

```typescript
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { enquiryAPI } from './api/enquiries';

export default function CreateEnquiryScreen() {
  const [formData, setFormData] = useState({
    customerName: '',
    customerContact: '',
    customerEmail: '',
    model: '',
    variant: '',
    source: 'SHOWROOM' as const,
    caRemarks: '',
  });

  const handleSubmit = async () => {
    try {
      const result = await enquiryAPI.createEnquiry(formData);
      Alert.alert('Success', 'Enquiry created!');
      // Navigate back or refresh
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Customer Name *"
        value={formData.customerName}
        onChangeText={(text) => setFormData({ ...formData, customerName: text })}
      />
      
      <TextInput
        placeholder="Phone (+91...)"
        value={formData.customerContact}
        onChangeText={(text) => setFormData({ ...formData, customerContact: text })}
      />
      
      <TextInput
        placeholder="Model *"
        value={formData.model}
        onChangeText={(text) => setFormData({ ...formData, model: text })}
      />
      
      <Button title="Create Enquiry" onPress={handleSubmit} />
    </View>
  );
}
```

## 📅 Step 6: Timeline Bookings (BookingsScreen.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Text } from 'react-native';
import { bookingAPI } from './api/bookings';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [timeline, setTimeline] = useState<'today' | 'all'>('today');

  useEffect(() => {
    loadBookings();
  }, [timeline]);

  const loadBookings = async () => {
    try {
      const result = await bookingAPI.getMyBookings(timeline === 'all' ? undefined : timeline);
      setBookings(result.data.bookings);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View>
      {/* Timeline Tabs */}
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity onPress={() => setTimeline('today')}>
          <Text>📅 Today</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTimeline('all')}>
          <Text>📋 All</Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>{item.customerName}</Text>
            <Text>{item.variant}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}
```

## ⚡ Step 7: Update Booking (UpdateBooking.tsx)

```typescript
import React, { useState } from 'react';
import { View, TextInput, Button, Switch } from 'react-native';
import { bookingAPI } from './api/bookings';

export default function UpdateBookingScreen({ route }) {
  const { bookingId } = route.params;
  const [formData, setFormData] = useState({
    status: 'PENDING',
    financeRequired: false,
    financerName: '',
    advisorRemarks: '',
  });

  const handleSubmit = async () => {
    try {
      await bookingAPI.updateBooking(bookingId, formData);
      Alert.alert('Success', 'Booking updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Switch
        value={formData.financeRequired}
        onValueChange={(value) => 
          setFormData({ ...formData, financeRequired: value })
        }
      />
      
      {formData.financeRequired && (
        <TextInput
          placeholder="Financer Name"
          value={formData.financerName}
          onChangeText={(text) => 
            setFormData({ ...formData, financerName: text })
          }
        />
      )}
      
      <TextInput
        placeholder="Advisor Remarks"
        value={formData.advisorRemarks}
        onChangeText={(text) => 
          setFormData({ ...formData, advisorRemarks: text })
        }
        multiline
      />
      
      <Button title="Update Booking" onPress={handleSubmit} />
    </View>
  );
}
```

## 🔑 Step 8: Test Credentials

```typescript
// For testing - Use these credentials
const TEST_USER = {
  email: 'advisor@test.com',
  password: 'TestPass123!',
  role: 'CUSTOMER_ADVISOR'
};
```

## ⚠️ Important: Date Format

```typescript
// ✅ CORRECT
const date = new Date("2025-11-15").toISOString();
// Result: "2025-11-15T00:00:00.000Z"

// ❌ WRONG - Will fail
const wrongDate = "2025-11-15";
```

## ✅ Testing Checklist

- [ ] Create enquiry
- [ ] View enquiries by category (HOT, LOST, BOOKED)
- [ ] Convert enquiry to booking
- [ ] View bookings with timeline filter
- [ ] Update booking status
- [ ] Add advisor remarks

## 🎉 You're Ready!

The backend is configured and running. All you need to do is:
1. Copy the API services above
2. Connect to Firebase auth
3. Start building your Expo screens!

**Backend URL:** `http://10.69.245.247:4000/api`  
**Status:** ✅ Ready and waiting!

