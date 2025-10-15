import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

/**
 * Database health check middleware
 * Ensures database connection is healthy before processing requests
 */
export const dbHealthCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Quick health check query
    await prisma.$queryRaw`SELECT 1`;
    next();
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    
    // Don't block critical auth endpoints
    if (req.path.includes('/auth/login') || req.path.includes('/auth/profile')) {
      console.log('🔄 Auth endpoint - proceeding despite DB health check failure');
      next();
      return;
    }
    
    res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again in a few moments.',
      code: 'DB_UNAVAILABLE'
    });
  }
};
