import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { RoleName } from '@prisma/client';
import prisma from '../config/db';

export interface DealershipRequest extends AuthenticatedRequest {
  dealershipId?: string | null;
  isSystemAdmin: boolean;
}

/**
 * Middleware to extract and validate dealership context
 * MULTI-TENANT MODEL: ALL users (including ADMIN) belong to ONE dealership
 */
export const dealershipContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const dealershipReq = req as DealershipRequest;

    // In multi-tenant model: No system-wide admins
    // ALL users (including ADMIN) belong to one dealership
    dealershipReq.isSystemAdmin = false;

    // For new admins without dealership, allow them to proceed (they can create/choose one)
    if (!authenticatedReq.user.dealershipId) {
      if (authenticatedReq.user.role.name === RoleName.ADMIN) {
        console.log(`🆕 New ADMIN user without dealership: ${authenticatedReq.user.email}`);
        dealershipReq.dealershipId = null; // Allow null for new admins
      } else {
        res.status(403).json({
          success: false,
          message: 'User must be associated with a dealership. Please contact administrator.'
        });
        return;
      }
    } else {
      // Set dealership context from user (including ADMINs)
      dealershipReq.dealershipId = authenticatedReq.user.dealershipId;
    }

    next();
  } catch (error) {
    console.error('Dealership context middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error establishing dealership context'
    });
  }
};

/**
 * Utility to build where clause with dealership filter
 * MULTI-TENANT: Always filter by user's dealership
 */
export const buildDealershipWhere = (req: DealershipRequest, additionalWhere: any = {}) => {
  const where: any = { ...additionalWhere };

  // ALWAYS filter by user's dealership (multi-tenant isolation)
  if (req.dealershipId) {
    where.dealershipId = req.dealershipId;
  }

  return where;
};

/**
 * Middleware to AUTO-ASSIGN dealership to all created data
 * MULTI-TENANT: All data automatically scoped to user's dealership
 */
export const validateDealershipAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const { dealershipId } = req.body;

    // Users can ONLY create data in their own dealership
    if (dealershipId && dealershipId !== authenticatedReq.user.dealershipId) {
      res.status(403).json({
        success: false,
        message: 'Cannot create data for a different dealership'
      });
      return;
    }

    // ALWAYS auto-assign user's dealership
    req.body.dealershipId = authenticatedReq.user.dealershipId;

    next();
  } catch (error) {
    console.error('Dealership assignment validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating dealership assignment'
    });
  }
};

