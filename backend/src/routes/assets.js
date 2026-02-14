import express from 'express';
import { z } from 'zod';
import Asset from '../models/Asset.js';
import blockchainService from '../services/blockchain.js';
import { validate, schemas } from '../middleware/validation.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// GET /api/assets - List assets
router.get('/',
  cacheMiddleware(60),
  validate(z.object({
    limit: schemas.limit,
    offset: schemas.offset,
    type: z.enum(['fungible', 'non-fungible']).optional(),
    creator: z.string().optional()
  })),
  async (req, res, next) => {
    try {
      const { limit, offset, type, creator } = req.validated;

      const filter = {};
      if (type) filter.type = type;
      if (creator) filter.creator = creator;

      const assets = await Asset.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);

      const total = await Asset.countDocuments(filter);

      res.json({
        success: true,
        data: {
          assets,
          pagination: {
            limit,
            offset,
            total
          }
        },
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

// GET /api/assets/:assetId - Get asset by ID
router.get('/:assetId',
  cacheMiddleware(300),
  validate(z.object({
    assetId: z.string().min(1)
  })),
  async (req, res, next) => {
    try {
      const { assetId } = req.validated;

      // Try to get from database first
      let asset = await Asset.findOne({ assetId });

      // If not in database, try blockchain
      if (!asset) {
        try {
          const assetData = await blockchainService.getAssetDetailsById(assetId) ||
                           await blockchainService.getAssetDetailsByName(assetId);
          
          if (!assetData) {
            return res.status(404).json({
              success: false,
              error: {
                message: 'Asset not found'
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId: req.id || 'req_' + Date.now()
              }
            });
          }

          return res.json({
            success: true,
            data: assetData,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.id || 'req_' + Date.now(),
              dataSource: 'blockchain'
            }
          });
        } catch (error) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Asset not found'
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: req.id || 'req_' + Date.now()
            }
          });
        }
      }

      // Increment view count (don't wait)
      Asset.findByIdAndUpdate(asset._id, { $inc: { views: 1 } })
        .catch(() => {});

      res.json({
        success: true,
        data: asset,
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
