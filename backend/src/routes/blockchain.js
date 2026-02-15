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
      
      // Fetch additional network and mining info with complete fallbacks
      let networkInfo = { connections: 0, version: 0, protocolversion: 0 };
      try {
        const netInfo = await blockchainService.getNetworkInfo();
        if (netInfo) {
          networkInfo = netInfo;
        }
      } catch (error) {
        console.warn('Failed to get network info:', error.message);
      }
      
      let miningInfo = { networkhashps: 0 };
      try {
        const minInfo = await blockchainService.getMiningInfo();
        if (minInfo) {
          miningInfo = minInfo;
        }
      } catch (error) {
        console.warn('Failed to get mining info:', error.message);
      }

      // Get last block time - use median time as fallback (0 if unavailable)
      let lastBlockTime = info.mediantime || 0;
      try {
        const lastBlock = await blockchainService.getBlock(info.bestblockhash, 1);
        if (lastBlock && lastBlock.time) {
          lastBlockTime = lastBlock.time;
        }
      } catch (error) {
        console.warn('Failed to get last block time:', error.message);
      }

      res.json({
        success: true,
        data: {
          blockHeight: info.blocks || 0,
          blockHash: info.bestblockhash || '',
          difficulty: info.difficulty || 0,
          chainWork: info.chainwork || '',
          syncProgress: (info.verificationprogress || 0) * 100,
          networkHashRate: miningInfo.networkhashps || 0,
          connections: networkInfo.connections || 0,
          lastBlockTime: lastBlockTime,
          version: networkInfo.version ? String(networkInfo.version) : '0',
          protocolVersion: networkInfo.protocolversion || 0,
          syncedAt: new Date().toISOString()
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
