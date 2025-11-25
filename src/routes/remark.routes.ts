import { Router } from 'express';
import { 
  addEnquiryRemark,
  addBookingRemark,
  getEnquiryRemarksHistory,
  getBookingRemarksHistory,
  updateEnquiryStatusWithRemark,
  updateBookingStatusWithRemark,
  getTeamEnquiriesWithRemarks,
  getTeamBookingsWithRemarks,
  getEnquiryRemarkStats,
  getBookingRemarkStats,
  cancelRemark,
  getPendingUpdatesSummary
} from '../controllers/remark.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Cancel a remark with reason
router.post('/remarks/:remarkId/cancel', cancelRemark);

// Pending updates summary for current user
router.get('/pending/summary', getPendingUpdatesSummary);

// Enquiry remark routes
router.post('/enquiry/:enquiryId/remarks', addEnquiryRemark);
router.get('/enquiry/:enquiryId/remarks/history', getEnquiryRemarksHistory);
router.patch('/enquiry/:enquiryId/status', updateEnquiryStatusWithRemark);
router.get('/enquiry/:enquiryId/remarks/stats', getEnquiryRemarkStats);
router.get('/enquiry/team', getTeamEnquiriesWithRemarks);

// Booking remark routes
router.post('/booking/:bookingId/remarks', addBookingRemark);
router.get('/booking/:bookingId/remarks/history', getBookingRemarksHistory);
router.patch('/booking/:bookingId/status', updateBookingStatusWithRemark);
router.get('/booking/:bookingId/remarks/stats', getBookingRemarkStats);
router.get('/booking/team', getTeamBookingsWithRemarks);

export default router;
