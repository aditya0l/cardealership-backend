import { Router } from 'express';
import {
  createModel,
  getModels,
  getModelById,
  updateModel,
  deleteModel
} from '../controllers/model.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Model management endpoints
router.post('/', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), createModel);
router.get('/', getModels); // All authenticated users can view models
router.get('/:id', getModelById);
router.put('/:id', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), updateModel);
router.delete('/:id', authorize([RoleName.ADMIN]), deleteModel);

export default router;

