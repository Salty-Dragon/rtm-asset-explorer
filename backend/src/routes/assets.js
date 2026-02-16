import express from 'express';
import { z } from 'zod';
import Asset from '../models/Asset.js';
import AssetTransfer from '../models/AssetTransfer.js';
import blockchainService from '../services/blockchain.js';
import { validate, schemas } from '../middleware/validation.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Transform a database asset document OR blockchain RPC response to the frontend-expected format.
 * Maps field names from the DB schema to the frontend Asset type.
 * Handles both database documents and blockchain RPC responses.
 */
function transformAsset(asset) {
  const obj = asset.toObject ? asset.toObject() : { ...asset };

  // Ensure metadata.attributes is an array
  if (obj.metadata?.attributes && !Array.isArray(obj.metadata.attributes)) {
    obj.metadata.attributes = Object.values(obj.metadata.attributes);
  }

  // Handle both database fields and blockchain RPC fields for amount/units
  // Database uses: totalSupply, circulatingSupply, decimals
  // Frontend uses: amount (total supply), units (circulating/available supply)
  // Blockchain RPC may use different field names
  const amount = obj.totalSupply ?? obj.amount ?? 0;
  const units = obj.circulatingSupply ?? obj.units ?? 0;

  return {
    _id: obj._id,
    assetId: obj.assetId,
    name: obj.name,
    type: obj.type === 'non-fungible' ? 'nft' : 'fungible',
    amount: amount,
    units: units,
    reissuable: obj.updatable ?? obj.reissuable ?? false,
    hasIpfs: !!obj.ipfsHash,
    ipfsHash: obj.ipfsHash || undefined,
    txid: obj.createdTxid ?? obj.txid,
    height: obj.createdBlockHeight ?? obj.height,
    blockTime: obj.createdAt ? new Date(obj.createdAt).getTime() / 1000 : obj.blockTime,
    owner: obj.creator ?? obj.owner,
    metadata: obj.metadata || undefined,
    transferCount: obj.transferCount ?? 0,
    views: obj.views ?? 0,
    isSubAsset: obj.isSubAsset ?? false,
    parentAssetName: obj.parentAssetName || undefined,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

/**
 * Transform a database asset transfer document to the frontend-expected format.
 * Maps field names from the DB schema to the frontend AssetTransfer type.
 */
function transformAssetTransfer(transfer) {
  const obj = transfer.toObject ? transfer.toObject() : { ...transfer };

  return {
    _id: obj._id,
    assetId: obj.assetId,
    assetName: obj.assetName,
    txid: obj.txid,
    vout: obj.vout ?? 0,
    from: obj.from,
    to: obj.to,
    amount: obj.amount,
    height: obj.blockHeight ?? obj.height,
    blockTime: obj.timestamp ? new Date(obj.timestamp).getTime() / 1000 : undefined,
    timestamp: obj.timestamp,
  };
}

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
          hasNext: offset + limit < total,
          hasPrev: offset > 0
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

          // Transform blockchain data to match frontend expectations
          // This ensures field names are consistent regardless of data source
          const transformedAsset = transformAsset(assetData);

          return res.json({
            success: true,
            data: transformedAsset,
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
        data: transformAsset(asset),
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

// GET /api/assets/:assetId/subassets - Get sub-assets for an asset
router.get('/:assetId/subassets',
  cacheMiddleware(60),
  async (req, res, next) => {
    try {
      const { assetId } = req.params;
      
      const parentAsset = await Asset.findOne({ assetId });
      
      if (!parentAsset) {
        return res.status(404).json({
          success: false,
          error: { message: 'Asset not found' }
        });
      }
      
      const subAssets = await Asset.find({
        parentAssetName: parentAsset.name,
        isSubAsset: true
      }).sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: subAssets.map(transformAsset),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/assets/by-parent/:parentName - Get assets by parent name
router.get('/by-parent/:parentName',
  cacheMiddleware(60),
  async (req, res, next) => {
    try {
      // Note: Asset names in Raptoreum are case-insensitive and stored in uppercase
      const parentName = req.params.parentName.toUpperCase();
      
      const parent = await Asset.findOne({ name: parentName, isSubAsset: false });
      const subAssets = await Asset.find({
        parentAssetName: parentName,
        isSubAsset: true
      }).sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: {
          parent: parent ? transformAsset(parent) : null,
          subAssets: subAssets.map(transformAsset),
          total: subAssets.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/assets/:assetId/transfers - Get transfer history for an asset
router.get('/:assetId/transfers',
  cacheMiddleware(30),
  validate(z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50')
  })),
  async (req, res, next) => {
    try {
      const { assetId } = req.params;
      const { page, limit } = req.validated;
      
      const skip = (page - 1) * limit;
      
      const transfers = await AssetTransfer.find({ assetId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);
      
      const total = await AssetTransfer.countDocuments({ assetId });
      
      const pages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: transfers.map(transformAssetTransfer),
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/assets/name/:assetName/transfers - Get transfer history by asset name
router.get('/name/:assetName/transfers',
  cacheMiddleware(30),
  validate(z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50')
  })),
  async (req, res, next) => {
    try {
      const { assetName } = req.params;
      const { page, limit } = req.validated;
      
      const skip = (page - 1) * limit;
      
      const transfers = await AssetTransfer.find({ assetName })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);
      
      const total = await AssetTransfer.countDocuments({ assetName });
      
      const pages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: transfers.map(transformAssetTransfer),
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
