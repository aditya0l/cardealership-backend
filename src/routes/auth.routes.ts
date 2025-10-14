import { Router } from 'express';
import {
  syncUser,
  createUser,
  createUserWithCredentials,
  getProfile,
  updateUserRole,
  deactivateUser,
  activateUser,
  deleteUser,
  resetUserPassword,
  getAllUsers,
  getUsersByRole,
  assignManager,
  login,
  syncFirebaseUsers
} from '../controllers/auth.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// Public routes - no authentication required
router.post('/login', login); // User login with email/password

// Protected routes - require Firebase authentication
router.post('/sync', authenticate, syncUser); // Sync Firebase user to our database
router.get('/profile', authenticate, getProfile); // Get current user profile
router.get('/me', authenticate, getProfile); // Alias for profile (commonly used)

// Admin routes - require specific permissions
router.post('/users/create-with-credentials', authenticate, authorize([RoleName.ADMIN]), createUserWithCredentials); // Create user with email/password
router.post('/users', authenticate, authorize([RoleName.ADMIN]), createUser); // Create user in system
router.get('/users', authenticate, authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), getAllUsers); // List all users
router.get('/users/hierarchy', authenticate, authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER, RoleName.SALES_MANAGER]), getUsersByRole); // Get users grouped by role (optimized)
router.put('/users/:firebaseUid/role', authenticate, authorize([RoleName.ADMIN]), updateUserRole); // Update user role
router.put('/users/:firebaseUid/manager', authenticate, authorize([RoleName.ADMIN, RoleName.GENERAL_MANAGER]), assignManager); // Assign/remove manager
router.put('/users/:firebaseUid/password', authenticate, authorize([RoleName.ADMIN]), resetUserPassword); // Reset user password
router.put('/users/:firebaseUid/deactivate', authenticate, authorize([RoleName.ADMIN]), deactivateUser); // Deactivate user
router.put('/users/:firebaseUid/activate', authenticate, authorize([RoleName.ADMIN]), activateUser); // Activate user
router.delete('/users/:firebaseUid', authenticate, authorize([RoleName.ADMIN]), deleteUser); // Delete user

// Firebase sync route - Admin only
router.post('/sync-firebase-users', authenticate, authorize([RoleName.ADMIN]), syncFirebaseUsers); // Sync all Firebase users to database

export default router;
