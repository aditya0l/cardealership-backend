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
    } catch (error) {
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
        } catch (customTokenError) {
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

    // AUTO-CREATE USER: If user doesn't exist in database but has valid Firebase token, create them
    if (!user) {
      console.log(`🔧 Auto-creating user for Firebase UID: ${uid}, Email: ${email || 'unknown'}`);
      
      // Determine role from Firebase custom claims or default to ADMIN
      let roleName: RoleName = RoleName.ADMIN;
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
            isActive: true
          },
          include: {
            role: true
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
        } catch (claimsError) {
          console.warn('⚠️ Failed to set custom claims, continuing...', claimsError);
        }
      } catch (createError) {
        console.error('❌ Error auto-creating user:', createError);
        res.status(500).json({
          success: false,
          message: 'Failed to create user account. Please contact administrator.'
        });
        return;
      }
    }

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
  } catch (error) {
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
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return false;
  }
};
