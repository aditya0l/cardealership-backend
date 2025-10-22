import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Use user ID if authenticated, otherwise IP address
    const userId = (req as any).user?.firebaseUid;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  }

  private isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || entry.resetTime < now) {
      // No entry or expired, create new one
      this.store[key] = {
        count: 1,
        resetTime: now + config.windowMs
      };
      return true;
    }

    if (entry.count >= config.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  middleware(config: RateLimitConfig) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.getKey(req);
      const allowed = this.isAllowed(key, config);

      if (!allowed) {
        res.status(429).json({
          success: false,
          message: config.message || 'Too many requests, please try again later',
          retryAfter: Math.ceil(config.windowMs / 1000)
        });
        return;
      }

      next();
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create rate limiter instance
const rateLimiter = new RateLimiter();

// Predefined rate limit configurations
export const notificationRateLimit = rateLimiter.middleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many notification requests, please try again later'
});

export const fcmTokenRateLimit = rateLimiter.middleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 FCM token updates per minute
  message: 'Too many FCM token updates, please try again later'
});

export const testNotificationRateLimit = rateLimiter.middleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 test notifications per minute
  message: 'Too many test notifications, please try again later'
});

export const generalRateLimit = rateLimiter.middleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 200, // 200 requests per 15 minutes
  message: 'Too many requests, please try again later'
});

// Cleanup on process exit
process.on('SIGINT', () => {
  rateLimiter.destroy();
});

process.on('SIGTERM', () => {
  rateLimiter.destroy();
});

export default rateLimiter;
