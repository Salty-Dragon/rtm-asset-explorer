import { getClient } from '../services/cache.js';
import { logger } from '../utils/logger.js';

export const rateLimit = (maxRequests = 100, windowSeconds = 60) => {
  return async (req, res, next) => {
    try {
      const redisClient = getClient();
      
      if (!redisClient) {
        logger.warn('Redis not available, skipping rate limiting');
        return next();
      }

      // Use API key or IP as identifier
      const identifier = req.apiKey?.key || req.ip;
      const key = `ratelimit:${identifier}`;

      const current = await redisClient.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: {
            message: 'Rate limit exceeded',
            limit: maxRequests,
            window: `${windowSeconds} seconds`
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || 'unknown'
          }
        });
      }

      // Increment counter
      if (count === 0) {
        await redisClient.setEx(key, windowSeconds, '1');
      } else {
        await redisClient.incr(key);
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - count - 1);
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + windowSeconds);

      next();
    } catch (error) {
      logger.error('Rate limit error:', error);
      // Don't block request on rate limit error
      next();
    }
  };
};
