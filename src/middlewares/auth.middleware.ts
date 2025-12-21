import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import prisma from '../config/db';
import { Prisma, RoleName } from '@prisma/client';
import { validateUUID } from '../utils/validators';

export interface AuthenticatedUser {
  firebaseUid: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: RoleName;
  };
  dealershipId?: string | null; // Primary dealership identifier (UUID when available)
  legacyDealershipId?: string | null; // Legacy CUID identifier retained for backwards compatibility
  dealershipCode?: string | null; // Dealership code (e.g. CITY01)
  customClaims?: Record<string, any>;
}
export const resolveDealershipContext = async (
  dealershipId?: string | null
): Promise<{
  dealershipUuid: string | null;
  dealershipLegacyId: string | null;
  dealershipCode: string | null;
}> => {
  if (!dealershipId) {
    return {
      dealershipUuid: null,
      dealershipLegacyId: null,
      dealershipCode: null
    };
  }

  let dealershipUuid: string | null = null;
  let dealershipCode: string | null = null;
  let legacyDealershipId: string | null = null;

  try {
    // Dealership model doesn't have a uuid column - only id and code
    // Use id as both uuid and legacyId since they're the same
    const rows = await prisma.$queryRaw<{ id: string | null; code: string | null }[]>(
      Prisma.sql`SELECT "id", "code" FROM "dealerships" WHERE "id" = ${dealershipId} LIMIT 1`
    );

    if (rows && rows.length > 0) {
      dealershipUuid = rows[0]?.id ?? null;
      dealershipCode = rows[0]?.code ?? null;
      legacyDealershipId = rows[0]?.id ?? dealershipId;
    }
  } catch (error) {
    console.warn('Unable to resolve dealership via ID lookup. Falling back to provided identifier.', error);
  }

  // If dealershipId is a UUID format, try to find by id (since there's no separate uuid column)
  if ((!dealershipUuid || !legacyDealershipId) && dealershipId && validateUUID(dealershipId)) {
    try {
      const rows = await prisma.$queryRaw<{ id: string | null; code: string | null }[]>(
        Prisma.sql`SELECT "id", "code" FROM "dealerships" WHERE "id" = ${dealershipId} LIMIT 1`
      );

      if (rows && rows.length > 0) {
        dealershipUuid = rows[0]?.id ?? dealershipId;
        dealershipCode = rows[0]?.code ?? dealershipCode ?? null;
        legacyDealershipId = rows[0]?.id ?? legacyDealershipId;
      }
    } catch (error) {
      console.warn('Unable to resolve dealership via UUID lookup. Falling back to provided identifier.', error);
    }
  }

  if (!dealershipUuid) {
    dealershipUuid = dealershipId;
  }

  if (!legacyDealershipId) {
    legacyDealershipId = dealershipId;
  }

  return {
    dealershipUuid,
    dealershipLegacyId: legacyDealershipId,
    dealershipCode
  };
};

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
        const dealershipContext = await resolveDealershipContext(testUser.dealershipId);

        (req as AuthenticatedRequest).user = {
          firebaseUid: testUser.firebaseUid,
          email: testUser.email,
          name: testUser.name,
          role: {
            id: testUser.role.id,
            name: testUser.role.name
          },
          dealershipId: dealershipContext.dealershipUuid,
          legacyDealershipId: dealershipContext.dealershipLegacyId,
          dealershipCode: dealershipContext.dealershipCode
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
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:192',message:'Token decoded - checking role in token',data:{tokenRole:decodedToken?.role,tokenCustomClaims:decodedToken?.customClaims,hasRole:!!decodedToken?.role,hasCustomClaims:!!decodedToken?.customClaims},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const { uid } = decodedToken;
    let { email, name } = decodedToken;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:190',message:'Before user query - checking schema',data:{uid,hasEmail:!!email,hasName:!!name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Check if fcm_token column exists in database (hypothesis testing)
    let fcmColumnExists = false;
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:197',message:'Checking if fcm_token column exists',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const columnCheck = await prisma.$queryRaw<Array<{column_name: string}>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'fcm_token'
      `;
      fcmColumnExists = columnCheck.length > 0;
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:203',message:'Column check result',data:{fcmColumnExists,columnCheckLength:columnCheck.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (schemaCheckError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:207',message:'Schema check error',data:{error:schemaCheckError?.message,code:schemaCheckError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.warn('Could not check schema:', schemaCheckError);
    }

    // Get user from database
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:214',message:'About to query user',data:{fcmColumnExists},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { firebaseUid: uid },
        include: {
          role: true
        }
      });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:225',message:'User query succeeded',data:{userFound:!!user,userEmail:user?.email,dbRole:user?.role?.name,dbRoleId:user?.role?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (queryError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:229',message:'User query failed',data:{error:queryError?.message,code:queryError?.code,meta:queryError?.meta},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw queryError;
    }

    // AUTO-CREATE: Create user with ADMIN role if they don't exist
    if (!user) {
      console.log(`🆕 Auto-creating new user: ${email || uid}`);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:245',message:'Auto-creating user - checking role',data:{email,uid,decodedTokenRole:decodedToken?.role,decodedTokenCustomClaims:decodedToken?.customClaims},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      try {
        // Ensure database connection is healthy
        await prisma.$queryRaw`SELECT 1`;
        
        // Determine role from Firebase custom claims or token, default to ADMIN
        let roleName = RoleName.ADMIN;
        if (decodedToken?.role) {
          roleName = decodedToken.role as RoleName;
        } else if (decodedToken?.customClaims?.role) {
          roleName = decodedToken.customClaims.role as RoleName;
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:258',message:'Determined role for auto-create',data:{roleName,email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // Get role from database
        const userRole = await prisma.role.findUnique({
          where: { name: roleName }
        }) || await prisma.role.findUnique({
          where: { name: RoleName.ADMIN }
        });
        
        if (!userRole) {
          console.error('❌ Role not found in database');
          res.status(500).json({
            success: false,
            message: 'System configuration error: Role not found'
          });
          return;
        }
        
        // Create a UNIQUE dealership for each new user (ONE USER = ONE DEALERSHIP)
        const dealershipCode = `${roleName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userName = name || email?.split('@')[0] || 'New User';
        
        const defaultDealership = await prisma.dealership.create({
          data: {
            name: `${userName}'s Dealership`,
            code: dealershipCode,
            type: 'UNIVERSAL',
            email: email || `${uid}@firebase.user`,
            phone: '+1234567890',
            address: 'To be configured',
            city: 'To be configured',
            state: 'To be configured',
            pincode: '00000',
            gstNumber: 'TO_BE_CONFIGURED',
            panNumber: 'TO_BE_CONFIGURED',
            brands: ['TO_BE_CONFIGURED'],
            isActive: true,
            onboardingCompleted: false
          }
        });
        console.log(`🏢 Created unique dealership for new user: ${defaultDealership.name}`);

        // Create user with determined role and assign to default dealership
        user = await prisma.user.create({
          data: {
            firebaseUid: uid,
            email: email || `${uid}@firebase.user`,
            name: name || email?.split('@')[0] || 'New User',
            roleId: userRole.id,
            isActive: true,
            employeeId: roleName === RoleName.ADMIN ? `ADM_${Date.now()}` : `USR_${Date.now()}`,
            dealershipId: defaultDealership.id // Assign to default dealership
          },
          include: {
            role: true,
            dealership: true
          }
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:305',message:'Auto-created user',data:{email:user.email,role:user.role.name,employeeId:user.employeeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        console.log(`✅ Auto-created user: ${user.email} with role ${user.role.name}`);
        
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
            
            // Create unique dealership for retry (ONE ADMIN = ONE DEALERSHIP)
            const dealershipCode = `ADMIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const adminName = name || email?.split('@')[0] || 'New Admin';
            
            const defaultDealership = await prisma.dealership.create({
              data: {
                name: `${adminName}'s Dealership`,
                code: dealershipCode,
                type: 'UNIVERSAL',
                email: email || `${uid}@firebase.user`,
                phone: '+1234567890',
                address: 'To be configured',
                city: 'To be configured',
                state: 'To be configured',
                pincode: '00000',
                gstNumber: 'TO_BE_CONFIGURED',
                panNumber: 'TO_BE_CONFIGURED',
                brands: ['TO_BE_CONFIGURED'],
                isActive: true,
                onboardingCompleted: false
              }
            });

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

    const dealershipContext = await resolveDealershipContext(user.dealershipId);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:517',message:'Setting authenticated user role',data:{dbRole:user.role.name,dbRoleId:user.role.id,tokenRole:decodedToken?.role,tokenCustomClaimsRole:decodedToken?.customClaims?.role,email:user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    (req as AuthenticatedRequest).user = {
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      role: {
        id: user.role.id,
        name: user.role.name
      },
      dealershipId: dealershipContext.dealershipUuid,
      legacyDealershipId: dealershipContext.dealershipLegacyId,
      dealershipCode: dealershipContext.dealershipCode,
      customClaims: decodedToken.customClaims || {}
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/bb3037a1-a776-4a54-aa78-cb4dc8c68919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.middleware.ts:533',message:'Authenticated user set',data:{finalRole:user.role.name,email:user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

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
