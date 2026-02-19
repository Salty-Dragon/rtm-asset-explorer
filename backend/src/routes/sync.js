import express from 'express';
import SyncState from '../models/SyncState.js';
import FutureOutput from '../models/FutureOutput.js';
import blockchainService from '../services/blockchain.js';
import assetProcessor from '../services/assetProcessor.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/sync/status - Get sync status
 */
router.get('/status', 
  cacheMiddleware(10), // Cache for 10 seconds
  async (req, res, next) => {
    try {
      const syncState = await SyncState.findOne({ service: 'blocks' });
      const blockchainInfo = await blockchainService.getBlockchainInfo();
      
      const currentBlock = syncState?.currentBlock || 0;
      const targetBlock = blockchainInfo.blocks;
      const behindBlocks = targetBlock - currentBlock;
      const progress = targetBlock > 0 ? (currentBlock / targetBlock) * 100 : 0;
      const isSynced = behindBlocks <= 5;
      
      res.json({
        success: true,
        data: {
          status: syncState?.status || 'not_started',
          currentBlock,
          targetBlock,
          behindBlocks,
          progress: progress.toFixed(2) + '%',
          isSynced,
          lastSync: syncState?.lastSyncedAt,
          averageBlockTime: syncState?.averageBlockTime,
          estimatedCompletion: syncState?.estimatedCompletion,
          blocksProcessed: syncState?.blocksProcessed || 0,
          itemsProcessed: syncState?.itemsProcessed || 0
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now()
        }
      });
    } catch (error) {
      logger.error('Error getting sync status:', error);
      next(error);
    }
});

/**
 * GET /api/sync/stats - Get sync statistics
 */
router.get('/stats',
  cacheMiddleware(30),
  async (req, res, next) => {
    try {
      const syncState = await SyncState.find();
      
      res.json({
        success: true,
        data: {
          services: syncState,
          totalBlocks: syncState.find(s => s.service === 'blocks')?.blocksProcessed || 0,
          totalItems: syncState.reduce((sum, s) => sum + (s.itemsProcessed || 0), 0)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now()
        }
      });
    } catch (error) {
      logger.error('Error getting sync stats:', error);
      next(error);
    }
});

/**
 * GET /api/sync/futures/locked - Get locked future outputs
 */
router.get('/futures/locked',
  cacheMiddleware(30),
  async (req, res, next) => {
    try {
      const { address, asset, type } = req.query;
      
      const query = { status: 'locked' };
      if (address) query.recipient = address;
      if (asset) query.assetId = asset;
      if (type) query.type = type;
      
      const futures = await FutureOutput.find(query)
        .sort({ createdHeight: -1 })
        .limit(100);
      
      res.json({
        success: true,
        data: {
          futures,
          count: futures.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now()
        }
      });
    } catch (error) {
      logger.error('Error getting locked futures:', error);
      next(error);
    }
});

/**
 * GET /api/sync/futures/:txid/:vout - Get specific future output
 */
router.get('/futures/:txid/:vout',
  cacheMiddleware(60),
  async (req, res, next) => {
    try {
      const { txid, vout } = req.params;
      
      const future = await FutureOutput.findOne({
        txid,
        vout: parseInt(vout)
      });
      
      if (!future) {
        return res.status(404).json({
          success: false,
          error: 'Future output not found'
        });
      }
      
      res.json({
        success: true,
        data: future,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now()
        }
      });
    } catch (error) {
      logger.error('Error getting future output:', error);
      next(error);
    }
});

/**
 * GET /api/sync/futures/address/:address - Get futures for address
 */
router.get('/futures/address/:address',
  cacheMiddleware(30),
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { status = 'locked' } = req.query;
      
      const query = { recipient: address };
      if (status) query.status = status;
      
      const futures = await FutureOutput.find(query)
        .sort({ createdHeight: -1 })
        .limit(100);
      
      res.json({
        success: true,
        data: {
          address,
          futures,
          count: futures.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || 'req_' + Date.now()
        }
      });
    } catch (error) {
      logger.error('Error getting futures for address:', error);
      next(error);
    }
});

/**
 * POST /api/sync/test-transaction - Manually test transaction processing
 */
router.post('/test-transaction',
  async (req, res, next) => {
    try {
      const { txid } = req.body;
      
      if (!txid) {
        return res.status(400).json({
          success: false,
          error: { message: 'txid is required' }
        });
      }
      
      logger.info(`Manual transaction test requested for ${txid}`);
      
      // Fetch transaction from blockchain
      const tx = await blockchainService.getRawTransaction(txid, true);
      
      if (!tx) {
        return res.status(404).json({
          success: false,
          error: { message: 'Transaction not found on blockchain' }
        });
      }
      
      // Check if transaction is confirmed (has blockhash)
      if (!tx.blockhash) {
        return res.status(400).json({
          success: false,
          error: { message: 'Transaction is not yet confirmed (in mempool)' }
        });
      }
      
      // Get block info
      const blockHash = tx.blockhash;
      const block = await blockchainService.getBlock(blockHash, 1);
      const blockHeight = block.height;
      const blockTime = new Date(block.time * 1000);
      
      logger.info(`Processing transaction ${txid} from block ${blockHeight}`);
      
      // Process the transaction
      const result = await assetProcessor.handleAssetTransfer(tx, blockHeight, blockTime, blockHash);
      
      res.json({
        success: true,
        data: {
          txid,
          blockHeight,
          blockTime,
          result
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
