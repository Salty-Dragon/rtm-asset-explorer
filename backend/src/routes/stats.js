import express from 'express';
import Block from '../models/Block.js';
import Transaction from '../models/Transaction.js';
import Asset from '../models/Asset.js';
import Address from '../models/Address.js';
import blockchainService from '../services/blockchain.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// GET /api/stats - Get blockchain statistics
router.get('/',
  cacheMiddleware(30),
  async (req, res, next) => {
    try {
      // Get stats from blockchain
      const blockchainInfo = await blockchainService.getBlockchainInfo();

      // Get counts from database
      const [
        totalBlocks,
        totalTransactions,
        totalAssets,
        totalAddresses,
        fungibleAssets,
        nonFungibleAssets
      ] = await Promise.all([
        Block.countDocuments(),
        Transaction.countDocuments(),
        Asset.countDocuments(),
        Address.countDocuments(),
        Asset.countDocuments({ type: 'fungible' }),
        Asset.countDocuments({ type: 'non-fungible' })
      ]);

      // Get recent blocks for average block time
      const recentBlocks = await Block.find()
        .sort({ height: -1 })
        .limit(100)
        .select('timestamp');

      let averageBlockTime = 0;
      if (recentBlocks.length > 1) {
        const times = [];
        for (let i = 0; i < recentBlocks.length - 1; i++) {
          const diff = recentBlocks[i].timestamp - recentBlocks[i + 1].timestamp;
          times.push(diff);
        }
        averageBlockTime = times.reduce((a, b) => a + b, 0) / times.length / 1000;
      }

      res.json({
        success: true,
        data: {
          blockchain: {
            chain: blockchainInfo.chain,
            blocks: blockchainInfo.blocks,
            headers: blockchainInfo.headers,
            difficulty: blockchainInfo.difficulty,
            verificationProgress: blockchainInfo.verificationprogress,
            averageBlockTime: Math.round(averageBlockTime)
          },
          database: {
            totalBlocks,
            totalTransactions,
            totalAssets,
            totalAddresses,
            fungibleAssets,
            nonFungibleAssets
          },
          syncStatus: {
            isSyncing: blockchainInfo.blocks < blockchainInfo.headers,
            blocksRemaining: blockchainInfo.headers - blockchainInfo.blocks
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now(),
          dataSource: 'mixed'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
