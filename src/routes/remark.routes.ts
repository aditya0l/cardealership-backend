import { Router } from 'express';
import { 
  addRemark, 
  getRemarksHistory, 
  updateStatusWithRemark, 
  getTeamEntitiesWithRemarks,
  getRemarkStats,
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

// Get remarks history for enquiry or booking
router.get('/:entityType/:entityId/remarks/history', getRemarksHistory);

// Add remark to enquiry or booking
router.post('/:entityType/:entityId/remarks', addRemark);

// Update status with remark
router.patch('/:entityType/:entityId/status', updateStatusWithRemark);

// Get team entities with remarks (for TL and above)
router.get('/:entityType/team', getTeamEntitiesWithRemarks);

// Get remark statistics
router.get('/:entityType/:entityId/remarks/stats', getRemarkStats);

export default router;
