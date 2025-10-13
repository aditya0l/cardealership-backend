import { Router } from 'express';
import {
  createDealership,
  getAllDealerships,
  getDealershipById,
  updateDealership,
  completeOnboarding,
  getDealershipCatalog,
  deactivateDealership,
  activateDealership
} from '../controllers/dealership.controller';
import {
  addVehicleToCatalog,
  getDealershipBrands,
  getDealershipModels,
  getModelVariants,
  updateCatalog,
  deleteCatalog,
  getCompleteCatalog
} from '../controllers/catalog.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dealership management
router.post('/', createDealership);
router.get('/', getAllDealerships);
router.get('/:id', getDealershipById);
router.patch('/:id', updateDealership);
router.post('/:id/complete-onboarding', completeOnboarding);
router.post('/:id/deactivate', deactivateDealership);
router.post('/:id/activate', activateDealership);

// Catalog management
router.get('/:id/catalog', getDealershipCatalog);
router.post('/:dealershipId/catalog', addVehicleToCatalog);
router.get('/:dealershipId/catalog/brands', getDealershipBrands);
router.get('/:dealershipId/catalog/models', getDealershipModels);
router.get('/:dealershipId/catalog/:catalogId/variants', getModelVariants);
router.patch('/:dealershipId/catalog/:catalogId', updateCatalog);
router.delete('/:dealershipId/catalog/:catalogId', deleteCatalog);
router.get('/:dealershipId/catalog/complete', getCompleteCatalog);

export default router;

