import express from 'express';
import blockchainService from '../services/blockchain.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// GET /api/v1/blockchain/info - Get blockchain information
router.get('/info',
  cacheMiddleware(30),
  async (req, res, next) => {
    try {
      const info = await blockchainService.getBlockchainInfo();

      res.json({
        success: true,
        data: {
          chain: info.chain,
          blocks: info.blocks,
          headers: info.headers,
          bestBlockHash: info.bestblockhash,
          difficulty: info.difficulty,
          medianTime: info.mediantime,
          verificationProgress: info.verificationprogress,
          chainWork: info.chainwork,
          size: info.size_on_disk,
          pruned: info.pruned || false,
          syncStatus: {
            synced: info.blocks >= info.headers,
            progress: info.verificationprogress * 100,
            behindBlocks: info.headers - info.blocks
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'blockchain'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
