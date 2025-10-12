import { Router } from 'express';
import {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getStockStats
} from '../controllers/stock.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get stock statistics - All authenticated users can view
router.get('/stats', getStockStats);

// Create vehicle - General Manager, Sales Manager, Admin only
router.post('/', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER]), createVehicle);

// Get all vehicles - All authenticated users can view
router.get('/', getVehicles);

// Get vehicle by ID - All authenticated users can view
router.get('/:id', getVehicleById);

// Update vehicle - General Manager, Sales Manager, Admin only
router.put('/:id', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER]), updateVehicle);

// Delete vehicle - Admin only
router.delete('/:id', authorize([RoleName.ADMIN]), deleteVehicle);

export default router;
