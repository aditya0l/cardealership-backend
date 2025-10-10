import { Router } from 'express';
import {
  syncUser,
  createUser,
  createUserWithCredentials,
  getProfile,
  updateUserRole,
  deactivateUser,
  activateUser,
  resetUserPassword,
  getAllUsers,
  getUsersByRole,
  assignManager,
  login
} from '../controllers/auth.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';

const router = Router();

// TEST ROUTE - For development only (remove in production)
router.post('/test-user', async (req, res): Promise<void> => {
  try {
    const { name, email, roleName } = req.body;
    
    // Create a test Firebase user
    const firebaseUser = await require('../config/firebase').auth.createUser({
      email: email,
      password: 'testpassword123',
      displayName: name
    });
    
    // Get role
    const role = await require('../config/db').default.role.findUnique({
      where: { name: roleName }
    });
    
    if (!role) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }
    
    // Create user in database
    const user = await require('../config/db').default.user.create({
      data: {
        firebaseUid: firebaseUser.uid,
        name,
        email,
        roleId: role.id
      },
      include: { role: true }
    });
    
    // Generate custom token for testing
    const customToken = await require('../config/firebase').auth.createCustomToken(firebaseUser.uid);
    
    res.json({
      success: true,
      message: 'Test user created successfully',
      data: { 
        user,
        firebaseUid: firebaseUser.uid,
        customToken: customToken,
        testPassword: 'testpassword123'
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ success: false, message: errorMessage });
  }
});

// Public routes - no authentication required
router.post('/login', login); // User login with email/password

// Protected routes - require Firebase authentication
router.post('/sync', authenticate, syncUser); // Sync Firebase user to our database
router.get('/profile', authenticate, getProfile); // Get current user profile

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

export default router;
