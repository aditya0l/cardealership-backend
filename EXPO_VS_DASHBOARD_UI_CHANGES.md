# 📱 vs 🖥️ Expo App vs Dashboard UI Changes - Side by Side

**Date:** January 2025  
**Status:** Clear Comparison Guide

---

## 📊 Quick Comparison Table

| Feature | Expo App (React Native) | Dashboard (React + Material-UI) |
|---------|-------------------------|--------------------------------|
| **Platform** | Mobile (iOS/Android) | Web Browser |
| **UI Library** | React Native Components | Material-UI (MUI) |
| **Navigation** | React Navigation | React Router |
| **Forms** | React Native TextInput | Material-UI TextField + react-hook-form |
| **Date Pickers** | @react-native-community/datetimepicker | @mui/x-date-pickers |
| **Notifications** | Expo Notifications | FCM + Material-UI Snackbar |

---

## 1️⃣ Enquiry Update - Lost Reason & Locked Entries

### 📱 **Expo App**

**File:** `src/screens/enquiries/UpdateEnquiryScreen.tsx`

**UI Implementation:**
```typescript
// React Native Alert for Lost Reason
import { Alert, TextInput, View, TouchableOpacity, Text } from 'react-native';

const [lostReason, setLostReason] = useState('');
const [showLostReason, setShowLostReason] = useState(false);

// Show Alert when marking as LOST
const handleCategoryChange = (newCategory: string) => {
  if (newCategory === 'LOST') {
    Alert.prompt(
      'Reason for Lost',
      'Please provide a reason when marking enquiry as LOST.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: (reason) => {
            if (!reason || !reason.trim()) {
              Alert.alert('Error', 'Reason is required');
              return;
            }
            updateEnquiry({ category: 'LOST', lostReason: reason });
          }
        }
      ],
      'plain-text'
    );
  }
};

// Disable edit button for closed enquiries
{enquiry.status === 'CLOSED' ? (
  <View style={styles.lockedContainer}>
    <Text style={styles.lockedText}>
      This enquiry is closed and cannot be updated.
    </Text>
  </View>
) : (
  <TouchableOpacity 
    style={styles.editButton}
    onPress={handleEdit}
  >
    <Text>Edit Enquiry</Text>
  </TouchableOpacity>
)}
```

**Visual:**
```
┌─────────────────────────────┐
│  Category: [HOT ▼]         │
│                             │
│  [Change to LOST]          │ → Triggers Alert.prompt()
│                             │
│  ┌───────────────────────┐ │
│  │ Alert Prompt:         │ │
│  │ "Reason for Lost?"    │ │
│  │ [Text Input]          │ │
│  │ [Cancel] [Confirm]    │ │
│  └───────────────────────┘ │
└─────────────────────────────┘

Status: CLOSED → Shows locked message
Status: OPEN → Shows edit button
```

---

### 🖥️ **Dashboard (React)**

**File:** `src/pages/enquiries/EnquiryDetailPage.tsx`

**UI Implementation:**
```typescript
// Material-UI Dialog for Lost Reason
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

const [lostReason, setLostReason] = useState('');
const [showLostReasonDialog, setShowLostReasonDialog] = useState(false);

// Show Dialog when marking as LOST
const handleCategoryChange = (newCategory: string) => {
  if (newCategory === 'LOST' && enquiry.category !== 'LOST') {
    setShowLostReasonDialog(true);
    return;
  }
  updateEnquiry({ category: newCategory });
};

// Lost Reason Dialog
<Dialog open={showLostReasonDialog} onClose={() => setShowLostReasonDialog(false)}>
  <DialogTitle>Reason for Lost</DialogTitle>
  <DialogContent>
    <TextField
      autoFocus
      margin="dense"
      label="Reason for Lost"
      fullWidth
      multiline
      rows={4}
      required
      value={lostReason}
      onChange={(e) => setLostReason(e.target.value)}
      error={!lostReason.trim()}
      helperText="Please provide a reason when marking enquiry as LOST"
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowLostReasonDialog(false)}>Cancel</Button>
    <Button 
      onClick={handleConfirmLost} 
      variant="contained" 
      disabled={!lostReason.trim()}
    >
      Confirm Lost
    </Button>
  </DialogActions>
</Dialog>

// Disable edit for closed enquiries
{enquiry.status === 'CLOSED' && (
  <Alert severity="warning">
    This enquiry is closed and cannot be updated.
  </Alert>
)}
{enquiry.status !== 'CLOSED' && (
  <Button variant="contained" onClick={handleEdit}>
    Edit Enquiry
  </Button>
)}
```

**Visual:**
```
┌─────────────────────────────┐
│  Category: [HOT ▼]         │
│                             │
│  [Change to LOST]          │ → Opens Material-UI Dialog
│                             │
│  ┌───────────────────────┐ │
│  │ ┌───────────────────┐ │ │
│  │ │ Reason for Lost   │ │ │ ← Dialog Title
│  │ ├───────────────────┤ │ │
│  │ │ [Multiline        │ │ │ ← TextField
│  │ │  Text Input]      │ │ │
│  │ │                   │ │ │
│  │ │ Helper text       │ │ │
│  │ ├───────────────────┤ │ │
│  │ │ [Cancel] [Confirm]│ │ │ ← Dialog Actions
│  │ └───────────────────┘ │ │
│  └───────────────────────┘ │
└─────────────────────────────┘

Status: CLOSED → Shows MUI Alert
Status: OPEN → Shows MUI Button
```

**Key Differences:**
- **Expo:** Uses `Alert.prompt()` (native alert)
- **Dashboard:** Uses Material-UI `Dialog` component
- **Expo:** Simpler, single input alert
- **Dashboard:** Full dialog with multiline TextField and validation

---

## 2️⃣ Enquiry List - Title & Filtering

### 📱 **Expo App**

**File:** `src/screens/enquiries/EnquiriesScreen.tsx`

**UI Implementation:**
```typescript
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

<View style={styles.container}>
  <View style={styles.header}>
    <Text style={styles.title}>Hot Enquiry Overview</Text>
    <Text style={styles.subtitle}>TRACK & MANAGE YOUR ENQUIRY</Text>
  </View>

  {/* Optional filter buttons */}
  <View style={styles.filterContainer}>
    <TouchableOpacity 
      style={[styles.filterButton, activeFilter === 'HOT' && styles.activeFilter]}
      onPress={() => setActiveFilter('HOT')}
    >
      <Text>HOT</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.filterButton, activeFilter === 'BOOKED' && styles.activeFilter]}
      onPress={() => setActiveFilter('BOOKED')}
    >
      <Text>BOOKED</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.filterButton, activeFilter === 'LOST' && styles.activeFilter]}
      onPress={() => setActiveFilter('LOST')}
    >
      <Text>LOST</Text>
    </TouchableOpacity>
  </View>

  <FlatList
    data={enquiries}
    renderItem={({ item }) => <EnquiryCard enquiry={item} />}
    keyExtractor={(item) => item.id}
  />
</View>

// Default filter: category=HOT&status=OPEN
const fetchEnquiries = async () => {
  const response = await api.get('/enquiries', {
    params: { category: 'HOT', status: 'OPEN', page: 1 }
  });
};
```

**Visual:**
```
┌─────────────────────────────┐
│  Hot Enquiry Overview       │ ← Large title
│  TRACK & MANAGE YOUR ENQUIRY│ ← Subtitle
│                             │
│  [HOT] [BOOKED] [LOST]     │ ← Filter buttons
│                             │
│  ┌───────────────────────┐ │
│  │ Enquiry Card 1        │ │
│  │ John Doe - Honda      │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ Enquiry Card 2        │ │
│  └───────────────────────┘ │
│  (Scrollable list)         │
└─────────────────────────────┘
```

---

### 🖥️ **Dashboard (React)**

**File:** `src/pages/enquiries/EnquiriesPage.tsx`

**UI Implementation:**
```typescript
import { Box, Typography, Chip, Stack, Paper, Table } from '@mui/material';

<Box sx={{ p: 3 }}>
  <Typography variant="h4" component="h1" gutterBottom>
    Hot Enquiry Overview
  </Typography>
  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
    TRACK & MANAGE YOUR ENQUIRY
  </Typography>

  {/* Filter chips */}
  <Stack direction="row" spacing={1} sx={{ my: 2 }}>
    <Chip
      label="Hot Enquiries"
      color={filter === 'HOT' ? 'primary' : 'default'}
      onClick={() => setFilter('HOT')}
      clickable
    />
    <Chip
      label="Booked"
      color={filter === 'BOOKED' ? 'primary' : 'default'}
      onClick={() => setFilter('BOOKED')}
      clickable
    />
    <Chip
      label="Lost"
      color={filter === 'LOST' ? 'primary' : 'default'}
      onClick={() => setFilter('LOST')}
      clickable
    />
  </Stack>

  <Paper>
    <Table>
      {/* Table rows */}
    </Table>
  </Paper>
</Box>

// Default filter: category=HOT&status=OPEN
const fetchEnquiries = async () => {
  const response = await api.get('/enquiries', {
    params: { category: 'HOT', status: 'OPEN', limit: 100 }
  });
};
```

**Visual:**
```
┌─────────────────────────────────┐
│  Hot Enquiry Overview          │ ← Typography h4
│  TRACK & MANAGE YOUR ENQUIRY   │ ← Typography subtitle1
│                                 │
│  [Hot] [Booked] [Lost]         │ ← MUI Chips (clickable)
│                                 │
│  ┌───────────────────────────┐ │
│  │ [Material-UI Table]       │ │
│  │ Name    │ Model  │ Status │ │
│  │─────────┼────────┼────────│ │
│  │ John    │ Honda  │ HOT    │ │
│  │ Jane    │ Toyota │ HOT    │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Key Differences:**
- **Expo:** Uses `FlatList` for scrollable cards
- **Dashboard:** Uses Material-UI `Table` component
- **Expo:** TouchableOpacity buttons for filters
- **Dashboard:** Material-UI `Chip` components
- **Expo:** Card-based layout (mobile-friendly)
- **Dashboard:** Table layout (desktop-friendly)

---

## 3️⃣ Team Leader Dashboard

### 📱 **Expo App**

**File:** `src/screens/dashboard/TeamLeaderDashboardScreen.tsx` (NEW)

**UI Implementation:**
```typescript
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const TeamLeaderDashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const response = await api.get('/dashboard/team-leader');
    setDashboardData(response.data.data);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Team Leader Dashboard</Text>

      <View style={styles.grid}>
        {/* Team Size Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Team Size</Text>
          <Text style={styles.cardValue}>{dashboardData?.teamSize || 0}</Text>
        </View>

        {/* Total Hot Inquiry Count Card */}
        <View style={[styles.card, styles.primaryCard]}>
          <Text style={styles.cardTitle}>Total Hot Inquiry Count</Text>
          <Text style={[styles.cardValue, styles.primaryValue]}>
            {dashboardData?.totalHotInquiryCount || 0}
          </Text>
        </View>

        {/* Pending CA on Update Card */}
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.cardTitle}>Pending CA on Update</Text>
          <Text style={[styles.cardValue, styles.errorValue]}>
            {dashboardData?.pendingCAOnUpdate || 0}
          </Text>
          <Text style={styles.cardSubtitle}>CAs who missed updates today</Text>
        </View>

        {/* Pending Enquiries To Update Card */}
        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.cardTitle}>Pending Enquiries To Update</Text>
          <Text style={[styles.cardValue, styles.warningValue]}>
            {dashboardData?.pendingEnquiriesToUpdate || 0}
          </Text>
          <Text style={styles.cardSubtitle}>Enquiries needing action</Text>
        </View>

        {/* Today's Booking Plan Card */}
        <View style={[styles.card, styles.successCard]}>
          <Text style={styles.cardTitle}>Today's Booking Plan</Text>
          <Text style={[styles.cardValue, styles.successValue]}>
            {dashboardData?.todaysBookingPlan || 0}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  cardValue: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  cardSubtitle: { fontSize: 12, color: '#999', marginTop: 4 },
  primaryValue: { color: '#1976d2' },
  errorValue: { color: '#d32f2f' },
  warningValue: { color: '#ed6c02' },
  successValue: { color: '#2e7d32' },
});
```

**Visual:**
```
┌─────────────────────────────┐
│  Team Leader Dashboard      │
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │Team Size │ │Hot Inq.  │ │
│  │    5     │ │   12     │ │
│  └──────────┘ └──────────┘ │
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │Pending CA│ │Pending   │ │
│  │    3     │ │Enquiries │ │
│  │          │ │    8     │ │
│  └──────────┘ └──────────┘ │
│                             │
│  ┌──────────────────────┐  │
│  │Today's Booking Plan  │  │
│  │         5            │  │
│  └──────────────────────┘  │
│                             │
│  (Scrollable)               │
└─────────────────────────────┘
```

---

### 🖥️ **Dashboard (React)**

**File:** `src/pages/dashboard/TeamLeaderDashboardPage.tsx` (NEW)

**UI Implementation:**
```typescript
import { Box, Grid, Card, CardContent, Typography, CircularProgress } from '@mui/material';

const TeamLeaderDashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/team-leader');
      setDashboardData(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Team Leader Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Team Size Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Team Size
              </Typography>
              <Typography variant="h3" component="div">
                {dashboardData?.teamSize || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Hot Inquiry Count Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Hot Inquiry Count
              </Typography>
              <Typography variant="h3" component="div" color="primary">
                {dashboardData?.totalHotInquiryCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending CA on Update Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pending CA on Update
              </Typography>
              <Typography variant="h3" component="div" color="error">
                {dashboardData?.pendingCAOnUpdate || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CAs who missed updates today
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Enquiries To Update Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pending Enquiries To Update
              </Typography>
              <Typography variant="h3" component="div" color="warning.main">
                {dashboardData?.pendingEnquiriesToUpdate || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enquiries needing action
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Booking Plan Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Today's Booking Plan
              </Typography>
              <Typography variant="h3" component="div" color="success.main">
                {dashboardData?.todaysBookingPlan || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
```

**Visual:**
```
┌─────────────────────────────────────────┐
│  Team Leader Dashboard                 │ ← Typography h4
├─────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Team Size│ │Hot Inq. │ │Pending  │  │ ← Grid layout
│  │    5    │ │   12    │ │   CA    │  │   (responsive)
│  └─────────┘ └─────────┘ │    3    │  │
│                          └─────────┘  │
│  ┌─────────┐ ┌─────────┐              │
│  │Pending  │ │Today's  │              │
│  │Enquiries│ │Booking  │              │
│  │    8    │ │    5    │              │
│  └─────────┘ └─────────┘              │
└─────────────────────────────────────────┘
```

**Key Differences:**
- **Expo:** Custom `StyleSheet` for styling, `View` components
- **Dashboard:** Material-UI `Card`, `CardContent`, `Typography` components
- **Expo:** Manual flex layout with `flexWrap`
- **Dashboard:** Material-UI `Grid` system (responsive breakpoints)
- **Expo:** ScrollView for mobile scrolling
- **Dashboard:** Fixed layout (no scrolling needed on desktop)

---

## 4️⃣ Vahan Date Field

### 📱 **Expo App**

**File:** `src/screens/bookings/BookingDetailScreen.tsx`

**UI Implementation:**
```typescript
import DateTimePicker from '@react-native-community/datetimepicker';

const [vahanDate, setVahanDate] = useState<Date | null>(null);
const [showDatePicker, setShowDatePicker] = useState(false);

const handleUpdateVahanDate = async () => {
  if (!vahanDate) {
    Alert.alert('Error', 'Please select a vahan date');
    return;
  }

  try {
    await api.put(`/bookings/${bookingId}/vahan-date`, {
      vahanDate: vahanDate.toISOString()
    });
    Alert.alert('Success', 'Vahan date updated successfully');
  } catch (error) {
    Alert.alert('Error', 'Failed to update vahan date');
  }
};

return (
  <View style={styles.container}>
    <Text style={styles.label}>Vahan Date</Text>
    
    <TouchableOpacity
      style={styles.dateButton}
      onPress={() => setShowDatePicker(true)}
    >
      <Text>
        {vahanDate ? vahanDate.toLocaleDateString() : 'Select Vahan Date'}
      </Text>
    </TouchableOpacity>

    {showDatePicker && (
      <DateTimePicker
        value={vahanDate || new Date()}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          setShowDatePicker(false);
          if (selectedDate) {
            setVahanDate(selectedDate);
          }
        }}
      />
    )}

    <TouchableOpacity
      style={styles.updateButton}
      onPress={handleUpdateVahanDate}
    >
      <Text>Update Vahan Date</Text>
    </TouchableOpacity>
  </View>
);
```

**Visual:**
```
┌─────────────────────────────┐
│  Booking Details           │
│                             │
│  Vahan Date                │ ← Label
│  ┌───────────────────────┐ │
│  │ [Select Vahan Date]   │ │ ← TouchableOpacity
│  └───────────────────────┘ │
│                             │
│  [Native Date Picker]      │ ← Shows when tapped
│                             │
│  ┌───────────────────────┐ │
│  │ [Update Vahan Date]   │ │ ← Button
│  └───────────────────────┘ │
└─────────────────────────────┘
```

---

### 🖥️ **Dashboard (React)**

**File:** `src/pages/bookings/BookingDetailPage.tsx`

**UI Implementation:**
```typescript
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextField, Button, Box } from '@mui/material';

const [vahanDate, setVahanDate] = useState<Date | null>(null);

const handleUpdateVahanDate = async () => {
  if (!vahanDate) {
    setError('Please select a vahan date');
    return;
  }

  try {
    await api.put(`/bookings/${bookingId}/vahan-date`, {
      vahanDate: vahanDate.toISOString()
    });
    setSuccess('Vahan date updated successfully');
  } catch (error) {
    setError('Failed to update vahan date');
  }
};

return (
  <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Box sx={{ mb: 2 }}>
      <DatePicker
        label="Vahan Date"
        value={vahanDate}
        onChange={(newValue) => setVahanDate(newValue)}
        renderInput={(params) => (
          <TextField {...params} fullWidth />
        )}
      />
    </Box>

    <Button
      variant="contained"
      onClick={handleUpdateVahanDate}
      disabled={!vahanDate}
    >
      Update Vahan Date
    </Button>
  </LocalizationProvider>
);
```

**Visual:**
```
┌─────────────────────────────┐
│  Booking Details           │
│                             │
│  ┌───────────────────────┐ │
│  │ Vahan Date        [📅]│ │ ← MUI DatePicker
│  │ [Date Input Field]    │ │   (inline calendar)
│  └───────────────────────┘ │
│                             │
│  [Update Vahan Date]        │ ← MUI Button
└─────────────────────────────┘
```

**Key Differences:**
- **Expo:** `@react-native-community/datetimepicker` (native picker)
- **Dashboard:** `@mui/x-date-pickers` (Material-UI date picker)
- **Expo:** Modal date picker (separate screen)
- **Dashboard:** Inline calendar popup
- **Expo:** Manual button trigger
- **Dashboard:** Integrated TextField with calendar icon

---

## 5️⃣ Bookings Funnel Math

### 📱 **Expo App**

**File:** `src/screens/dashboard/DashboardScreen.tsx`

**UI Implementation:**
```typescript
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const FunnelData = {
  carryForward: number;
  newThisMonth: number;
  delivered: number;
  lost: number;
  actualLive: number;
};

const BookingsFunnel = () => {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);

  useEffect(() => {
    fetchFunnelData();
  }, []);

  const fetchFunnelData = async () => {
    const response = await api.get('/dashboard/bookings/funnel');
    setFunnelData(response.data.data);
  };

  return (
    <View style={styles.funnelContainer}>
      <Text style={styles.funnelTitle}>Bookings Funnel</Text>
      
      <View style={styles.funnelRow}>
        <Text style={styles.funnelLabel}>Carry Forward</Text>
        <Text style={styles.funnelValue}>{funnelData?.carryForward || 0}</Text>
      </View>
      
      <View style={styles.funnelRow}>
        <Text style={styles.funnelLabel}>New This Month</Text>
        <Text style={styles.funnelValue}>{funnelData?.newThisMonth || 0}</Text>
      </View>
      
      <View style={styles.funnelRow}>
        <Text style={styles.funnelLabel}>Delivered</Text>
        <Text style={styles.funnelValue}>{funnelData?.delivered || 0}</Text>
      </View>
      
      <View style={styles.funnelRow}>
        <Text style={styles.funnelLabel}>Lost</Text>
        <Text style={styles.funnelValue}>{funnelData?.lost || 0}</Text>
      </View>
      
      <View style={[styles.funnelRow, styles.highlightRow]}>
        <Text style={[styles.funnelLabel, styles.highlightLabel]}>
          Actual Live
        </Text>
        <Text style={[styles.funnelValue, styles.highlightValue]}>
          {funnelData?.actualLive || 0}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  funnelContainer: { padding: 16, backgroundColor: '#fff', borderRadius: 8 },
  funnelTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  funnelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  funnelLabel: { fontSize: 16, color: '#666' },
  funnelValue: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  highlightRow: { backgroundColor: '#f5f5f5', borderRadius: 4 },
  highlightLabel: { fontWeight: 'bold', color: '#000' },
  highlightValue: { fontSize: 20, color: '#2e7d32' },
});
```

**Visual:**
```
┌─────────────────────────────┐
│  Bookings Funnel           │
├─────────────────────────────┤
│  Carry Forward      25      │
│  New This Month    10      │
│  Delivered          5      │
│  Lost               2      │
│  ─────────────────────      │
│  Actual Live       28      │ ← Highlighted
└─────────────────────────────┘
```

---

### 🖥️ **Dashboard (React)**

**File:** `src/pages/dashboard/DashboardPage.tsx`

**UI Implementation:**
```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  Typography,
  Box,
} from '@mui/material';

const BookingsFunnel = () => {
  const [funnelData, setFunnelData] = useState(null);

  useEffect(() => {
    fetchFunnelData();
  }, []);

  const fetchFunnelData = async () => {
    const response = await api.get('/dashboard/bookings/funnel');
    setFunnelData(response.data.data);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Bookings Funnel
      </Typography>
      
      <Table size="small">
        <TableBody>
          <TableRow>
            <TableCell>Carry Forward</TableCell>
            <TableCell align="right">
              {funnelData?.carryForward || 0}
            </TableCell>
          </TableRow>
          
          <TableRow>
            <TableCell>New This Month</TableCell>
            <TableCell align="right">
              {funnelData?.newThisMonth || 0}
            </TableCell>
          </TableRow>
          
          <TableRow>
            <TableCell>Delivered</TableCell>
            <TableCell align="right">
              {funnelData?.delivered || 0}
            </TableCell>
          </TableRow>
          
          <TableRow>
            <TableCell>Lost</TableCell>
            <TableCell align="right">
              {funnelData?.lost || 0}
            </TableCell>
          </TableRow>
          
          <TableRow
            sx={{
              backgroundColor: 'action.hover',
              '& .MuiTableCell-root': {
                fontWeight: 'bold',
                fontSize: '1.1rem',
              },
            }}
          >
            <TableCell>Actual Live</TableCell>
            <TableCell align="right" sx={{ color: 'success.main' }}>
              {funnelData?.actualLive || 0}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
};
```

**Visual:**
```
┌─────────────────────────────┐
│  Bookings Funnel           │ ← Typography h6
├─────────────────────────────┤
│  Metric        │   Count   │ ← Table header
│  ──────────────┼───────────│
│  Carry Forward │     25    │
│  New This Month│     10    │
│  Delivered     │      5    │
│  Lost          │      2    │
│  ──────────────┼───────────│
│  Actual Live   │     28    │ ← Highlighted row
└─────────────────────────────┘
```

**Key Differences:**
- **Expo:** Custom `View` and `Text` with StyleSheet
- **Dashboard:** Material-UI `Table` component
- **Expo:** Simple row layout (mobile-friendly)
- **Dashboard:** Table layout with proper alignment (desktop-friendly)
- **Expo:** Manual styling for highlights
- **Dashboard:** MUI TableRow sx prop for styling

---

## 6️⃣ Header Component - Employee Info

### 📱 **Expo App**

**File:** `src/components/Header.tsx`

**UI Implementation:**
```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Header = ({ user }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.logo}>AutoQuik</Text>
      </View>
      
      <View style={styles.headerRight}>
        <Text style={styles.employeeId}>
          Employee: {user.employeeId || 'N/A'}
        </Text>
        <Text style={styles.dealership}>
          {user.dealership?.name || 'N/A'}
        </Text>
        
        <TouchableOpacity onPress={handleProfile}>
          <Text style={styles.profileButton}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logo: { fontSize: 20, fontWeight: 'bold' },
  employeeId: { fontSize: 14, color: '#666' },
  dealership: { fontSize: 12, color: '#999' },
});
```

**Visual:**
```
┌─────────────────────────────────┐
│  AutoQuik                       │
│         Employee: ADV001        │
│         ABC Motors              │
│                      [Profile]  │
│                      [Logout]   │
└─────────────────────────────────┘
```

---

### 🖥️ **Dashboard (React)**

**File:** `src/components/Header.tsx` or `src/layouts/MainLayout.tsx`

**UI Implementation:**
```typescript
import { AppBar, Toolbar, Typography, Box, Button, Menu, MenuItem } from '@mui/material';

const Header = ({ user }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AutoQuik
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            Employee: {user.employeeId || 'N/A'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.dealership?.name || 'N/A'}
          </Typography>
          
          <Button
            color="inherit"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            {user.name}
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={handleProfile}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
```

**Visual:**
```
┌─────────────────────────────────────────┐
│  AutoQuik                               │
│          Employee: ADV001 | ABC Motors  │
│                       [User Name ▼]    │
│                         ┌─────────────┐ │
│                         │ Profile     │ │ ← Menu
│                         │ Logout      │ │
│                         └─────────────┘ │
└─────────────────────────────────────────┘
```

**Key Differences:**
- **Expo:** Custom `View` header with simple layout
- **Dashboard:** Material-UI `AppBar` and `Toolbar`
- **Expo:** TouchableOpacity buttons
- **Dashboard:** Material-UI `Menu` with dropdown
- **Expo:** Vertical employee info display (mobile)
- **Dashboard:** Horizontal layout with dropdown menu (desktop)

---

## 7️⃣ Enquiry Form - Enhanced Validations

### 📱 **Expo App**

**File:** `src/screens/enquiries/CreateEnquiryScreen.tsx`

**UI Implementation:**
```typescript
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const validateForm = () => {
  if (!customerName.trim()) {
    Alert.alert('Error', 'Customer name is required');
    return false;
  }
  if (!customerContact.trim()) {
    Alert.alert('Error', 'Contact details are required');
    return false;
  }
  if (!expectedBookingDate) {
    Alert.alert('Error', 'Expected booking date is required');
    return false;
  }
  if (!nextFollowUpDate) {
    Alert.alert('Error', 'Next follow-up date is required');
    return false;
  }
  if (!caRemarks.trim()) {
    Alert.alert('Error', 'CA remark is required');
    return false;
  }
  if (!source) {
    Alert.alert('Error', 'Source is required');
    return false;
  }
  return true;
};

return (
  <ScrollView>
    <TextInput
      placeholder="Customer Name *"
      value={customerName}
      onChangeText={setCustomerName}
      style={styles.input}
    />
    
    <TextInput
      placeholder="Contact *"
      value={customerContact}
      onChangeText={setCustomerContact}
      style={styles.input}
    />
    
    <Picker
      selectedValue={source}
      onValueChange={setSource}
      style={styles.picker}
    >
      <Picker.Item label="Select Source *" value="" />
      <Picker.Item label="Walk-in" value="WALK_IN" />
      <Picker.Item label="Phone" value="PHONE" />
      <Picker.Item label="Referral" value="REFERRAL" />
      <Picker.Item label="Online" value="ONLINE" />
    </Picker>
    
    <TouchableOpacity onPress={() => setShowEDBPicker(true)}>
      <Text>
        EDB: {expectedBookingDate?.toLocaleDateString() || 'Select Date *'}
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity onPress={() => setShowNextFollowUpPicker(true)}>
      <Text>
        Next Follow-up: {nextFollowUpDate?.toLocaleDateString() || 'Select Date *'}
      </Text>
    </TouchableOpacity>
    
    <TextInput
      placeholder="CA Remarks *"
      value={caRemarks}
      onChangeText={setCaRemarks}
      multiline
      style={styles.textArea}
    />
    
    <TouchableOpacity
      style={styles.submitButton}
      onPress={handleSubmit}
    >
      <Text>Create Enquiry</Text>
    </TouchableOpacity>
  </ScrollView>
);
```

---

### 🖥️ **Dashboard (React)**

**File:** `src/pages/enquiries/CreateEnquiryDialog.tsx`

**UI Implementation:**
```typescript
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  TextField,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const enquirySchema = yup.object({
  customerName: yup.string().required('Customer name is required'),
  customerContact: yup.string().required('Contact details are required'),
  source: yup.string().required('Source is required'),
  expectedBookingDate: yup.date().required('EDB is required'),
  nextFollowUpDate: yup.date().required('Next follow-up date is required'),
  caRemarks: yup.string().required('CA remark is required'),
});

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(enquirySchema),
});

return (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Create Enquiry</DialogTitle>
    <DialogContent>
      <Controller
        name="customerName"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Customer Name"
            fullWidth
            required
            error={!!errors.customerName}
            helperText={errors.customerName?.message}
            sx={{ mt: 2 }}
          />
        )}
      />
      
      <Controller
        name="source"
        control={control}
        render={({ field }) => (
          <>
            <TextField
              {...field}
              select
              label="Source"
              fullWidth
              required
              error={!!errors.source}
              helperText={errors.source?.message}
              sx={{ mt: 2 }}
            >
              <MenuItem value="WALK_IN">Walk-in</MenuItem>
              <MenuItem value="PHONE">Phone</MenuItem>
              <MenuItem value="REFERRAL">Referral</MenuItem>
              <MenuItem value="ONLINE">Online</MenuItem>
            </TextField>
          </>
        )}
      />
      
      <Controller
        name="expectedBookingDate"
        control={control}
        render={({ field }) => (
          <DatePicker
            {...field}
            label="Expected Booking Date *"
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                required
                error={!!errors.expectedBookingDate}
                helperText={errors.expectedBookingDate?.message}
                sx={{ mt: 2 }}
              />
            )}
          />
        )}
      />
      
      <Controller
        name="caRemarks"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="CA Remarks"
            fullWidth
            required
            multiline
            rows={4}
            error={!!errors.caRemarks}
            helperText={errors.caRemarks?.message}
            sx={{ mt: 2 }}
          />
        )}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button variant="contained" onClick={handleSubmit(onSubmit)}>
        Create Enquiry
      </Button>
    </DialogActions>
  </Dialog>
);
```

**Key Differences:**
- **Expo:** Manual validation with `Alert.alert()`
- **Dashboard:** `react-hook-form` + `yup` schema validation
- **Expo:** React Native `Picker` component
- **Dashboard:** Material-UI `Select` with `MenuItem`
- **Expo:** Custom TextInput components
- **Dashboard:** Material-UI `TextField` with built-in error display
- **Expo:** Simple validation errors (alerts)
- **Dashboard:** Inline error messages below each field

---

## 📋 Summary Table

| Feature | Expo App | Dashboard |
|---------|----------|-----------|
| **Lost Reason** | `Alert.prompt()` | Material-UI `Dialog` |
| **Enquiry List** | `FlatList` with cards | Material-UI `Table` |
| **TL Dashboard** | Custom `View` cards | Material-UI `Grid` + `Card` |
| **Vahan Date** | `@react-native-community/datetimepicker` | `@mui/x-date-pickers` |
| **Funnel Math** | Custom `View` rows | Material-UI `Table` |
| **Header** | Custom `View` layout | Material-UI `AppBar` |
| **Form Validation** | Manual `Alert.alert()` | `react-hook-form` + `yup` |
| **Date Pickers** | Modal native picker | Inline calendar popup |
| **Styling** | `StyleSheet` | Material-UI `sx` prop |
| **Notifications** | Expo Notifications | FCM + Material-UI Snackbar |

---

## 🔗 Related Documentation

- **Expo Guide:** `EXPO_APP_PHASE2_UPDATES.md`
- **Dashboard Guide:** `DASHBOARD_PHASE2_UPDATES.md`
- **UI Changes Summary:** `PHASE_2_UI_CHANGES_SUMMARY.md`

---

**Last Updated:** January 2025

