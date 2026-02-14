import { getCache, setCache } from '../services/cache.js';
import { logger } from '../utils/logger.js';

export const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = `cache:api:${req.originalUrl}`;
      const cachedData = await getCache(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return res.json({
          ...cachedData,
          meta: {
            ...cachedData.meta,
            dataSource: 'cache'
          }
        });
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function (data) {
        if (data.success && res.statusCode === 200) {
          setCache(cacheKey, data, ttl).catch(err => 
            logger.error('Error caching response:', err)
          );
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};
