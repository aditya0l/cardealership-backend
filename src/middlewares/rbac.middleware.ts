import { Request, Response, NextFunction } from 'express';
import { RoleName } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';

export interface FieldPermission {
  read: boolean;
  write: boolean;
}

export interface RolePermissions {
  [fieldName: string]: FieldPermission;
}

// Define field permissions for each role
export const ROLE_PERMISSIONS: Record<RoleName, RolePermissions> = {
  [RoleName.ADMIN]: {
    // Admin has full read/write access to all fields
    '*': { read: true, write: true }
  },
  
  [RoleName.GENERAL_MANAGER]: {
    // Read all fields
    '*': { read: true, write: false },
    // Can add their own remarks
    'remarks': { read: true, write: false },              // Legacy field - read only
    'advisorRemarks': { read: true, write: false },       // Can read but not write Advisor remarks
    'teamLeadRemarks': { read: true, write: false },      // Can read but not write Team Lead remarks
    'salesManagerRemarks': { read: true, write: false },  // Can read but not write Sales Manager remarks
    'generalManagerRemarks': { read: true, write: true }, // ✅ Can edit their own remarks
    'adminRemarks': { read: true, write: false },         // Can read but not write Admin remarks
    'auditLogs': { read: true, write: false }
  },
  
  [RoleName.SALES_MANAGER]: {
    // Read all fields
    '*': { read: true, write: false },
    // Can add their own remarks
    'remarks': { read: true, write: false },              // Legacy field - read only
    'advisorRemarks': { read: true, write: false },       // Can read but not write Advisor remarks
    'teamLeadRemarks': { read: true, write: false },      // Can read but not write Team Lead remarks
    'salesManagerRemarks': { read: true, write: true },   // ✅ Can edit their own remarks
    'generalManagerRemarks': { read: true, write: false }, // Can read but not write General Manager remarks
    'adminRemarks': { read: true, write: false },         // Can read but not write Admin remarks
    'auditLogs': { read: true, write: false }
  },
  
  [RoleName.TEAM_LEAD]: {
    // Read all fields
    '*': { read: true, write: false },
    // Can add their own remarks
    'remarks': { read: true, write: false },              // Legacy field - read only
    'advisorRemarks': { read: true, write: false },       // Can read but not write Advisor remarks
    'teamLeadRemarks': { read: true, write: true },       // ✅ Can edit their own remarks
    'salesManagerRemarks': { read: true, write: false },  // Can read but not write Sales Manager remarks
    'generalManagerRemarks': { read: true, write: false }, // Can read but not write General Manager remarks
    'adminRemarks': { read: true, write: false },         // Can read but not write Admin remarks
    'auditLogs': { read: true, write: false }
  },
  
  [RoleName.CUSTOMER_ADVISOR]: {
    // Customer Advisor specific permissions
    // CANNOT create bookings - only update specific fields (remarks)
    
    // Read customer information (no write access)
    'customerName': { read: true, write: false },
    'customerPhone': { read: true, write: false },
    'customerEmail': { read: true, write: false },
    'optyId': { read: true, write: false },
    
    // Can update booking status
    'status': { read: true, write: true },
    
    // ✅ ADVISOR-EDITABLE FIELDS - Can update these fields
    'bookingDate': { read: true, write: false },
    'expectedDeliveryDate': { read: true, write: true },  // ✅ Editable
    'financeRequired': { read: true, write: true },       // ✅ Editable
    'financerName': { read: true, write: true },          // ✅ Editable
    'fileLoginDate': { read: true, write: true },         // ✅ Editable
    'approvalDate': { read: true, write: true },          // ✅ Editable
    'stockAvailability': { read: true, write: true },     // ✅ Editable (enum: VNA, VEHICLE_AVAILABLE)
    'backOrderStatus': { read: true, write: true },       // ✅ Editable
    'rtoDate': { read: true, write: true },               // ✅ Editable
    
    // Vehicle information (read only)
    'variant': { read: true, write: false },
    'color': { read: true, write: false },
    'fuelType': { read: true, write: false },
    'transmission': { read: true, write: false },
    
    // Advisor specific fields (read only - set by system)
    'advisorId': { read: true, write: false },
    'empName': { read: true, write: false },
    'employeeLogin': { read: true, write: false },
    
    // Basic read access to other fields (no write)
    'dealerCode': { read: true, write: false },
    'zone': { read: true, write: false },
    'region': { read: true, write: false },
    'division': { read: true, write: false },
    
    // ✅ REMARKS - Role-specific remarks fields
    'remarks': { read: true, write: false },              // Legacy field - read only
    'advisorRemarks': { read: true, write: true },        // Customer Advisor can edit their remarks
    'teamLeadRemarks': { read: true, write: false },      // Can read but not write Team Lead remarks
    'salesManagerRemarks': { read: true, write: false },  // Can read but not write Sales Manager remarks
    'generalManagerRemarks': { read: true, write: false }, // Can read but not write General Manager remarks
    'adminRemarks': { read: true, write: false },         // Can read but not write Admin remarks
    
    // System fields (read only)
    'id': { read: true, write: false },
    'createdAt': { read: true, write: false },
    'updatedAt': { read: true, write: false },
    'source': { read: true, write: false }
  }
};

// Special permissions for Customer Advisors based on context
export const ADVISOR_CONTEXT_PERMISSIONS = {
  // Advisors can only modify bookings assigned to them
  ownBookingsOnly: true,
  // Advisors can create new bookings
  canCreate: true,
  // Advisors cannot delete bookings
  canDelete: false
};

export function hasFieldPermission(
  userRole: RoleName, 
  fieldName: string, 
  action: 'read' | 'write'
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  
  // Check for wildcard permission first (Admin)
  if (rolePermissions['*'] && rolePermissions['*'][action]) {
    return true;
  }
  
  // Check specific field permission
  const fieldPermission = rolePermissions[fieldName];
  if (fieldPermission && fieldPermission[action]) {
    return true;
  }
  
  return false;
}

export function filterReadableFields<T extends Record<string, any>>(
  data: T, 
  userRole: RoleName
): Partial<T> {
  if (userRole === RoleName.ADMIN) {
    return data; // Admin can read everything
  }
  
  const filtered: Partial<T> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (hasFieldPermission(userRole, key, 'read')) {
      filtered[key as keyof T] = value;
    }
  }
  
  return filtered;
}

export function filterWritableFields<T extends Record<string, any>>(
  data: T, 
  userRole: RoleName
): Partial<T> {
  if (userRole === RoleName.ADMIN) {
    return data; // Admin can write everything
  }
  
  const filtered: Partial<T> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (hasFieldPermission(userRole, key, 'write')) {
      filtered[key as keyof T] = value;
    }
  }
  
  return filtered;
}

// Middleware to enforce field-level permissions on request body
export const enforceFieldPermissions = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { user } = req as AuthenticatedRequest;
  
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }
  
  // Filter the request body to only include writable fields
  if (req.body && typeof req.body === 'object') {
    req.body = filterWritableFields(req.body, user.role.name);
  }
  
  next();
};

// Middleware to check if advisor can access specific booking
export const enforceAdvisorBookingAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }
  
  // Only apply to Customer Advisors
  if (user.role.name !== RoleName.CUSTOMER_ADVISOR) {
    next();
    return;
  }
  
  const bookingId = req.params.id || req.params.bookingId;
  
  if (!bookingId) {
    next();
    return;
  }
  
  try {
    const prisma = (await import('../config/db')).default;
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { advisorId: true }
    });
    
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }
    
    // Check if the booking is assigned to this advisor
    if (booking.advisorId !== user.firebaseUid) {
      res.status(403).json({
        success: false,
        message: 'You can only access bookings assigned to you'
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Error checking advisor booking access:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking permissions'
    });
  }
};

// Utility function to check if user can perform action on resource
export function canPerformAction(
  userRole: RoleName,
  action: 'create' | 'read' | 'update' | 'delete',
  resource: 'booking' | 'enquiry' | 'quotation' | 'user'
): boolean {
  // Admin can do everything
  if (userRole === RoleName.ADMIN) {
    return true;
  }
  
  // Define action permissions by role
  const actionPermissions: Record<RoleName, Record<string, string[]>> = {
    [RoleName.ADMIN]: {
      booking: ['create', 'read', 'update', 'delete'],
      enquiry: ['create', 'read', 'update', 'delete'],
      quotation: ['create', 'read', 'update', 'delete'],
      user: ['create', 'read', 'update', 'delete']
    },
    [RoleName.GENERAL_MANAGER]: {
      booking: ['read', 'update'], // Can update bookings and add their remarks
      enquiry: ['read', 'update'], // Can add remarks
      quotation: ['read'],
      user: ['read']
    },
    [RoleName.SALES_MANAGER]: {
      booking: ['read', 'update'], // Can update bookings and add their remarks
      enquiry: ['read', 'update'], // Can add remarks
      quotation: ['read'],
      user: ['read']
    },
    [RoleName.TEAM_LEAD]: {
      booking: ['read', 'update'], // Can update bookings and add their remarks
      enquiry: ['read', 'update'], // Can add remarks
      quotation: ['read'],
      user: ['read']
    },
    [RoleName.CUSTOMER_ADVISOR]: {
      booking: ['read', 'update'], // Can ONLY read and update (add remarks) to bookings - CANNOT create
      enquiry: ['create', 'read', 'update'], // Can create and manage own enquiries
      quotation: ['read'],
      user: ['read'] // Can read own profile
    }
  };
  
  const permissions = actionPermissions[userRole]?.[resource] || [];
  return permissions.includes(action);
}
