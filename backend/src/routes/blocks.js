import express from 'express';
import { z } from 'zod';
import Block from '../models/Block.js';
import blockchainService from '../services/blockchain.js';
import { validate, schemas } from '../middleware/validation.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// GET /api/blocks - List recent blocks
router.get('/', 
  cacheMiddleware(60),
  validate(z.object({
    limit: schemas.limit,
    offset: schemas.offset
  })),
  async (req, res, next) => {
    try {
      const { limit, offset } = req.validated;

      const blocks = await Block.find()
        .sort({ height: -1 })
        .limit(limit)
        .skip(offset)
        .select('-transactions');

      const total = await Block.countDocuments();

      res.json({
        success: true,
        data: {
          blocks,
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

// GET /api/blocks/:height - Get block by height
router.get('/:height',
  cacheMiddleware(300),
  validate(z.object({
    height: schemas.blockHeight
  })),
  async (req, res, next) => {
    try {
      const { height } = req.validated;

      // Try to get from database first
      let block = await Block.findOne({ height });

      // If not in database, try blockchain
      if (!block) {
        try {
          const blockHash = await blockchainService.getBlockHash(height);
          const blockData = await blockchainService.getBlock(blockHash);
          
          // Return blockchain data (we could also store it here)
          return res.json({
            success: true,
            data: blockData,
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
              message: 'Block not found'
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
        data: block,
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
