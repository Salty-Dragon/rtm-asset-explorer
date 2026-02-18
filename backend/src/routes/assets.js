import express from 'express';
import { z } from 'zod';
import Asset from '../models/Asset.js';
import AssetTransfer from '../models/AssetTransfer.js';
import blockchainService from '../services/blockchain.js';
import { validate, schemas } from '../middleware/validation.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { logger } from '../utils/logger.js';
import { transformAsset, transformAssetTransfer } from '../utils/transforms.js';

const router = express.Router();

// Constants
const SATOSHIS_PER_UNIT = 1e8; // Asset amounts use 8 decimal places (10^8 satoshis per unit)

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
      
      // Try to find by assetId first, then by name
      let parentAsset = await Asset.findOne({ assetId });
      if (!parentAsset) {
        parentAsset = await Asset.findOne({ name: assetId });
      }
      
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
      
      // First, try to get asset info to determine asset name
      let asset = await Asset.findOne({ assetId });
      if (!asset) {
        // Try to get from blockchain
        asset = await blockchainService.getAssetDetailsById(assetId).catch(() => null);
        if (!asset) {
          // Maybe assetId is actually the asset name
          asset = await Asset.findOne({ name: assetId });
          if (!asset) {
            asset = await blockchainService.getAssetDetailsByName(assetId).catch(() => null);
          }
        }
      }

      // Try database first
      let transfers = await AssetTransfer.find({
        $or: [
          { assetId: assetId },
          { assetName: assetId },
          ...(asset ? [
            { assetId: asset.assetId || asset.Asset_id },
            { assetName: asset.name || asset.Asset_name }
          ] : [])
        ]
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);
      
      let total = await AssetTransfer.countDocuments({
        $or: [
          { assetId: assetId },
          { assetName: assetId },
          ...(asset ? [
            { assetId: asset.assetId || asset.Asset_id },
            { assetName: asset.name || asset.Asset_name }
          ] : [])
        ]
      });
      
      // If no transfers found in database and we have asset info, try blockchain
      let blockchainNote = null;
      let fromBlockchain = false;
      if (total === 0 && asset) {
        try {
          const assetName = asset.name || asset.Asset_name;
          const ownerAddress = asset.owner || asset.currentOwner;
          
          if (ownerAddress && assetName) {
            logger.info(`No transfers in DB for ${assetName}, querying blockchain for owner ${ownerAddress}...`);
            
            // Get current blockchain height for confirmations calculation
            const blockchainInfo = await blockchainService.getBlockchainInfo();
            const currentHeight = blockchainInfo.blocks;
            
            const deltas = await blockchainService.getAddressDeltas([ownerAddress], assetName);
            
            if (deltas && Array.isArray(deltas)) {
              // Fetch block timestamps for unique block heights
              const blockTimestamps = {};
              const uniqueHeights = [...new Set(deltas.map(d => d.height))];
              
              for (const height of uniqueHeights) {
                try {
                  const blockHash = await blockchainService.getBlockHash(height);
                  const block = await blockchainService.getBlock(blockHash, 1); // Verbosity 1 for basic info
                  blockTimestamps[height] = new Date(block.time * 1000);
                } catch (error) {
                  logger.warn(`Failed to fetch block ${height} timestamp:`, error.message);
                  blockTimestamps[height] = null;
                }
              }
              
              // Transform blockchain deltas to transfer format
              transfers = deltas
                .sort((a, b) => b.height - a.height)
                .slice(skip, skip + limit)
                .map(delta => ({
                  txid: delta.txid,
                  assetId: delta.assetId || asset.assetId || asset.Asset_id,
                  assetName: delta.asset || assetName,
                  from: delta.satoshis < 0 ? delta.address : null,
                  to: delta.satoshis > 0 ? delta.address : null,
                  // Convert from satoshis to human-readable amount
                  amount: Math.abs(delta.satoshis) / SATOSHIS_PER_UNIT,
                  type: delta.satoshis > 0 ? 'mint' : 'transfer',
                  blockHeight: delta.height,
                  height: delta.height,
                  timestamp: blockTimestamps[delta.height],
                  confirmations: currentHeight - delta.height + 1,
                  _id: delta.txid + '_' + delta.index
                }));
              
              total = deltas.length;
              fromBlockchain = true;
              blockchainNote = 'Showing transfers for owner address only. Complete history may not be available.';
            }
          }
        } catch (blockchainError) {
          logger.warn(`Failed to fetch transfers from blockchain for ${assetId}:`, blockchainError.message);
          
          // Check if it's an indexing error
          if (blockchainError.message?.includes('index') || blockchainError.message?.includes('enabled')) {
            blockchainNote = 'Address indexing not enabled on blockchain node. Transfer history unavailable.';
          } else {
            blockchainNote = 'Unable to fetch transfer history from blockchain. Sync may be in progress.';
          }
        }
      }
      
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
          requestId: req.id || 'req_' + Date.now(),
          dataSource: fromBlockchain ? 'blockchain' : 'database',
          ...(blockchainNote && { note: blockchainNote })
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
