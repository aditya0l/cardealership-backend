import { Router } from 'express';
import { uploadQuotationImportFile } from '../controllers/quotation-import.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =============================================================================
// ADMIN ROUTES - Quotation Import
// =============================================================================

// Upload and process quotation CSV/Excel file (Admin only)
router.post('/upload',
  authorize([RoleName.ADMIN]),
  uploadQuotationImportFile
);

export default router;

