# ⚠️ Phase 2 Missing Features - Quick Reference

**Date:** January 2025  
**Status:** Critical Missing Features Summary

---

## 🔴 High Priority - Must Fix

### 1. Lock Entry on Status Change (Task 10)
**Issue:** Enquiries marked as "Booked" or "Lost" should be locked (non-editable), but currently updates might still be possible.

**Fix Required:**
```typescript
// In src/controllers/enquiries.controller.ts - updateEnquiry function
if (existingEnquiry.status === EnquiryStatus.CLOSED) {
  throw createError('Cannot update closed enquiry. Entry is locked.', 403);
}
```

**File:** `src/controllers/enquiries.controller.ts`

---

### 2. Mandatory Reason for Lost (Task 10)
**Issue:** When enquiry status changes to "Lost", a mandatory reason should be required, but it's currently optional.

**Fix Required:**
```typescript
// In src/controllers/enquiries.controller.ts - updateEnquiry function
if (category === 'LOST' && existingEnquiry.category !== 'LOST') {
  if (!req.body.lostReason || !req.body.lostReason.trim()) {
    throw createError('Reason for lost is required. Please provide a reason.', 400);
  }
  
  // Store reason as remark
  const lostRemark = await prisma.remark.create({
    data: {
      entityType: 'enquiry',
      entityId: id,
      remark: req.body.lostReason.trim(),
      remarkType: 'ca_remarks',
      createdBy: user.firebaseUid
    }
  });
  
  // Close enquiry
  updateFields.status = EnquiryStatus.CLOSED;
}
```

**File:** `src/controllers/enquiries.controller.ts`

---

### 3. TL Dashboard Endpoint (Module 5)
**Issue:** No dedicated endpoint for Team Leader dashboard metrics.

**Fix Required:**
```typescript
// Create new endpoint in src/controllers/dashboard.controller.ts
export const getTeamLeaderDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  if (user.role.name !== 'TEAM_LEAD') {
    throw createError('Access denied. Team Lead only.', 403);
  }
  
  // Get team members
  const teamMembers = await prisma.user.findMany({
    where: {
      managerId: user.firebaseUid,
      isActive: true
    }
  });
  
  const teamMemberIds = teamMembers.map(m => m.firebaseUid);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  // 1. Team Size
  const teamSize = teamMembers.length;
  
  // 2. Total Hot Inquiry Count
  const hotInquiries = await prisma.enquiry.count({
    where: {
      status: 'OPEN',
      category: 'HOT',
      dealershipId: user.dealershipId,
      OR: [
        { createdByUserId: { in: teamMemberIds } },
        { assignedToUserId: { in: teamMemberIds } }
      ]
    }
  });
  
  // 3. Pending CA on Update
  // Get CAs who have enquiries with pending follow-ups but haven't updated today
  const casWithPendingUpdates = await prisma.user.findMany({
    where: {
      managerId: user.firebaseUid,
      role: { name: 'CUSTOMER_ADVISOR' },
      isActive: true
    },
    include: {
      createdEnquiries: {
        where: {
          status: 'OPEN',
          nextFollowUpDate: { lte: endOfDay },
          remarkHistory: {
            none: {
              createdAt: { gte: today },
              createdBy: { in: teamMemberIds }
            }
          }
        }
      }
    }
  });
  
  const pendingCAOnUpdate = casWithPendingUpdates.filter(ca => 
    ca.createdEnquiries.length > 0
  ).length;
  
  // 4. Pending Enquiries To Update
  const pendingEnquiries = await prisma.enquiry.count({
    where: {
      status: 'OPEN',
      dealershipId: user.dealershipId,
      OR: [
        { createdByUserId: { in: teamMemberIds } },
        { assignedToUserId: { in: teamMemberIds } }
      ],
      OR: [
        { nextFollowUpDate: null },
        { nextFollowUpDate: { lte: endOfDay } }
      ],
      NOT: {
        remarkHistory: {
          some: {
            createdAt: { gte: today },
            createdBy: { in: teamMemberIds }
          }
        }
      }
    }
  });
  
  // 5. Today's Booking Plan
  const todaysBookingPlan = await prisma.enquiry.count({
    where: {
      status: 'OPEN',
      expectedBookingDate: {
        gte: today,
        lte: endOfDay
      },
      dealershipId: user.dealershipId,
      OR: [
        { createdByUserId: { in: teamMemberIds } },
        { assignedToUserId: { in: teamMemberIds } }
      ]
    }
  });
  
  res.json({
    success: true,
    message: 'Team Leader dashboard retrieved successfully',
    data: {
      teamSize,
      totalHotInquiryCount: hotInquiries,
      pendingCAOnUpdate,
      pendingEnquiriesToUpdate: pendingEnquiries,
      todaysBookingPlan
    }
  });
});

// Add route in src/routes/dashboard.routes.ts
router.get('/team-leader', getTeamLeaderDashboard);
```

**Files:**
- `src/controllers/dashboard.controller.ts`
- `src/routes/dashboard.routes.ts`

---

### 4. Escalation Matrix - Inactivity Alerts (Module 6)
**Issue:** 5-day neglect alert not implemented.

**Fix Required:**
```typescript
// Add to src/services/followup-notification.service.ts
async processInactivityAlerts(): Promise<void> {
  console.log('🔄 Processing inactivity alerts...');
  
  const today = new Date();
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  
  // Find enquiries with no updates in 5 days
  const inactiveEnquiries = await prisma.enquiry.findMany({
    where: {
      status: 'OPEN',
      category: 'HOT',
      OR: [
        { lastFollowUpDate: { lt: fiveDaysAgo } },
        { lastFollowUpDate: null, createdAt: { lt: fiveDaysAgo } }
      ],
      // Ensure no remarks in last 5 days
      remarkHistory: {
        none: {
          createdAt: { gte: fiveDaysAgo }
        }
      }
    },
    include: {
      createdBy: {
        include: {
          manager: {
            select: {
              firebaseUid: true,
              name: true,
              email: true,
              fcmToken: true
            }
          }
        }
      }
    }
  });
  
  for (const enquiry of inactiveEnquiries) {
    // Notify TL
    if (enquiry.createdBy.manager) {
      await NotificationTriggerService.triggerNotification(
        enquiry.createdBy.manager.firebaseUid,
        'Inactive Enquiry Alert',
        `Enquiry for ${enquiry.customerName} has no updates for 5 days`,
        'inactivity_alert',
        enquiry.id,
        'HIGH'
      );
    }
  }
  
  console.log(`✅ Processed ${inactiveEnquiries.length} inactivity alerts`);
}

// Schedule this to run daily (add to cron or scheduler)
```

**File:** `src/services/followup-notification.service.ts`

---

### 5. Escalation Matrix - Aging Alerts (Module 6)
**Issue:** 20-25, 30-35, 40+ days aging alerts not implemented.

**Fix Required:**
```typescript
// Add to src/services/followup-notification.service.ts
async processAgingAlerts(): Promise<void> {
  console.log('🔄 Processing aging alerts...');
  
  const today = new Date();
  
  // 20-25 days open
  const twentyDaysAgo = new Date(today);
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 25);
  const twentyFiveDaysAgo = new Date(today);
  twentyFiveDaysAgo.setDate(twentyFiveDaysAgo.getDate() - 20);
  
  const ageing20to25 = await prisma.enquiry.findMany({
    where: {
      status: 'OPEN',
      createdAt: {
        gte: twentyDaysAgo,
        lte: twentyFiveDaysAgo
      }
    },
    include: {
      createdBy: {
        include: { manager: true }  // TL
      },
      assignedTo: true
    }
  });
  
  // Notify CA and TL for 20-25 days
  for (const enquiry of ageing20to25) {
    if (enquiry.createdBy) {
      await NotificationTriggerService.triggerNotification(
        enquiry.createdBy.firebaseUid,
        'Aging Enquiry Alert',
        `Enquiry for ${enquiry.customerName} is 20-25 days old`,
        'aging_alert',
        enquiry.id,
        'MEDIUM'
      );
    }
    
    if (enquiry.createdBy.manager) {
      await NotificationTriggerService.triggerNotification(
        enquiry.createdBy.manager.firebaseUid,
        'Aging Enquiry Alert',
        `Enquiry for ${enquiry.customerName} is 20-25 days old`,
        'aging_alert',
        enquiry.id,
        'MEDIUM'
      );
    }
  }
  
  // 30-35 days open - Notify Sales Manager
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35);
  const thirtyFiveDaysAgo = new Date(today);
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 30);
  
  const ageing30to35 = await prisma.enquiry.findMany({
    where: {
      status: 'OPEN',
      createdAt: {
        gte: thirtyDaysAgo,
        lte: thirtyFiveDaysAgo
      },
      dealershipId: { not: null }
    },
    include: {
      dealership: {
        include: {
          users: {
            where: {
              role: { name: 'SALES_MANAGER' },
              isActive: true
            }
          }
        }
      }
    }
  });
  
  for (const enquiry of ageing30to35) {
    // Notify Sales Managers
    const salesManagers = enquiry.dealership?.users || [];
    for (const sm of salesManagers) {
      await NotificationTriggerService.triggerNotification(
        sm.firebaseUid,
        'Aging Enquiry Alert - Sales Manager',
        `Enquiry for ${enquiry.customerName} is 30-35 days old`,
        'aging_alert_sm',
        enquiry.id,
        'HIGH'
      );
    }
  }
  
  // 40+ days open - Notify General Manager
  const fortyDaysAgo = new Date(today);
  fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 1000); // All enquiries 40+ days old
  
  const ageing40plus = await prisma.enquiry.findMany({
    where: {
      status: 'OPEN',
      createdAt: { lte: fortyDaysAgo },
      dealershipId: { not: null }
    },
    include: {
      dealership: {
        include: {
          users: {
            where: {
              role: { name: 'GENERAL_MANAGER' },
              isActive: true
            }
          }
        }
      }
    }
  });
  
  for (const enquiry of ageing40plus) {
    // Notify General Managers
    const generalManagers = enquiry.dealership?.users || [];
    for (const gm of generalManagers) {
      await NotificationTriggerService.triggerNotification(
        gm.firebaseUid,
        'Aging Enquiry Alert - General Manager',
        `Enquiry for ${enquiry.customerName} is 40+ days old`,
        'aging_alert_gm',
        enquiry.id,
        'HIGH'
      );
    }
  }
  
  console.log(`✅ Processed aging alerts: ${ageing20to25.length} (20-25), ${ageing30to35.length} (30-35), ${ageing40plus.length} (40+)`);
}
```

**File:** `src/services/followup-notification.service.ts`

---

## 🟡 Medium Priority - Should Fix

### 6. Funnel Math Endpoint (Task 15)
**Issue:** No endpoint for Actual Live calculation: `(Carry Forward + New This Month) - (Delivered - Lost)`

**Fix Required:**
```typescript
// Add to src/controllers/dashboard.controller.ts
export const getBookingsFunnel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Build dealership filter
  const dealershipFilter: any = {};
  if (user.dealershipId) {
    dealershipFilter.dealershipId = user.dealershipId;
  }
  
  // Carry Forward (bookings created before this month, not delivered/cancelled)
  const carryForward = await prisma.booking.count({
    where: {
      ...dealershipFilter,
      createdAt: { lt: startOfMonth },
      status: { notIn: ['DELIVERED', 'CANCELLED'] }
    }
  });
  
  // New This Month
  const newThisMonth = await prisma.booking.count({
    where: {
      ...dealershipFilter,
      createdAt: { gte: startOfMonth }
    }
  });
  
  // Delivered This Month
  const delivered = await prisma.booking.count({
    where: {
      ...dealershipFilter,
      status: 'DELIVERED',
      updatedAt: { gte: startOfMonth }
    }
  });
  
  // Lost (Cancelled) This Month
  const lost = await prisma.booking.count({
    where: {
      ...dealershipFilter,
      status: 'CANCELLED',
      updatedAt: { gte: startOfMonth }
    }
  });
  
  // Actual Live = (Carry Forward + New This Month) - (Delivered + Lost)
  const actualLive = (carryForward + newThisMonth) - (delivered + lost);
  
  res.json({
    success: true,
    message: 'Bookings funnel retrieved successfully',
    data: {
      carryForward,
      newThisMonth,
      delivered,
      lost,
      actualLive
    }
  });
});

// Add route
router.get('/bookings/funnel', getBookingsFunnel);
```

**Files:**
- `src/controllers/dashboard.controller.ts`
- `src/routes/dashboard.routes.ts`

---

### 7. Retail Delay Alerts (Module 6)
**Issue:** 15-day post-booking alert not implemented.

**Fix Required:**
```typescript
// Add to src/services/followup-notification.service.ts
async processRetailDelayAlerts(): Promise<void> {
  console.log('🔄 Processing retail delay alerts...');
  
  const today = new Date();
  const fifteenDaysAgo = new Date(today);
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
  // Find bookings created 15+ days ago but not delivered
  const delayedBookings = await prisma.booking.findMany({
    where: {
      createdAt: { lte: fifteenDaysAgo },
      status: { notIn: ['DELIVERED', 'CANCELLED'] }
    },
    include: {
      advisor: true,
      enquiry: {
        include: {
          createdBy: {
            include: { manager: true }  // TL
          }
        }
      }
    }
  });
  
  for (const booking of delayedBookings) {
    // Notify CA
    if (booking.advisorId && booking.advisor) {
      await NotificationTriggerService.triggerNotification(
        booking.advisorId,
        'Retail Delay Alert',
        `Booking for ${booking.customerName} has not been retailed/delivered within 15 days`,
        'retail_delay',
        booking.id,
        'HIGH'
      );
    }
    
    // Notify TL
    if (booking.enquiry?.createdBy?.manager) {
      await NotificationTriggerService.triggerNotification(
        booking.enquiry.createdBy.manager.firebaseUid,
        'Retail Delay Alert',
        `Booking for ${booking.customerName} has not been retailed/delivered within 15 days`,
        'retail_delay',
        booking.id,
        'HIGH'
      );
    }
  }
  
  console.log(`✅ Processed ${delayedBookings.length} retail delay alerts`);
}
```

**File:** `src/services/followup-notification.service.ts`

---

### 8. Vahan Date Capture (Missing Feature)
**Issue:** No way to capture Vahan Date when converting to Retail.

**Fix Required:**
```typescript
// 1. Add field to schema.prisma
model Booking {
  // ... existing fields
  vahanDate DateTime? @map("vahan_date")
}

// 2. Add endpoint in src/controllers/bookings.controller.ts
export const updateVahanDate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { vahanDate } = req.body;
  
  if (!vahanDate) {
    throw createError('Vahan date is required', 400);
  }
  
  const parsedDate = new Date(vahanDate);
  if (isNaN(parsedDate.getTime())) {
    throw createError('Invalid vahan date format', 400);
  }
  
  const existingBooking = await prisma.booking.findFirst({
    where: {
      id,
      dealershipId: req.user.dealershipId
    }
  });
  
  if (!existingBooking) {
    throw createError('Booking not found', 404);
  }
  
  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: { vahanDate: parsedDate }
  });
  
  // Create audit log
  await prisma.bookingAuditLog.create({
    data: {
      bookingId: id,
      changedBy: req.user.firebaseUid,
      action: 'UPDATE',
      oldValue: existingBooking as any,
      newValue: updatedBooking as any,
      changeReason: 'Vahan date updated'
    }
  });
  
  res.json({
    success: true,
    message: 'Vahan date updated successfully',
    data: { booking: updatedBooking }
  });
});

// 3. Add route
router.put('/:id/vahan-date', authenticate, updateVahanDate);
```

**Files:**
- `prisma/schema.prisma` (add migration)
- `src/controllers/bookings.controller.ts`
- `src/routes/bookings.routes.ts`

---

## 📋 Implementation Checklist

- [ ] Lock entry on status change (Task 10)
- [ ] Mandatory reason for Lost (Task 10)
- [ ] TL Dashboard endpoint (Module 5)
- [ ] Inactivity alerts (5-day neglect) (Module 6)
- [ ] Aging alerts (20-25, 30-35, 40+ days) (Module 6)
- [ ] Funnel math endpoint (Task 15)
- [ ] Retail delay alerts (15-day) (Module 6)
- [ ] Vahan date capture (Missing feature)

---

**Next Steps:**
1. Implement high-priority fixes first
2. Test each feature after implementation
3. Schedule escalation matrix alerts to run daily
4. Update frontend to use new endpoints

