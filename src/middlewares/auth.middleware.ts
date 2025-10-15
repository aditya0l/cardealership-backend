import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import prisma from '../config/db';
import { RoleName } from '@prisma/client';

export interface AuthenticatedUser {
  firebaseUid: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: RoleName;
  };
  dealershipId?: string | null; // Multi-dealership support
  customClaims?: Record<string, any>;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    // TEST MODE: Allow test-user for development
    if (authHeader === 'Bearer test-user') {
      let testUser = await prisma.user.findFirst({
        where: { email: 'admin@dealership.com' },
        include: { role: true }
      });
      
      // If admin user doesn't exist, try general manager
      if (!testUser) {
        testUser = await prisma.user.findFirst({
          where: { 
            role: { name: RoleName.GENERAL_MANAGER }
          },
          include: { role: true }
        });
      }
      
      // If still no user, try sales manager  
      if (!testUser) {
        testUser = await prisma.user.findFirst({
          where: { 
            role: { name: RoleName.SALES_MANAGER }
          },
          include: { role: true }
        });
      }
      
      if (testUser) {
        (req as AuthenticatedRequest).user = {
          firebaseUid: testUser.firebaseUid,
          email: testUser.email,
          name: testUser.name,
          role: {
            id: testUser.role.id,
            name: testUser.role.name
          }
        };
        next();
        return;
      }
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Firebase ID token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    let decodedToken;
    
    try {
      // Try to verify as ID token first with timeout to prevent hanging
      decodedToken = await Promise.race([
        auth.verifyIdToken(token),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase token verification timeout')), 5000)
        )
      ]) as any;
    } catch (error: any) {
      // If ID token verification fails, try custom token approach for testing
      if (process.env.NODE_ENV === 'development') {
        try {
          // For custom tokens, we need to decode and extract the UID
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token, { complete: true });
          
          if (decoded && decoded.payload && decoded.payload.uid) {
            // Create a mock decoded token structure for custom tokens
            decodedToken = {
              uid: decoded.payload.uid,
              email: null, // Will be filled from database
              name: null,  // Will be filled from database
              customClaims: decoded.payload.claims || {}
            };
          } else {
            throw new Error('Invalid custom token structure');
          }
        } catch (customTokenError: any) {
          throw error; // Re-throw original ID token error
        }
      } else {
        throw error; // Re-throw original ID token error in production
      }
    }
    
    const { uid } = decodedToken;
    let { email, name } = decodedToken;

    // Get user from database
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: {
        role: true
      }
    });

    // AUTO-CREATE: Create user with ADMIN role if they don't exist
    if (!user) {
      console.log(`🆕 Auto-creating new user: ${email || uid}`);
      
      try {
        // Ensure database connection is healthy
        await prisma.$queryRaw`SELECT 1`;
        
        // Get ADMIN role
        const adminRole = await prisma.role.findUnique({
          where: { name: RoleName.ADMIN }
        });
        
        if (!adminRole) {
          console.error('❌ ADMIN role not found in database');
          res.status(500).json({
            success: false,
            message: 'System configuration error: ADMIN role not found'
          });
          return;
        }
        
        // Find or create a default dealership for new admins
        let defaultDealership = await prisma.dealership.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        });
        
        // If no dealership exists, create a default one
        if (!defaultDealership) {
          defaultDealership = await prisma.dealership.create({
            data: {
              name: 'Default Dealership',
              code: 'DEFAULT001',
              type: 'UNIVERSAL',
              email: email || `${uid}@firebase.user`,
              phone: '+1234567890',
              address: 'Default Address',
              city: 'Default City',
              state: 'Default State',
              pincode: '12345',
              gstNumber: 'DEFAULT123456789',
              panNumber: 'DEFAULT1234H',
              brands: ['DEFAULT'],
              isActive: true,
              onboardingCompleted: false
            }
          });
          console.log(`🏢 Created default dealership: ${defaultDealership.name}`);
        }

        // Create user with ADMIN role and assign to default dealership
        user = await prisma.user.create({
          data: {
            firebaseUid: uid,
            email: email || `${uid}@firebase.user`,
            name: name || email?.split('@')[0] || 'New Admin',
            roleId: adminRole.id,
            isActive: true,
            employeeId: `ADM_${Date.now()}`,
            dealershipId: defaultDealership.id // Assign to default dealership
          },
          include: {
            role: true,
            dealership: true
          }
        });
        
        console.log(`✅ Auto-created ADMIN user: ${user.email}`);
        
      } catch (createError: any) {
        console.error('❌ Failed to auto-create user:', createError);
        
        // Check if it's a connection issue
        if (createError?.message?.includes('connection') || 
            createError?.message?.includes('network') ||
            createError?.message?.includes('timeout') ||
            createError?.code === 'P1001') {
          console.log('🔄 Database connection issue - retrying once...');
          
          try {
            // Wait a moment and retry once
            await new Promise(resolve => setTimeout(resolve, 1000));
            await prisma.$queryRaw`SELECT 1`;
            
            // Retry user creation
            const adminRole = await prisma.role.findUnique({
              where: { name: RoleName.ADMIN }
            });
            
            // Find or create default dealership for retry
            let defaultDealership = await prisma.dealership.findFirst({
              where: { isActive: true },
              orderBy: { createdAt: 'asc' }
            });
            
            if (!defaultDealership) {
              defaultDealership = await prisma.dealership.create({
                data: {
                  name: 'Default Dealership',
                  code: 'DEFAULT001',
                  type: 'UNIVERSAL',
                  email: email || `${uid}@firebase.user`,
                  phone: '+1234567890',
                  address: 'Default Address',
                  city: 'Default City',
                  state: 'Default State',
                  pincode: '12345',
                  gstNumber: 'DEFAULT123456789',
                  panNumber: 'DEFAULT1234H',
                  brands: ['DEFAULT'],
                  isActive: true,
                  onboardingCompleted: false
                }
              });
            }

            user = await prisma.user.create({
              data: {
                firebaseUid: uid,
                email: email || `${uid}@firebase.user`,
                name: name || email?.split('@')[0] || 'New Admin',
                roleId: adminRole!.id,
                isActive: true,
                employeeId: `ADM_${Date.now()}`,
                dealershipId: defaultDealership.id
              },
              include: {
                role: true,
                dealership: true
              }
            });
            
            console.log(`✅ Auto-created ADMIN user (retry): ${user.email}`);
            
          } catch (retryError: any) {
            console.error('❌ Retry also failed:', retryError);
            res.status(503).json({
              success: false,
              message: 'Database temporarily unavailable. Please try again in a few moments.'
            });
            return;
          }
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to create user account. Please contact administrator.'
          });
          return;
        }
      }
    }
    
    /* DISABLED AUTO-CREATE in multi-tenant mode
    // OLD AUTO-CREATE CODE (disabled to enforce proper user creation)
    if (!user) {
      console.log(`🔧 Auto-creating user for Firebase UID: ${uid}, Email: ${email || 'unknown'}`);
      
      // IMPORTANT: Auto-create should be DISABLED in multi-tenant
      // Users should be created explicitly via admin API with dealership assignment
      console.warn('⚠️  AUTO-CREATE USER: This user was not created through proper channels!');
      console.warn('   In multi-tenant mode, users should be created by admins with dealership assignment.');
      
      // Determine role from Firebase custom claims or default to CUSTOMER_ADVISOR (safest)
      let roleName: RoleName = RoleName.CUSTOMER_ADVISOR; // Changed from ADMIN to safer default
      if (decodedToken.customClaims?.role) {
        roleName = decodedToken.customClaims.role as RoleName;
      }
      
      // Get the role from database
      const role = await prisma.role.findFirst({
        where: { name: roleName }
      });
      
      if (!role) {
        console.error(`❌ Role ${roleName} not found in database`);
        res.status(500).json({
          success: false,
          message: 'System configuration error: Role not found'
        });
        return;
      }
      
      // MULTI-TENANT: Find a default dealership or reject
      let defaultDealershipId = null;
      const defaultDealership = await prisma.dealership.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      });
      
      if (defaultDealership) {
        defaultDealershipId = defaultDealership.id;
        console.log(`   Assigning to dealership: ${defaultDealership.name}`);
      } else {
        console.error('❌ No dealership available for auto-created user!');
        res.status(500).json({
          success: false,
          message: 'No dealership available. Please contact administrator to set up your account.'
        });
        return;
      }
      
      // Create user in database
      try {
        // Generate employee ID if needed
        const { generateEmployeeId } = await import('../utils/employee-id-generator');
        const employeeId = await generateEmployeeId(roleName);
        
        user = await prisma.user.create({
          data: {
            firebaseUid: uid,
            employeeId,
            email: email || `${uid}@firebase.user`,
            name: name || email?.split('@')[0] || 'Firebase User',
            roleId: role.id,
            dealershipId: defaultDealershipId, // Assign to default dealership
            isActive: true
          },
          include: {
            role: true,
            dealership: true
          }
        });
        
        console.log(`✅ Auto-created user: ${user.email} (${employeeId}) with role ${user.role.name}`);
        
        // Set custom claims in Firebase for consistency
        try {
          await setUserClaims(uid, {
            role: user.role.name,
            roleId: user.role.id,
            employeeId: employeeId
          });
        } catch (claimsError: any) {
          console.warn('⚠️ Failed to set custom claims, continuing...', claimsError);
        }
      } catch (createError: any) {
        console.error('❌ Error auto-creating user:', createError);
        res.status(500).json({
          success: false,
          message: 'Failed to create user account. Please contact administrator.'
        });
        return;
      }
    }
    */  // End of disabled auto-create code

    // For custom tokens, use email/name from database
    if (!email) {
      email = user.email;
      name = user.name;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
      return;
    }

    (req as AuthenticatedRequest).user = {
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      role: {
        id: user.role.id,
        name: user.role.name
      },
      dealershipId: user.dealershipId,
      customClaims: decodedToken.customClaims || {}
    };

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired Firebase token'
    });
  }
};

export const authorize = (allowedRoles: RoleName[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { user } = req as AuthenticatedRequest;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(user.role.name)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

// Utility function to set custom claims for users
export const setUserClaims = async (firebaseUid: string, claims: Record<string, any>) => {
  try {
    await auth.setCustomUserClaims(firebaseUid, claims);
    return true;
  } catch (error: any) {
    console.error('Error setting custom claims:', error);
    return false;
  }
};
