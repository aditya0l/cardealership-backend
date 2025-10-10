import { Router } from 'express';
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  getQuotationStats
} from '../controllers/quotations.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Stats endpoint - Manager and Admin only
router.get('/stats', authorize([RoleName.SALES_MANAGER, RoleName.GENERAL_MANAGER, RoleName.ADMIN]), getQuotationStats);

// Create quotation - Team Lead, General Manager, Admin
router.post('/', authorize([RoleName.TEAM_LEAD, RoleName.GENERAL_MANAGER, RoleName.ADMIN]), createQuotation);

// Get all quotations - All authenticated users can view
router.get('/', getQuotations);

// Get quotation by ID - All authenticated users can view
router.get('/:id', getQuotationById);

// Update quotation - Team Lead, General Manager, Admin
router.put('/:id', authorize([RoleName.TEAM_LEAD, RoleName.GENERAL_MANAGER, RoleName.ADMIN]), updateQuotation);

// Delete quotation - General Manager, Admin only
router.delete('/:id', authorize([RoleName.GENERAL_MANAGER, RoleName.ADMIN]), deleteQuotation);

export default router;
