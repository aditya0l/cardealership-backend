# 🖥️ Dashboard Updates - Phase 2 Implementation Guide

**Date:** January 2025  
**Status:** Complete Update Guide for Phase 2 Features

---

## 📋 Overview

This guide outlines all the changes needed in your React Dashboard (Vite + React) to support the Phase 2 backend features that have been implemented.

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

**File:** `src/pages/enquiries/EnquiryDetailPage.tsx` or `EditEnquiryDialog.tsx`

**Changes Needed:**

```typescript
// Add Lost reason modal/field
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

const [lostReason, setLostReason] = useState('');
const [showLostReasonDialog, setShowLostReasonDialog] = useState(false);

const handleCategoryChange = async (newCategory: string) => {
  // If changing to LOST, show reason dialog
  if (newCategory === 'LOST' && enquiry.category !== 'LOST') {
    setShowLostReasonDialog(true);
    return;
  }

  // For other categories, proceed normally
  await updateEnquiry({ category: newCategory });
};

const handleConfirmLost = async () => {
  if (!lostReason.trim()) {
    setError('Reason for lost is required');
    return;
  }

  try {
    await updateEnquiry({
      category: 'LOST',
      lostReason: lostReason.trim(),
      caRemarks: lostReason.trim() // Also store in remarks
    });
    
    setShowLostReasonDialog(false);
    setLostReason('');
    // Show success message
  } catch (error: any) {
    if (error.response?.status === 403 && error.response?.data?.message?.includes('locked')) {
      setError('This enquiry is closed and cannot be updated.');
    } else if (error.response?.status === 400 && error.response?.data?.message?.includes('Reason for lost')) {
      setError(error.response.data.message);
    } else {
      setError('Failed to update enquiry');
    }
  }
};

// Add Lost Reason Dialog
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
    <Button onClick={handleConfirmLost} variant="contained" disabled={!lostReason.trim()}>
      Confirm
    </Button>
  </DialogActions>
</Dialog>

// Disable edit buttons for closed enquiries
{enquiry.status === 'CLOSED' && (
  <Alert severity="info">
    This enquiry is closed and cannot be updated.
  </Alert>
)}

{enquiry.status !== 'CLOSED' && (
  <Button onClick={() => handleEdit()}>Edit Enquiry</Button>
)}
```

---

### 2. Update Enquiry List to Auto-Hide Booked/Lost (Task 2)

**File:** `src/pages/enquiries/EnquiriesPage.tsx`

**Changes Needed:**

```typescript
// Update page title and subtitle
<Box sx={{ mb: 3 }}>
  <Typography variant="h4" component="h1">
    Hot Enquiry Overview
  </Typography>
  <Typography variant="body2" color="text.secondary">
    TRACK & MANAGE YOUR ENQUIRY
  </Typography>
</Box>

// Update API call to filter by default
const fetchEnquiries = async () => {
  try {
    setIsLoading(true);
    const response = await api.get('/enquiries', {
      params: {
        category: 'HOT',        // Only HOT by default
        status: 'OPEN',         // Only OPEN by default
        page: currentPage,
        limit: rowsPerPage
      }
    });
    
    setEnquiries(response.data.data.enquiries);
    setTotalCount(response.data.data.total);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    setError('Failed to load enquiries');
  } finally {
    setIsLoading(false);
  }
};

// Add filter chips/buttons to optionally show Booked/Lost
<Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
  <Chip
    label="Hot Enquiries"
    color={filterCategory === 'HOT' ? 'primary' : 'default'}
    onClick={() => setFilterCategory('HOT')}
  />
  <Chip
    label="Booked"
    color={filterCategory === 'BOOKED' ? 'primary' : 'default'}
    onClick={() => setFilterCategory('BOOKED')}
  />
  <Chip
    label="Lost"
    color={filterCategory === 'LOST' ? 'primary' : 'default'}
    onClick={() => setFilterCategory('LOST')}
  />
</Box>
```

---

### 3. Add TL Dashboard Page (Module 5)

**New File:** `src/pages/dashboard/TeamLeaderDashboardPage.tsx`

**Implementation:**

```typescript
import React, { useEffect, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface TLDashboardData {
  teamSize: number;
  totalHotInquiryCount: number;
  pendingCAOnUpdate: number;
  pendingEnquiriesToUpdate: number;
  todaysBookingPlan: number;
}

export default function TeamLeaderDashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<TLDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only load if user is Team Lead
    if (user?.role?.name !== 'TEAM_LEAD') {
      setError('Access denied. Team Lead only.');
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/team-leader');
      setDashboardData(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching TL dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" gutterBottom>
        Team Leader Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Team Size
              </Typography>
              <Typography variant="h3" component="div">
                {dashboardData.teamSize}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Team Members
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Hot Inquiry Count
              </Typography>
              <Typography variant="h3" component="div" color="primary">
                {dashboardData.totalHotInquiryCount}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active HOT Leads
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending CA on Update
              </Typography>
              <Typography variant="h3" component="div" color="error">
                {dashboardData.pendingCAOnUpdate}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                CAs who missed updates today
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Enquiries To Update
              </Typography>
              <Typography variant="h3" component="div" color="warning.main">
                {dashboardData.pendingEnquiriesToUpdate}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Enquiries needing action
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Today's Booking Plan
              </Typography>
              <Typography variant="h3" component="div" color="success.main">
                {dashboardData.todaysBookingPlan}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                EDB = Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
```

**Add Route:**
```typescript
// In src/App.tsx or routing file
import TeamLeaderDashboardPage from './pages/dashboard/TeamLeaderDashboardPage';

// Add protected route (only for Team Leads)
<Route
  path="/dashboard/team-leader"
  element={
    <ProtectedRoute allowedRoles={['TEAM_LEAD']}>
      <TeamLeaderDashboardPage />
    </ProtectedRoute>
  }
/>

// Add navigation link (only visible to Team Leads)
{user?.role?.name === 'TEAM_LEAD' && (
  <MenuItem onClick={() => navigate('/dashboard/team-leader')}>
    Team Leader Dashboard
  </MenuItem>
)}
```

---

### 4. Add Vahan Date Field (Missing Feature)

**File:** `src/pages/bookings/BookingDetailPage.tsx` or `EditBookingDialog.tsx`

**Changes Needed:**

```typescript
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Add state
const [vahanDate, setVahanDate] = useState<Date | null>(
  booking.vahanDate ? new Date(booking.vahanDate) : null
);

// Add update function
const handleVahanDateChange = async (newDate: Date | null) => {
  if (!newDate) return;

  try {
    const response = await api.put(`/bookings/${booking.id}/vahan-date`, {
      vahanDate: newDate.toISOString()
    });
    
    setVahanDate(newDate);
    // Show success snackbar
    enqueueSnackbar('Vahan date updated successfully', { variant: 'success' });
    // Refresh booking data
    fetchBookingDetails();
  } catch (error: any) {
    console.error('Error updating vahan date:', error);
    enqueueSnackbar(
      error.response?.data?.message || 'Failed to update vahan date',
      { variant: 'error' }
    );
  }
};

// Add UI component
<LocalizationProvider dateAdapter={AdapterDateFns}>
  <Grid item xs={12} sm={6}>
    <DatePicker
      label="Vahan Date"
      value={vahanDate}
      onChange={handleVahanDateChange}
      renderInput={(params) => <TextField {...params} fullWidth />}
      disabled={booking.status === 'DELIVERED' || booking.status === 'CANCELLED'}
    />
    {vahanDate && (
      <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
        Last updated: {new Date(vahanDate).toLocaleDateString()}
      </Typography>
    )}
  </Grid>
</LocalizationProvider>
```

**Update Booking Type:**
```typescript
// In src/types/booking.ts
export interface Booking {
  // ... existing fields
  vahanDate?: string; // ISO date string
}
```

---

### 5. Add Funnel Math Component (Task 15)

**File:** `src/pages/dashboard/DashboardPage.tsx` or create `BookingsFunnelWidget.tsx`

**Implementation:**

```typescript
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  CircularProgress
} from '@mui/material';
import api from '../../services/api';

interface FunnelData {
  carryForward: number;
  newThisMonth: number;
  delivered: number;
  lost: number;
  actualLive: number;
}

export default function BookingsFunnelWidget() {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFunnelData();
  }, []);

  const fetchFunnelData = async () => {
    try {
      const response = await api.get('/dashboard/bookings/funnel');
      setFunnelData(response.data.data);
    } catch (error) {
      console.error('Error fetching funnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  if (!funnelData) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Bookings Funnel
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Actual Live = (Carry Forward + New This Month) - (Delivered + Lost)
        </Typography>
        
        <Divider sx={{ my: 2 }} />

        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell>Carry Forward</TableCell>
              <TableCell align="right">
                <Typography variant="body1" fontWeight="medium">
                  +{funnelData.carryForward}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>New This Month</TableCell>
              <TableCell align="right">
                <Typography variant="body1" fontWeight="medium" color="primary">
                  +{funnelData.newThisMonth}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Delivered</TableCell>
              <TableCell align="right">
                <Typography variant="body1" fontWeight="medium" color="error">
                  -{funnelData.delivered}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Lost</TableCell>
              <TableCell align="right">
                <Typography variant="body1" fontWeight="medium" color="error">
                  -{funnelData.lost}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography variant="subtitle1" fontWeight="bold">
                  Actual Live
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {funnelData.actualLive}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Add to DashboardPage
<Grid item xs={12} md={6}>
  <BookingsFunnelWidget />
</Grid>
```

---

### 6. Update Header Component (Task 1)

**File:** `src/components/Header.tsx` or `src/layouts/MainLayout.tsx`

**Changes Needed:**

```typescript
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user } = useAuth();

  return (
    <AppBar position="static">
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Employee Name */}
          <Typography variant="h6" component="div">
            {user?.name || 'Employee'}
          </Typography>

          {/* Dealership Name */}
          {user?.dealership && (
            <Typography variant="body2" sx={{ ml: 2 }}>
              {user.dealership.name}
            </Typography>
          )}

          {/* Employee Code */}
          {user?.employeeId && (
            <Chip
              label={`Code: ${user.employeeId}`}
              size="small"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          )}
        </Box>

        {/* Rest of header content */}
      </Toolbar>
    </AppBar>
  );
}
```

**Update Auth Context Types:**
```typescript
// In src/contexts/AuthContext.tsx
interface User {
  // ... existing fields
  employeeId?: string;
  dealership?: {
    id: string;
    name: string;
    code: string;
  };
}
```

---

### 7. Update Enquiry Form Validation (Task 4, 6, 7, 12)

**File:** `src/pages/enquiries/CreateEnquiryDialog.tsx` or `EnquiryForm.tsx`

**Required Validations:**

```typescript
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Validation schema
const enquirySchema = yup.object({
  customerName: yup.string().required('Customer name is required'),
  customerContact: yup.string().required('Contact details are required'),
  customerEmail: yup.string().email('Invalid email format').optional(),
  source: yup.string().required('Source of inquiry is required'),
  location: yup.string().required('Location is required'),
  expectedBookingDate: yup
    .date()
    .required('Expected booking date is required')
    .min(new Date(), 'Expected booking date cannot be in the past'),
  nextFollowUpDate: yup
    .date()
    .required('Next follow-up date is required')
    .min(new Date(), 'Next follow-up date cannot be in the past'),
  caRemarks: yup.string().required('CA remark is required'),
});

// Form component
const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(enquirySchema),
  defaultValues: {
    source: 'WALK_IN',
    // ... other defaults
  }
});

// Source dropdown
<Controller
  name="source"
  control={control}
  render={({ field }) => (
    <TextField
      {...field}
      select
      label="Source of Inquiry"
      fullWidth
      required
      error={!!errors.source}
      helperText={errors.source?.message}
    >
      {SOURCE_OPTIONS.map((option) => (
        <MenuItem key={option} value={option}>
          {option.replace(/_/g, ' ')}
        </MenuItem>
      ))}
    </TextField>
  )}
/>

// Expected Booking Date
<Controller
  name="expectedBookingDate"
  control={control}
  render={({ field }) => (
    <DatePicker
      {...field}
      label="Expected Date of Booking (EDB)"
      minDate={new Date()} // Disable past dates
      renderInput={(params) => (
        <TextField
          {...params}
          fullWidth
          required
          error={!!errors.expectedBookingDate}
          helperText={errors.expectedBookingDate?.message}
        />
      )}
    />
  )}
/>

// Next Follow-up Date
<Controller
  name="nextFollowUpDate"
  control={control}
  render={({ field }) => (
    <DatePicker
      {...field}
      label="Next Follow-up Date"
      minDate={new Date()} // Disable past dates
      renderInput={(params) => (
        <TextField
          {...params}
          fullWidth
          required
          error={!!errors.nextFollowUpDate}
          helperText={errors.nextFollowUpDate?.message}
        />
      )}
    />
  )}
/>
```

**Source Options:**
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
```

---

### 8. Handle Escalation Alert Notifications

**File:** `src/services/notifications.ts` or `src/contexts/NotificationContext.tsx`

**Add Notification Handlers:**

```typescript
// Handle different notification types
const handleNotification = (notification: any) => {
  const { type, data, priority } = notification;
  
  switch (type) {
    case 'inactivity_alert':
      showNotification({
        title: '🚨 Inactive Enquiry Alert',
        message: `Enquiry has no updates for 5 days`,
        severity: 'warning',
        action: {
          label: 'View Enquiry',
          onClick: () => navigate(`/enquiries/${data.entityId}`)
        }
      });
      break;
      
    case 'aging_alert':
      showNotification({
        title: '⚠️ Aging Enquiry Alert',
        message: `Enquiry is 20-25 days old`,
        severity: 'info',
        action: {
          label: 'View Enquiry',
          onClick: () => navigate(`/enquiries/${data.entityId}`)
        }
      });
      break;
      
    case 'aging_alert_sm':
      showNotification({
        title: '🚨 Aging Enquiry Alert - Sales Manager',
        message: `Enquiry is 30-35 days old`,
        severity: 'warning',
        action: {
          label: 'View Enquiry',
          onClick: () => navigate(`/enquiries/${data.entityId}`)
        }
      });
      break;
      
    case 'aging_alert_gm':
      showNotification({
        title: '🚨 URGENT: Aging Enquiry Alert - General Manager',
        message: `Enquiry is 40+ days old`,
        severity: 'error',
        action: {
          label: 'View Enquiry',
          onClick: () => navigate(`/enquiries/${data.entityId}`)
        }
      });
      break;
      
    case 'retail_delay':
      showNotification({
        title: '🚨 Retail Delay Alert',
        message: `Booking has not been retailed/delivered within 15 days`,
        severity: 'warning',
        action: {
          label: 'View Booking',
          onClick: () => navigate(`/bookings/${data.entityId}`)
        }
      });
      break;
      
    default:
      // Handle other notification types
      break;
  }
};
```

---

## 📝 Summary of Changes

### Files to Update/Create:

1. ✅ **Enquiry Detail/Edit Page** - Add Lost reason dialog, handle locked entries
2. ✅ **Enquiry List Page** - Update title, subtitle, default filters
3. ✅ **New: Team Leader Dashboard Page** - Show TL metrics
4. ✅ **Booking Detail Page** - Add vahan date field
5. ✅ **Dashboard Page** - Add funnel math widget
6. ✅ **Header Component** - Show employee info
7. ✅ **Enquiry Form** - Update validations, add source dropdown
8. ✅ **Notification Handler** - Handle escalation alerts

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
GET  /api/auth/profile                   // Returns employeeId and dealership
```

---

## 🧪 Testing Checklist

- [ ] Test marking enquiry as LOST without reason (should show dialog)
- [ ] Test marking enquiry as LOST with reason (should succeed)
- [ ] Test updating closed enquiry (should be blocked with message)
- [ ] Test TL Dashboard (should only be visible to TL)
- [ ] Test vahan date update
- [ ] Test funnel math display
- [ ] Test notification handling for escalation alerts
- [ ] Test enquiry list filtering (only HOT/OPEN shown by default)
- [ ] Test header displays employee info correctly
- [ ] Test form validations (EDB, Next Follow-up mandatory, no past dates)
- [ ] Test source dropdown works correctly

---

## 📚 Additional Resources

- Backend API Documentation: See `API_ENDPOINT_DOCUMENTATION.md`
- Phase 2 Verification: See `PHASE_2_VERIFICATION_REPORT.md`
- Missing Features Guide: See `PHASE_2_MISSING_FEATURES.md`

---

**Last Updated:** January 2025  
**Backend Version:** Latest

