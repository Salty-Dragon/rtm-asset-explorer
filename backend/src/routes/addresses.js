import express from 'express';
import { z } from 'zod';
import Address from '../models/Address.js';
import Asset from '../models/Asset.js';
import { validate, schemas } from '../middleware/validation.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { transformAsset } from '../utils/transforms.js';

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

      let addressDoc = await Address.findOne({ address });

      // If no Address document exists, check if the address owns any assets
      if (!addressDoc) {
        const ownedAssets = await Asset.countDocuments({ currentOwner: address });
        const createdAssets = await Asset.countDocuments({ creator: address });

        // If the address owns or created assets, create a basic address document
        if (ownedAssets > 0 || createdAssets > 0) {
          addressDoc = {
            address,
            balance: 0,
            totalReceived: 0,
            totalSent: 0,
            transactionCount: 0,
            assetBalances: [],
            assetsOwned: ownedAssets,
            assetsCreated: createdAssets
          };
        } else {
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
      }

      res.json({
        success: true,
        data: addressDoc.toObject ? addressDoc.toObject() : addressDoc,
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

// GET /api/addresses/:address/assets - Get assets owned by an address
router.get('/:address/assets',
  cacheMiddleware(60),
  validate(z.object({
    address: schemas.raptoreumAddress,
    limit: schemas.limit,
    offset: schemas.offset,
    type: z.enum(['fungible', 'non-fungible']).optional()
  })),
  async (req, res, next) => {
    try {
      const { address, limit, offset, type } = req.validated;

      const filter = { currentOwner: address };
      if (type) filter.type = type;

      const assets = await Asset.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);

      const total = await Asset.countDocuments(filter);
      const page = Math.floor(offset / limit) + 1;
      const pages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: assets.map(transformAsset),
        pagination: {
          page,
          limit,
          offset,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
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

export default router;
