import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { RoleName } from '@prisma/client';
import prisma from '../config/db';

export interface DealershipRequest extends AuthenticatedRequest {
  dealershipId?: string;
  isSystemAdmin: boolean;
}

/**
 * Middleware to extract and validate dealership context
 * Ensures users can only access data from their own dealership (unless they're system admin)
 */
export const dealershipContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const dealershipReq = req as DealershipRequest;

    // System admins can access all dealerships
    dealershipReq.isSystemAdmin = authenticatedReq.user.role.name === RoleName.ADMIN;

    // If user is system admin, they can optionally filter by dealership via query param
    if (dealershipReq.isSystemAdmin) {
      dealershipReq.dealershipId = req.query.dealershipId as string || undefined;
      next();
      return;
    }

    // Non-admin users must have a dealership assigned
    if (!authenticatedReq.user.dealershipId) {
      res.status(403).json({
        success: false,
        message: 'User must be associated with a dealership. Please contact administrator.'
      });
      return;
    }

    // Set dealership context for non-admin users
    dealershipReq.dealershipId = authenticatedReq.user.dealershipId;

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
 */
export const buildDealershipWhere = (req: DealershipRequest, additionalWhere: any = {}) => {
  const where: any = { ...additionalWhere };

  // If not system admin, filter by dealership
  if (!req.isSystemAdmin && req.dealershipId) {
    where.dealershipId = req.dealershipId;
  } else if (req.query.dealershipId) {
    // System admin filtering by specific dealership
    where.dealershipId = req.query.dealershipId as string;
  }

  return where;
};

/**
 * Middleware to ensure user can only assign data to their own dealership
 */
export const validateDealershipAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const { dealershipId } = req.body;

    // System admins can assign to any dealership
    if (authenticatedReq.user.role.name === RoleName.ADMIN) {
      next();
      return;
    }

    // Non-admins can only assign to their own dealership
    if (dealershipId && dealershipId !== authenticatedReq.user.dealershipId) {
      res.status(403).json({
        success: false,
        message: 'Cannot assign data to a different dealership'
      });
      return;
    }

    // If no dealershipId provided, auto-assign user's dealership
    if (!dealershipId && authenticatedReq.user.dealershipId) {
      req.body.dealershipId = authenticatedReq.user.dealershipId;
    }

    next();
  } catch (error) {
    console.error('Dealership assignment validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating dealership assignment'
    });
  }
};

