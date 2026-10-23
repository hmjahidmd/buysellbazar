import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../../config/redis';
import logger from '../../config/logger';
import { RateLimitError } from '../errors/AppError';

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

// In-memory fallback map for dev/test when Redis is unavailable
const memoryRateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const createRateLimiter = (options: RateLimiterOptions) => {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = options;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown_ip';
    const redisKey = `${keyPrefix}:${clientIp}`;

    try {
      const redis = getRedisClient();
      if (redis.status === 'ready') {
        const currentRequests = await redis.incr(redisKey);
        if (currentRequests === 1) {
          await redis.expire(redisKey, windowSeconds);
        }

        if (currentRequests > maxRequests) {
          const ttl = await redis.ttl(redisKey);
          return next(
            new RateLimitError(
              `Too many requests. Limit is ${maxRequests} requests per ${windowSeconds}s. Try again in ${ttl} seconds.`
            )
          );
        }

        return next();
      }
    } catch (redisErr) {
      logger.warn('Redis rate limiter degraded, falling back to memory: ', redisErr);
    }

    // In-memory fallback
    const now = Date.now();
    const entry = memoryRateLimitMap.get(redisKey);

    if (!entry || now > entry.resetTime) {
      memoryRateLimitMap.set(redisKey, { count: 1, resetTime: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      const waitSeconds = Math.ceil((entry.resetTime - now) / 1000);
      return next(
        new RateLimitError(
          `Too many requests. Limit is ${maxRequests} requests per ${windowSeconds}s. Try again in ${waitSeconds} seconds.`
        )
      );
    }

    return next();
  };
};

export default createRateLimiter;
