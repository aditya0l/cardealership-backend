import { Router } from 'express';
import {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  deleteEnquiry,
  getAvailableModels,
  getAvailableVariants,
  getAvailableColors,
  getEnquirySources,
  getEnquiryStats
} from '../controllers/enquiries.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dropdown data endpoints - All authenticated users can access
router.get('/models', getAvailableModels);
router.get('/variants', getAvailableVariants);
router.get('/colors', getAvailableColors);
router.get('/sources', getEnquirySources);

// Stats endpoint - Manager and Admin only
router.get('/stats', authorize([RoleName.SALES_MANAGER, RoleName.GENERAL_MANAGER, RoleName.ADMIN]), getEnquiryStats);

// Create enquiry - All authenticated users can create
router.post('/', createEnquiry);

// Get all enquiries - All authenticated users can view
router.get('/', getEnquiries);

// Get enquiry by ID - All authenticated users can view
router.get('/:id', getEnquiryById);

// Update enquiry - Customer Advisor (own enquiries), Team Lead, Manager, Admin
router.put('/:id', authorize([RoleName.CUSTOMER_ADVISOR, RoleName.TEAM_LEAD, RoleName.GENERAL_MANAGER, RoleName.ADMIN]), updateEnquiry);

// Delete enquiry - General Manager, Admin only
router.delete('/:id', authorize([RoleName.GENERAL_MANAGER, RoleName.ADMIN]), deleteEnquiry);

export default router;
