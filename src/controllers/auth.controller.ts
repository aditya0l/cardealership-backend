import { Request, Response } from 'express';
import { auth } from '../config/firebase';
import prisma from '../config/db';
import { createError, asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest, setUserClaims } from '../middlewares/auth.middleware';
import { RoleName } from '@prisma/client';
import { canPerformAction } from '../middlewares/rbac.middleware';
import { generateEmployeeId } from '../utils/employee-id-generator';

interface CreateUserWithCredentialsRequest {
  name: string;
  email: string;
  password: string;
  roleName: RoleName;
}

interface CreateUserRequest {
  firebaseUid: string;
  name: string;
  email: string;
  roleName: RoleName;
}

interface SyncUserRequest {
  name: string;
  email: string;
  roleName: RoleName;
}

interface UpdateUserRoleRequest {
  roleName: RoleName;
}

interface LoginRequest {
  email: string;
  password: string;
}

// Sync user from Firebase Auth to our database
export const syncUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, roleName }: SyncUserRequest = req.body;
  const firebaseUid = req.user.firebaseUid;

  // Validate input
  if (!name || !email || !roleName) {
    throw createError('Name, email, and role are required', 400);
  }

  // Get role
  const role = await prisma.role.findUnique({
    where: { name: roleName }
  });

  if (!role) {
    throw createError('Invalid role specified', 400);
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { firebaseUid }
  });

  if (existingUser) {
    // Update existing user
    const user = await prisma.user.update({
      where: { firebaseUid },
      data: {
        name,
        email,
        roleId: role.id
      },
      include: {
        role: true
      }
    });

    // Set custom claims in Firebase
    await setUserClaims(firebaseUid, {
      role: role.name,
      roleId: role.id
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } else {
    // Create new user
    const user = await prisma.user.create({
      data: {
        firebaseUid,
        name,
        email,
        roleId: role.id
      },
      include: {
        role: true
      }
    });

    // Set custom claims in Firebase
    await setUserClaims(firebaseUid, {
      role: role.name,
      roleId: role.id
    });

    res.status(201).json({
      success: true,
      message: 'User synced successfully',
      data: { user }
    });
  }
});

// Admin endpoint to create user with credentials
export const createUserWithCredentials = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, roleName }: CreateUserWithCredentialsRequest = req.body;

  // Check if requesting user has permission to create users
  if (!canPerformAction(req.user.role.name, 'create', 'user')) {
    throw createError('Insufficient permissions to create users', 403);
  }

  // Validate input
  if (!name || !email || !password || !roleName) {
    throw createError('Name, email, password, and role are required', 400);
  }

  // Validate password strength
  if (password.length < 8) {
    throw createError('Password must be at least 8 characters long', 400);
  }

  // Get role
  const role = await prisma.role.findUnique({
    where: { name: roleName }
  });

  if (!role) {
    throw createError('Invalid role specified', 400);
  }

  // Check if user already exists by email
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw createError('User with this email already exists', 409);
  }

  try {
    // Create Firebase user with email and password
    const firebaseUser = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true, // Auto-verify for admin-created accounts
      disabled: false
    });

    // Generate custom employee ID based on role
    const employeeId = await generateEmployeeId(roleName);

    // MULTI-TENANT: Auto-assign creator's dealership
    const creatorDealershipId = req.user.dealershipId;
    if (!creatorDealershipId) {
      throw createError('Creator must be assigned to a dealership to create users', 403);
    }

    // Create user in our database
    const user = await prisma.user.create({
      data: {
        firebaseUid: firebaseUser.uid,
        employeeId,
        name,
        email,
        roleId: role.id,
        dealershipId: creatorDealershipId, // 🆕 AUTO-ASSIGN creator's dealership
        isActive: true
      },
      include: {
        role: true
      }
    });

    // Set custom claims in Firebase
    await setUserClaims(firebaseUser.uid, {
      role: role.name,
      roleId: role.id
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully with credentials',
      data: { 
        user: {
          firebaseUid: user.firebaseUid,
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        temporaryPassword: password // Return for admin to share securely
      }
    });

  } catch (firebaseError: any) {
    console.error('Firebase user creation error:', firebaseError);
    
    // Handle Firebase-specific errors
    if (firebaseError.code === 'auth/email-already-exists') {
      throw createError('Email already exists in Firebase', 409);
    } else if (firebaseError.code === 'auth/invalid-email') {
      throw createError('Invalid email format', 400);
    } else if (firebaseError.code === 'auth/weak-password') {
      throw createError('Password is too weak', 400);
    }
    
    throw createError('Failed to create user account', 500);
  }
});

// Admin endpoint to create user in Firebase and our database
export const createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { firebaseUid, name, email, roleName }: CreateUserRequest = req.body;

  // Validate input
  if (!firebaseUid || !name || !email || !roleName) {
    throw createError('All fields are required', 400);
  }

  // Get role
  const role = await prisma.role.findUnique({
    where: { name: roleName }
  });

  if (!role) {
    throw createError('Invalid role specified', 400);
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { firebaseUid }
  });

  if (existingUser) {
    throw createError('User already exists in system', 409);
  }

  // Verify Firebase user exists
  try {
    await auth.getUser(firebaseUid);
  } catch (error) {
    throw createError('Firebase user not found', 404);
  }

  // MULTI-TENANT: Auto-assign creator's dealership
  const creatorDealershipId = req.user.dealershipId;
  if (!creatorDealershipId) {
    throw createError('Creator must be assigned to a dealership to create users', 403);
  }

  // Create user in our database
  const user = await prisma.user.create({
    data: {
      firebaseUid,
      name,
      email,
      roleId: role.id,
      dealershipId: creatorDealershipId // 🆕 AUTO-ASSIGN creator's dealership
    },
    include: {
      role: true
    }
  });

  // Set custom claims in Firebase
  await setUserClaims(firebaseUid, {
    role: role.name,
    roleId: role.id
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user }
  });
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Fetch full user data from database including dealership
  const user = await prisma.user.findUnique({
    where: { firebaseUid: req.user.firebaseUid },
    include: {
      role: true,
      dealership: true // Include dealership relation
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    message: 'Profile retrieved successfully',
    data: { 
      user: {
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        role: {
          id: user.role.id,
          name: user.role.name
        },
        dealershipId: user.dealershipId,
        dealership: user.dealership, // Now included!
        isActive: user.isActive,
        employeeId: user.employeeId
      }
    }
  });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { firebaseUid } = req.params;
  const { roleName }: UpdateUserRoleRequest = req.body;

  if (!roleName) {
    throw createError('Role name is required', 400);
  }

  // Get role
  const role = await prisma.role.findUnique({
    where: { name: roleName }
  });

  if (!role) {
    throw createError('Invalid role specified', 400);
  }

  // Generate new employee ID to match the new role
  const newEmployeeId = await generateEmployeeId(roleName);

  // Update user in database with new role AND employee ID
  const user = await prisma.user.update({
    where: { firebaseUid },
    data: { 
      roleId: role.id,
      employeeId: newEmployeeId // Update employee ID to match role
    },
    include: { role: true }
  });

  // Update custom claims in Firebase
  await setUserClaims(firebaseUid, {
    role: role.name,
    roleId: role.id
  });

  res.json({
    success: true,
    message: 'User role updated successfully',
    data: { user }
  });
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const { firebaseUid } = req.params;

  // Deactivate in our database
  const user = await prisma.user.update({
    where: { firebaseUid },
    data: { isActive: false },
    include: { role: true }
  });

  // Disable Firebase user
  await auth.updateUser(firebaseUid, {
    disabled: true
  });

  res.json({
    success: true,
    message: 'User deactivated successfully',
    data: { user }
  });
});

export const activateUser = asyncHandler(async (req: Request, res: Response) => {
  const { firebaseUid } = req.params;

  // Activate in our database
  const user = await prisma.user.update({
    where: { firebaseUid },
    data: { isActive: true },
    include: { role: true }
  });

  // Enable Firebase user
  await auth.updateUser(firebaseUid, {
    disabled: false
  });

  res.json({
    success: true,
    message: 'User activated successfully',
    data: { user }
  });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { firebaseUid } = req.params;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    include: { role: true }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  // Delete from database first
  await prisma.user.delete({
    where: { firebaseUid }
  });

  // Then delete from Firebase
  try {
    await auth.deleteUser(firebaseUid);
  } catch (firebaseError) {
    console.warn('Failed to delete from Firebase (user might not exist):', firebaseError);
    // Continue - database deletion is more important
  }

  res.json({
    success: true,
    message: 'User deleted successfully',
    data: {
      deletedUser: {
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name
      }
    }
  });
});

export const resetUserPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { firebaseUid } = req.params;
  const { newPassword }: { newPassword: string } = req.body;

  // Check permissions
  if (!canPerformAction(req.user.role.name, 'update', 'user')) {
    throw createError('Insufficient permissions to reset password', 403);
  }

  // Validate input
  if (!newPassword || newPassword.length < 8) {
    throw createError('Password must be at least 8 characters long', 400);
  }

  try {
    // Update password in Firebase
    await auth.updateUser(firebaseUid, {
      password: newPassword
    });

    // Get user details for response
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      include: { role: true }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        user: {
          firebaseUid: user.firebaseUid,
          name: user.name,
          email: user.email,
          role: user.role
        },
        newPassword // Return for admin to share securely
      }
    });

  } catch (firebaseError: any) {
    console.error('Password reset error:', firebaseError);
    
    if (firebaseError.code === 'auth/user-not-found') {
      throw createError('Firebase user not found', 404);
    } else if (firebaseError.code === 'auth/weak-password') {
      throw createError('Password is too weak', 400);
    }
    
    throw createError('Failed to reset password', 500);
  }
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      include: {
        role: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count()
  ]);

  res.json({
    success: true,
    message: 'Users retrieved successfully',
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

// Get users grouped by role for hierarchy visualization (optimized)
export const getUsersByRole = asyncHandler(async (req: Request, res: Response) => {
  // Fetch all active users with manager relationships
  const users = await prisma.user.findMany({
    where: {
      isActive: true
    },
    include: {
      role: true,
      manager: {
        select: {
          firebaseUid: true,
          name: true,
          email: true
        }
      },
      subordinates: {
        select: {
          firebaseUid: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: [
      { role: { name: 'asc' } },
      { name: 'asc' }
    ]
  });

  // Group users by role efficiently
  const usersByRole: Record<string, any[]> = {
    'Admin': [],
    'General Manager': [],
    'Sales Manager': [],
    'Team Lead': [],
    'Advisor': []
  };

  const roleNameMap: Record<string, string> = {
    'ADMIN': 'Admin',
    'GENERAL_MANAGER': 'General Manager',
    'SALES_MANAGER': 'Sales Manager',
    'TEAM_LEAD': 'Team Lead',
    'CUSTOMER_ADVISOR': 'Advisor'
  };

  users.forEach(user => {
    const employeeRole = roleNameMap[user.role.name] || 'Advisor';
    usersByRole[employeeRole].push({
      id: user.firebaseUid,
      employeeId: user.employeeId || 'Pending', // Show custom employee ID
      name: user.name,
      email: user.email,
      phone: '', // Not stored in current schema
      role: employeeRole,
      department: user.role.name === 'ADMIN' ? 'Administration' : 'Sales',
      managerId: user.managerId || undefined,
      managerName: user.manager?.name || undefined,
      subordinateCount: user.subordinates?.length || 0,
      hireDate: user.createdAt,
      status: user.isActive ? 'active' : 'inactive'
    });
  });

  res.json({
    success: true,
    message: 'Users grouped by role retrieved successfully',
    data: usersByRole
  });
});

// Assign manager to user (Admin only)
export const assignManager = asyncHandler(async (req: Request, res: Response) => {
  const { firebaseUid } = req.params;
  const { managerId } = req.body;

  // Validate user exists
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    include: { role: true }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  // If managerId provided, validate manager exists
  if (managerId) {
    const manager = await prisma.user.findUnique({
      where: { firebaseUid: managerId },
      include: { role: true }
    });

    if (!manager) {
      throw createError('Manager not found', 404);
    }

    // Validate hierarchy logic: Manager role should be senior to user role
    const roleHierarchy: Record<string, number> = {
      'ADMIN': 5,
      'GENERAL_MANAGER': 4,
      'SALES_MANAGER': 3,
      'TEAM_LEAD': 2,
      'CUSTOMER_ADVISOR': 1
    };

    const managerLevel = roleHierarchy[manager.role.name] || 0;
    const userLevel = roleHierarchy[user.role.name] || 0;

    if (managerLevel <= userLevel) {
      throw createError('Manager must have a senior role to the user', 400);
    }

    // Prevent circular references
    if (managerId === firebaseUid) {
      throw createError('User cannot be their own manager', 400);
    }

    // Check if this would create a circular chain
    let currentManager = manager;
    while (currentManager.managerId) {
      if (currentManager.managerId === firebaseUid) {
        throw createError('This would create a circular reporting chain', 400);
      }
      const nextManager = await prisma.user.findUnique({
        where: { firebaseUid: currentManager.managerId }
      });
      if (!nextManager) break;
      currentManager = nextManager as any;
    }
  }

  // Update user's manager
  const updatedUser = await prisma.user.update({
    where: { firebaseUid },
    data: { managerId: managerId || null },
    include: {
      role: true,
      manager: {
        select: {
          firebaseUid: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  res.json({
    success: true,
    message: managerId 
      ? `Manager assigned successfully: ${updatedUser.manager?.name}`
      : 'Manager removed successfully',
    data: { user: updatedUser }
  });
});

// Login endpoint - authenticate user with email/password
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password }: LoginRequest = req.body;

  // Validate input
  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }

  try {
    // First, find the user in our database
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw createError('Account is deactivated. Please contact administrator.', 401);
    }

    // For now, we'll use a simplified approach for development
    // In production, you should implement proper password verification
    
    // Verify user exists in Firebase
    try {
      const firebaseUser = await auth.getUser(user.firebaseUid);
      
      // For development, we'll accept the known test passwords
      const validPasswords = {
        'admin@cardealership.com': 'Admin123!',
        'gm@cardealership.com': 'GeneralManager123!',
        'sm@cardealership.com': 'SalesManager123!',
        'tl@cardealership.com': 'TeamLead123!',
        'advisor@cardealership.com': 'Advisor123!',
        'admin.new@test.com': 'testpassword123',
        'advisor.new@test.com': 'testpassword123'
      };

      if (validPasswords[email as keyof typeof validPasswords] !== password) {
        throw createError('Invalid email or password', 401);
      }

      // Create custom token with user claims
      const customToken = await auth.createCustomToken(user.firebaseUid, {
        role: user.role.name,
        userId: user.firebaseUid,
        email: user.email
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token: customToken,
          user: {
            firebaseUid: user.firebaseUid,
            email: user.email,
            name: user.name,
            role: {
              id: user.role.id,
              name: user.role.name
            }
          },
          tokenType: 'custom',
          note: 'Use this token as Bearer token in Authorization header'
        }
      });

    } catch (firebaseError) {
      console.error('Firebase error during login:', firebaseError);
      throw createError('Authentication failed. Please contact administrator.', 401);
    }

  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      throw error; // Re-throw custom errors
    }
    console.error('Login error:', error);
    throw createError('Login failed. Please try again.', 500);
  }
});

// Sync Firebase users to database (Admin only)
export const syncFirebaseUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔄 Starting Firebase users sync...');
    
    const results = {
      created: [] as string[],
      updated: [] as string[],
      skipped: [] as string[],
      errors: [] as { email: string; error: string }[]
    };

    // Get all users from Firebase
    const listUsersResult = await auth.listUsers(1000); // Max 1000 users
    console.log(`📋 Found ${listUsersResult.users.length} users in Firebase`);

    for (const firebaseUser of listUsersResult.users) {
      try {
        const { uid, email, displayName } = firebaseUser;
        
        if (!email) {
          results.skipped.push(uid);
          continue;
        }

        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { firebaseUid: uid },
          include: { role: true }
        });

        // Determine role from custom claims or default to ADMIN
        let roleName: RoleName = RoleName.ADMIN;
        if (firebaseUser.customClaims?.role) {
          roleName = firebaseUser.customClaims.role as RoleName;
        }

        const role = await prisma.role.findFirst({
          where: { name: roleName }
        });

        if (!role) {
          results.errors.push({ 
            email, 
            error: `Role ${roleName} not found in database` 
          });
          continue;
        }

        if (existingUser) {
          // Update existing user
          await prisma.user.update({
            where: { firebaseUid: uid },
            data: {
              email,
              name: displayName || existingUser.name,
              roleId: role.id
            }
          });
          results.updated.push(email);
          console.log(`✅ Updated user: ${email}`);
        } else {
          // Create new user
          await prisma.user.create({
            data: {
              firebaseUid: uid,
              email,
              name: displayName || email.split('@')[0],
              roleId: role.id,
              isActive: true
            }
          });
          results.created.push(email);
          console.log(`✅ Created user: ${email}`);
        }
      } catch (userError) {
        const errorMessage = userError instanceof Error ? userError.message : 'Unknown error';
        results.errors.push({ 
          email: firebaseUser.email || firebaseUser.uid, 
          error: errorMessage 
        });
        console.error(`❌ Error syncing user ${firebaseUser.email}:`, errorMessage);
      }
    }

    res.json({
      success: true,
      message: 'Firebase users sync completed',
      data: {
        summary: {
          total: listUsersResult.users.length,
          created: results.created.length,
          updated: results.updated.length,
          skipped: results.skipped.length,
          errors: results.errors.length
        },
        results
      }
    });

  } catch (error) {
    console.error('Firebase sync error:', error);
    throw createError('Failed to sync Firebase users', 500);
  }
});
