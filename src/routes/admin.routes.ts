import { Router } from 'express';
import {
  // Dealership Management
  createDealership,
  getDealerships,
  getDealershipById,
  updateDealership,
  deleteDealership,
  
  // Vehicle Models Management
  createVehicleModel,
  getVehicleModels,
  updateVehicleModel,
  deleteVehicleModel,
  
  // Vehicle Variants Management
  createVehicleVariant,
  getVehicleVariants,
  updateVehicleVariant,
  deleteVehicleVariant,
  
  // Vehicle Colors Management
  createVehicleColor,
  getVehicleColors,
  updateVehicleColor,
  deleteVehicleColor,
  
  // Vehicle Hierarchy
  getVehicleHierarchy,
  
  // Custom Roles Management
  createCustomRole,
  getCustomRoles,
  updateCustomRole,
  deleteCustomRole,
  
  // Module Permissions Management
  setRolePermissions,
  getRolePermissions,
  
  // User Role Assignment
  assignUserRole,
  getUserRoleAssignments,
  removeUserRole
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// DEALERSHIP MANAGEMENT (Admin only)
// ============================================================================
router.post('/dealership', authorize([RoleName.ADMIN]), createDealership);
router.get('/dealerships', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), getDealerships);
router.get('/dealership/:id', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), getDealershipById);
router.put('/dealership/:id', authorize([RoleName.ADMIN]), updateDealership);
router.delete('/dealership/:id', authorize([RoleName.ADMIN]), deleteDealership);

// ============================================================================
// VEHICLE MODELS MANAGEMENT (Admin & GM)
// ============================================================================
router.post('/vehicle-models', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), createVehicleModel);
router.get('/vehicle-models', getVehicleModels); // All authenticated users can view
router.put('/vehicle-models/:id', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), updateVehicleModel);
router.delete('/vehicle-models/:id', authorize([RoleName.ADMIN]), deleteVehicleModel);

// ============================================================================
// VEHICLE VARIANTS MANAGEMENT (Admin & GM)
// ============================================================================
router.post('/vehicle-variants', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), createVehicleVariant);
router.get('/vehicle-variants', getVehicleVariants); // All authenticated users can view
router.put('/vehicle-variants/:id', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), updateVehicleVariant);
router.delete('/vehicle-variants/:id', authorize([RoleName.ADMIN]), deleteVehicleVariant);

// ============================================================================
// VEHICLE COLORS MANAGEMENT (Admin & GM)
// ============================================================================
router.post('/vehicle-colors', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), createVehicleColor);
router.get('/vehicle-colors', getVehicleColors); // All authenticated users can view
router.put('/vehicle-colors/:id', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), updateVehicleColor);
router.delete('/vehicle-colors/:id', authorize([RoleName.ADMIN]), deleteVehicleColor);

// ============================================================================
// VEHICLE HIERARCHY FOR FORMS (All authenticated users)
// ============================================================================
router.get('/vehicles/hierarchy', getVehicleHierarchy);

// ============================================================================
// CUSTOM ROLES MANAGEMENT (Admin only)
// ============================================================================
router.post('/roles', authorize([RoleName.ADMIN]), createCustomRole);
router.get('/roles', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), getCustomRoles);
router.put('/roles/:id', authorize([RoleName.ADMIN]), updateCustomRole);
router.delete('/roles/:id', authorize([RoleName.ADMIN]), deleteCustomRole);

// ============================================================================
// MODULE PERMISSIONS MANAGEMENT (Admin only)
// ============================================================================
router.post('/roles/:roleId/permissions', authorize([RoleName.ADMIN]), setRolePermissions);
router.put('/roles/:roleId/permissions', authorize([RoleName.ADMIN]), setRolePermissions); // Same as POST
router.get('/roles/:roleId/permissions', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), getRolePermissions);

// ============================================================================
// USER ROLE ASSIGNMENT (Admin & GM)
// ============================================================================
router.post('/users/:userId/assign-role', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), assignUserRole);
router.put('/users/:userId/role', authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), assignUserRole); // Same as POST
router.get('/users/:userId/role-assignments', getUserRoleAssignments); // All authenticated users can view their own
router.delete('/users/:userId/role', authorize([RoleName.ADMIN]), removeUserRole);

export default router;

