import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';
import { logger } from '../utils/logger.js';

export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return next(); // API key is optional, allow request to continue
    }

    // Hash the API key for comparison
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const keyDoc = await ApiKey.findOne({ key: hashedKey, active: true });

    if (!keyDoc) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or inactive API key'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'unknown'
        }
      });
    }

    // Check if key has expired
    if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'API key has expired'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'unknown'
        }
      });
    }

    // Attach API key info to request
    req.apiKey = keyDoc;

    // Update usage stats (don't wait for completion)
    ApiKey.findByIdAndUpdate(keyDoc._id, {
      $inc: { totalRequests: 1 },
      lastUsed: new Date()
    }).catch(err => logger.error('Error updating API key usage:', err));

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(error);
  }
};

export const requireApiKey = (req, res, next) => {
  if (!req.apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'API key required for this endpoint'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    });
  }
  next();
};
