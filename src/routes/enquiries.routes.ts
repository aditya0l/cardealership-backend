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
  getEnquiryStats,
  getEnquiriesWithRemarks,
  bulkDownloadEnquiries,
  getEnquiryStatusSummary
} from '../controllers/enquiries.controller';
import {
  uploadEnquiryImportFile,
  previewEnquiryImportFile,
  getEnquiryImports,
  getEnquiryImportById,
  downloadEnquiryImportErrors
} from '../controllers/enquiry-import.controller';
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

// Get enquiries with remarks history - All authenticated users can view
router.get('/with-remarks', getEnquiriesWithRemarks);

// Bulk download enquiries - Admin and Manager only
router.get('/download', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER]), 
  bulkDownloadEnquiries
);

// Enquiry import endpoints
router.post('/imports/upload',
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]),
  uploadEnquiryImportFile
);

router.post('/imports/preview',
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]),
  previewEnquiryImportFile
);

router.get('/imports',
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]),
  getEnquiryImports
);

router.get('/imports/:id',
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]),
  getEnquiryImportById
);

router.get('/imports/:id/errors',
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]),
  downloadEnquiryImportErrors
);

// Get enquiry status summary - Manager and Admin only
router.get('/status-summary', 
  authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER]), 
  getEnquiryStatusSummary
);

// Get enquiry by ID - All authenticated users can view
router.get('/:id', getEnquiryById);

// Update enquiry - Customer Advisor (own enquiries), Team Lead, Manager, Admin
router.put('/:id', authorize([RoleName.CUSTOMER_ADVISOR, RoleName.TEAM_LEAD, RoleName.GENERAL_MANAGER, RoleName.ADMIN]), updateEnquiry);

// Delete enquiry - General Manager, Admin only
router.delete('/:id', authorize([RoleName.GENERAL_MANAGER, RoleName.ADMIN]), deleteEnquiry);

export default router;
