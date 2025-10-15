import { Router } from 'express';
import {
  // Enhanced booking management from bookings controller
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getAdvisorBookings,
  addBookingRemark,
  getBookingAuditLog,
  updateBookingStatusAndFields
} from '../controllers/bookings.controller';
import {
  // Admin import endpoints from booking-import controller
  uploadImportFile,
  previewImportFile,
  getImportHistory,
  getImportById,
  downloadImportErrors,
  assignAdvisor,
  bulkAssignAdvisor,
  unassignAdvisor,
  autoAssignBookings,
  generateExcelTemplate,
  updateBookingStatus
} from '../controllers/booking-import.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { enforceFieldPermissions, enforceAdvisorBookingAccess } from '../middlewares/rbac.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =============================================================================
// ADMIN ROUTES - Bulk Import Management
// =============================================================================

// Bulk import endpoints (Admin only)
router.post('/import/upload', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), 
  uploadImportFile
);

router.post('/import/preview', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), 
  previewImportFile
);

// 🆕 Generate Excel template with advisor IDs
router.get('/import/template', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER]), 
  generateExcelTemplate
);

router.get('/imports', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), 
  getImportHistory
);

router.get('/imports/:id', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), 
  getImportById
);

router.get('/imports/:id/errors', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), 
  downloadImportErrors
);

// Single booking management for admins and managers
router.post('/', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER, RoleName.TEAM_LEAD, RoleName.CUSTOMER_ADVISOR]), 
  enforceFieldPermissions,
  createBooking
);

router.patch('/:id/assign', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER, RoleName.TEAM_LEAD]), 
  assignAdvisor
);

// 🆕 Bulk assign multiple bookings to one advisor
router.post('/bulk-assign', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER, RoleName.TEAM_LEAD]), 
  bulkAssignAdvisor
);

// 🆕 Unassign advisor from booking
router.patch('/:id/unassign', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER, RoleName.TEAM_LEAD]), 
  unassignAdvisor
);

// 🆕 Auto-assign bookings using different strategies (round-robin, least-load, random)
router.post('/auto-assign', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER]), 
  autoAssignBookings
);

// =============================================================================
// ADVISOR ROUTES - Mobile App Support
// =============================================================================

// Advisor-specific endpoints
router.get('/advisor/my-bookings', 
  authorize([RoleName.CUSTOMER_ADVISOR]), 
  getAdvisorBookings
);

router.patch('/:id/status', 
  authorize([RoleName.CUSTOMER_ADVISOR, RoleName.TEAM_LEAD, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER, RoleName.ADMIN]), 
  enforceAdvisorBookingAccess,
  enforceFieldPermissions,
  updateBookingStatus
);

// Update booking status and advisor-editable fields - NEW ENDPOINT
router.put('/:id/update-status', 
  authorize([RoleName.CUSTOMER_ADVISOR, RoleName.TEAM_LEAD, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER, RoleName.ADMIN]), 
  enforceAdvisorBookingAccess,
  updateBookingStatusAndFields
);

// =============================================================================
// GENERAL ROUTES - Enhanced Booking Management  
// =============================================================================

// Get all bookings with enhanced filtering - all authenticated users can read with appropriate filtering
router.get('/', getBookings);

// Get booking by ID with full details - all authenticated users can read with appropriate filtering  
router.get('/:id', getBookingById);

// Get booking audit history - restricted to managers and above
router.get('/:id/audit', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER, RoleName.TEAM_LEAD]), 
  getBookingAuditLog
);

// Add remarks to bookings - managers, team leads, and advisors (for their own bookings) can add remarks
router.post('/:id/remarks', 
  authorize([RoleName.ADMIN, RoleName.SALES_MANAGER, RoleName.SALES_MANAGER, RoleName.TEAM_LEAD, RoleName.CUSTOMER_ADVISOR]),
  enforceAdvisorBookingAccess,
  addBookingRemark
);

// Update booking - Team Lead, Manager, Admin, and Advisor (for their own bookings)
router.put('/:id', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER, RoleName.TEAM_LEAD, RoleName.CUSTOMER_ADVISOR]), 
  enforceAdvisorBookingAccess,
  enforceFieldPermissions,
  updateBooking
);

// Delete booking - Admin only  
router.delete('/:id', 
  authorize([RoleName.ADMIN]), 
  deleteBooking
);

export default router;
