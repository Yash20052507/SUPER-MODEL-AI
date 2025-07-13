import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';
import { RateLimitError } from './errorHandler';

// Initialize Redis client for rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
});

redisClient.on('error', (err) => {
  console.error('Redis rate limiter error:', err);
});

// Connect to Redis
redisClient.connect().catch(console.error);

// Rate limiter configurations
const rateLimiterConfig = {
  storeClient: redisClient,
  keyPrefix: 'supermodel_ai_rate_limit',
  points: parseInt(process.env.RATE_LIMIT_MAX || '100'), // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000, // Convert to seconds
  blockDuration: 60, // Block for 1 minute if limit exceeded
};

// Create rate limiters for different endpoints
const generalRateLimiter = new RateLimiterRedis({
  ...rateLimiterConfig,
  keyPrefix: 'general_rate_limit',
  points: 100, // 100 requests per 15 minutes
  duration: 900, // 15 minutes
});

const authRateLimiter = new RateLimiterRedis({
  ...rateLimiterConfig,
  keyPrefix: 'auth_rate_limit',
  points: 5, // 5 login attempts per 15 minutes
  duration: 900, // 15 minutes
  blockDuration: 1800, // Block for 30 minutes if limit exceeded
});

const aiRateLimiter = new RateLimiterRedis({
  ...rateLimiterConfig,
  keyPrefix: 'ai_rate_limit',
  points: 50, // 50 AI requests per 15 minutes
  duration: 900, // 15 minutes
  blockDuration: 300, // Block for 5 minutes if limit exceeded
});

const skillPackRateLimiter = new RateLimiterRedis({
  ...rateLimiterConfig,
  keyPrefix: 'skill_pack_rate_limit',
  points: 20, // 20 skill pack operations per 15 minutes
  duration: 900, // 15 minutes
  blockDuration: 300, // Block for 5 minutes if limit exceeded
});

// Get client IP address
function getClientIP(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return (xForwardedFor as string).split(',')[0].trim();
  }
  
  const xRealIP = req.headers['x-real-ip'];
  if (xRealIP) {
    return xRealIP as string;
  }
  
  return req.connection.remoteAddress || req.socket.remoteAddress || req.ip || 'unknown';
}

// Create rate limiter middleware
function createRateLimiter(limiter: RateLimiterRedis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIP = getClientIP(req);
      const key = `${clientIP}_${req.path}`;
      
      await limiter.consume(key);
      next();
    } catch (rateLimiterRes: any) {
      if (rateLimiterRes instanceof Error) {
        // Redis error
        console.error('Rate limiter error:', rateLimiterRes);
        next(); // Allow request to proceed if rate limiter fails
      } else {
        // Rate limit exceeded
        const msBeforeNext = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
        
        res.set({
          'Retry-After': String(msBeforeNext),
          'X-RateLimit-Limit': String(limiter.points),
          'X-RateLimit-Remaining': String(rateLimiterRes.remainingPoints || 0),
          'X-RateLimit-Reset': String(new Date(Date.now() + rateLimiterRes.msBeforeNext)),
        });
        
        next(new RateLimitError(`Rate limit exceeded. Try again in ${msBeforeNext} seconds.`));
      }
    }
  };
}

// Export rate limiter middlewares
export const rateLimiter = createRateLimiter(generalRateLimiter);
export const authRateLimit = createRateLimiter(authRateLimiter);
export const aiRateLimit = createRateLimiter(aiRateLimiter);
export const skillPackRateLimit = createRateLimiter(skillPackRateLimiter);

// Advanced rate limiter with user-specific limits
export const userSpecificRateLimit = (userLimits: { [role: string]: number }) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const clientIP = getClientIP(req);
      const userRole = req.user?.role || 'guest';
      const limit = userLimits[userRole] || userLimits.guest || 10;
      
      const userRateLimiter = new RateLimiterRedis({
        ...rateLimiterConfig,
        keyPrefix: `user_${userRole}_rate_limit`,
        points: limit,
        duration: 900, // 15 minutes
      });
      
      const key = req.user ? `user_${req.user.id}` : `ip_${clientIP}`;
      
      await userRateLimiter.consume(key);
      next();
    } catch (rateLimiterRes: any) {
      if (rateLimiterRes instanceof Error) {
        console.error('User rate limiter error:', rateLimiterRes);
        next();
      } else {
        const msBeforeNext = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
        
        res.set({
          'Retry-After': String(msBeforeNext),
          'X-RateLimit-Limit': String(rateLimiterRes.totalHits || 0),
          'X-RateLimit-Remaining': String(rateLimiterRes.remainingPoints || 0),
          'X-RateLimit-Reset': String(new Date(Date.now() + rateLimiterRes.msBeforeNext)),
        });
        
        next(new RateLimitError(`Rate limit exceeded. Try again in ${msBeforeNext} seconds.`));
      }
    }
  };
};

// Cleanup function
export const cleanupRateLimiter = async () => {
  await redisClient.quit();
};