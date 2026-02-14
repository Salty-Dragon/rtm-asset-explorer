import express from 'express';
import { z } from 'zod';
import Address from '../models/Address.js';
import { validate, schemas } from '../middleware/validation.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// GET /api/addresses/:address - Get address information
router.get('/:address',
  cacheMiddleware(60),
  validate(z.object({
    address: schemas.raptoreumAddress
  })),
  async (req, res, next) => {
    try {
      const { address } = req.validated;

      const addressDoc = await Address.findOne({ address });

      if (!addressDoc) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Address not found or has no activity'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || 'req_' + Date.now()
          }
        });
      }

      res.json({
        success: true,
        data: addressDoc,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'database'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
